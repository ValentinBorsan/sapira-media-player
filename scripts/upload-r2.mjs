#!/usr/bin/env node
import crypto from 'node:crypto';
import dns from 'node:dns';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Force IPv4 first to avoid macOS broken IPv6 route timeouts
dns.setDefaultResultOrder('ipv4first');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '55229ed0b81896f6ff54b824b1d00abb';
const BUCKET = process.env.SAPIRA_R2_BUCKET || 'sapira-releases';
const PUBLIC_DOMAIN = 'https://pub-c9b95716429943f88f4ec4cc39a49efd.r2.dev';
const TEMP_WORKER_NAME = 'sapira-r2-multipart-uploader-tmp';
const PART_SIZE = 20 * 1024 * 1024; // 20 MB per multipart chunk (well under 100 MB Worker body limit)

function resolveAuthToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN;
  }
  const candidates = [
    path.join(os.homedir(), 'Library', 'Preferences', 'cloudflare', 'config', 'default.json'),
    path.join(os.homedir(), '.config', 'cloudflare', 'config', 'default.json'),
    path.join(process.env.APPDATA || '', 'cloudflare', 'config', 'default.json'),
  ];
  for (const cfgPath of candidates) {
    if (cfgPath && fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.oauth_token) return cfg.oauth_token;
    }
  }
  throw new Error('No Cloudflare token found. Run `cf auth login` first.');
}

async function cfApi(token, method, apiPath, body, extraHeaders = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
    body,
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(`${method} ${apiPath} failed (${res.status}): ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

async function deployTempUploaderWorker(token, uploadSecret) {
  // Ensure account workers.dev subdomain exists & get its name
  let subdomain;
  try {
    const subRes = await cfApi(token, 'GET', `/accounts/${ACCOUNT_ID}/workers/subdomain`);
    subdomain = subRes.subdomain;
  } catch {
    const created = await cfApi(
      token,
      'PUT',
      `/accounts/${ACCOUNT_ID}/workers/subdomain`,
      JSON.stringify({ subdomain: `sapira-${ACCOUNT_ID.slice(0, 8)}` }),
      { 'Content-Type': 'application/json' }
    );
    subdomain = created.subdomain;
  }

  const workerCode = `
export default {
  async fetch(request, env) {
    if (request.headers.get("x-upload-secret") !== env.UPLOAD_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const key = url.searchParams.get("key");
    if (!key) return new Response("Missing key", { status: 400 });

    if (action === "start") {
      const contentType = url.searchParams.get("type") || "application/octet-stream";
      const filename = key.split("/").pop();
      const mpu = await env.BUCKET.createMultipartUpload(key, {
        httpMetadata: {
          contentType,
          contentDisposition: 'attachment; filename="' + filename + '"',
        },
      });
      return Response.json({ uploadId: mpu.uploadId });
    }

    if (action === "part") {
      const uploadId = url.searchParams.get("uploadId");
      const partNumber = Number(url.searchParams.get("partNumber"));
      const mpu = env.BUCKET.resumeMultipartUpload(key, uploadId);
      const uploaded = await mpu.uploadPart(partNumber, request.body);
      return Response.json(uploaded);
    }

    if (action === "complete") {
      const uploadId = url.searchParams.get("uploadId");
      const parts = await request.json();
      const mpu = env.BUCKET.resumeMultipartUpload(key, uploadId);
      await mpu.complete(parts);
      return Response.json({ ok: true });
    }

    return new Response("Bad action", { status: 400 });
  }
};
`;

  const metadata = {
    main_module: 'worker.js',
    compatibility_date: '2025-01-01',
    bindings: [
      { type: 'r2_bucket', name: 'BUCKET', bucket_name: BUCKET },
      { type: 'plain_text', name: 'UPLOAD_SECRET', text: uploadSecret },
    ],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('worker.js', new Blob([workerCode], { type: 'application/javascript+module' }), 'worker.js');

  await cfApi(token, 'PUT', `/accounts/${ACCOUNT_ID}/workers/scripts/${TEMP_WORKER_NAME}`, form);
  await cfApi(
    token,
    'POST',
    `/accounts/${ACCOUNT_ID}/workers/scripts/${TEMP_WORKER_NAME}/subdomain`,
    JSON.stringify({ enabled: true }),
    { 'Content-Type': 'application/json' }
  );

  return `https://${TEMP_WORKER_NAME}.${subdomain}.workers.dev`;
}

async function deleteTempUploaderWorker(token) {
  try {
    await cfApi(token, 'DELETE', `/accounts/${ACCOUNT_ID}/workers/scripts/${TEMP_WORKER_NAME}`);
  } catch {
    // Ignore cleanup errors
  }
}

async function uploadMultipartFile({ workerUrl, secret, localPath, key, contentType }) {
  const stat = fs.statSync(localPath);
  const totalSize = stat.size;
  const totalParts = Math.ceil(totalSize / PART_SIZE);

  // Wait briefly if DNS/edge route just propagated
  let startRes;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const r = await fetch(
      `${workerUrl}?action=start&key=${encodeURIComponent(key)}&type=${encodeURIComponent(contentType)}`,
      { method: 'POST', headers: { 'x-upload-secret': secret } }
    ).catch(() => null);
    if (r && r.ok) {
      startRes = await r.json();
      break;
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  if (!startRes?.uploadId) {
    throw new Error(`Could not initiate multipart upload for ${key}`);
  }

  const uploadId = startRes.uploadId;
  const fd = fs.openSync(localPath, 'r');
  const uploadedParts = [];

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const offset = (partNumber - 1) * PART_SIZE;
      const chunkLen = Math.min(PART_SIZE, totalSize - offset);
      const buf = Buffer.allocUnsafe(chunkLen);
      fs.readSync(fd, buf, 0, chunkLen, offset);

      let partResult = null;
      for (let retry = 1; retry <= 3; retry++) {
        try {
          const r = await fetch(
            `${workerUrl}?action=part&key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
            {
              method: 'PUT',
              headers: {
                'x-upload-secret': secret,
                'Content-Type': 'application/octet-stream',
              },
              body: buf,
            }
          );
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          partResult = await r.json();
          break;
        } catch (err) {
          if (retry === 3) throw err;
          await new Promise((res) => setTimeout(res, 1200));
        }
      }

      uploadedParts.push(partResult);
      const pct = Math.round((partNumber / totalParts) * 100);
      process.stdout.write(`${pct}% `);
    }
  } finally {
    fs.closeSync(fd);
  }

  const completeRes = await fetch(
    `${workerUrl}?action=complete&key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}`,
    {
      method: 'POST',
      headers: {
        'x-upload-secret': secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadedParts),
    }
  );
  if (!completeRes.ok) {
    throw new Error(`Multipart complete failed: HTTP ${completeRes.status}`);
  }
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const version = pkg.version || '0.1.0';
  const token = resolveAuthToken();
  const oneTimeSecret = crypto.randomBytes(32).toString('hex');

  const files = [
    {
      local: `release/Sapira-Media-Player-${version}-arm64.dmg`,
      key: `v${version}/Sapira-Media-Player-${version}-arm64.dmg`,
      type: 'application/x-apple-diskimage',
    },
    {
      local: `release/Sapira-Media-Player-${version}-x64.dmg`,
      key: `v${version}/Sapira-Media-Player-${version}-x64.dmg`,
      type: 'application/x-apple-diskimage',
    },
    {
      local: `release/Sapira-Media-Player-Setup-${version}-x64.exe`,
      key: `v${version}/Sapira-Media-Player-Setup-${version}-x64.exe`,
      type: 'application/vnd.microsoft.portable-executable',
    },
    {
      local: `release/Sapira-Media-Player-Portable-${version}-x64.exe`,
      key: `v${version}/Sapira-Media-Player-Portable-${version}-x64.exe`,
      type: 'application/vnd.microsoft.portable-executable',
    },
    ...(fs.existsSync('release/SHA256SUMS.txt')
      ? [
          {
            local: 'release/SHA256SUMS.txt',
            key: `v${version}/SHA256SUMS.txt`,
            type: 'text/plain; charset=utf-8',
          },
        ]
      : []),
  ];

  console.log('Provisioning temporary R2 multipart edge uploader...');
  const workerUrl = await deployTempUploaderWorker(token, oneTimeSecret);

  try {
    for (const item of files) {
      if (!fs.existsSync(item.local)) {
        throw new Error(`Missing installer file: ${item.local}`);
      }
      const sizeMb = (fs.statSync(item.local).size / (1024 * 1024)).toFixed(1);
      console.log(`\nUploading ${item.local} (${sizeMb} MB) in 20MB multipart chunks...`);
      await uploadMultipartFile({
        workerUrl,
        secret: oneTimeSecret,
        localPath: item.local,
        key: item.key,
        contentType: item.type,
      });
      console.log(`\n✓ Live: ${PUBLIC_DOMAIN}/${item.key}`);
    }
    console.log('\nAll 4 installers uploaded to Cloudflare R2!');
  } finally {
    console.log('Cleaning up temporary uploader Worker...');
    await deleteTempUploaderWorker(token);
  }
}

main().catch((err) => {
  console.error('\nUpload failed:', err.message || err);
  process.exit(1);
});
