#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import dns from 'node:dns';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

dns.setDefaultResultOrder('ipv4first');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '55229ed0b81896f6ff54b824b1d00abb';
const BUCKET = process.env.SAPIRA_R2_BUCKET || 'sapira-releases';
const PUBLIC_R2_DOMAIN = 'https://pub-c9b95716429943f88f4ec4cc39a49efd.r2.dev';
const WORKER_NAME = 'sapira-downloads';
const GITHUB_REPO = 'ValentinBorsan/sapira-media-player';

function resolveAuthToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const cfBin = path.join(os.homedir(), '.npm-global', 'node_modules', '.bin', 'cf');
  if (fs.existsSync(cfBin)) {
    try {
      execFileSync(cfBin, ['r2', 'buckets', 'list'], { stdio: 'ignore', timeout: 8000 });
    } catch {
      // Ignore if offline or sandboxed
    }
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

const WORKER_SOURCE = `
const R2_CDN = "${PUBLIC_R2_DOMAIN}";
const GH_REPO = "${GITHUB_REPO}";
const STATS_KEY = "_stats/downloads.json";
const VALID_VERSION = /^v\\d+\\.\\d+\\.\\d+(-[A-Za-z0-9.]+)?$/;
const VALID_FILE = /^Sapira-Media-Player-[A-Za-z0-9._-]+\\.(dmg|exe|apk|AppImage|deb|rpm|tar\\.gz)$/;
const BOT_UA = /(bot|spider|crawler|slurp|facebookexternalhit|discordbot|whatsapp|telegrambot|preview)/i;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function classifyPlatform(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".dmg") || lower.includes("-mac")) return "mac";
  if (lower.endsWith(".exe") || lower.endsWith(".msi")) return "windows";
  if (lower.endsWith(".apk") || lower.endsWith(".aab")) return "android";
  if (lower.endsWith(".appimage") || lower.endsWith(".deb") || lower.endsWith(".rpm") || lower.endsWith(".tar.gz")) {
    return "linux";
  }
  return "other";
}

async function readR2Counts(bucket) {
  try {
    const obj = await bucket.get(STATS_KEY);
    if (!obj) return { files: {}, updatedAt: null };
    const parsed = await obj.json();
    return {
      files: parsed && typeof parsed.files === "object" ? parsed.files : {},
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { files: {}, updatedAt: null };
  }
}

async function incrementR2Count(bucket, fileName) {
  const current = await readR2Counts(bucket);
  current.files[fileName] = (Number(current.files[fileName]) || 0) + 1;
  current.updatedAt = new Date().toISOString();
  await bucket.put(STATS_KEY, JSON.stringify(current), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

async function fetchGitHubCounts() {
  const cache = caches.default;
  const cacheKey = new Request("https://sapira-internal-cache.local/github-release-counts-v1");
  const cached = await cache.match(cacheKey);
  if (cached) {
    try {
      return await cached.json();
    } catch {
      // Re-fetch below
    }
  }

  const byPlatform = { mac: 0, windows: 0, linux: 0, android: 0 };
  let githubTotal = 0;

  try {
    const res = await fetch(\`https://api.github.com/repos/\${GH_REPO}/releases?per_page=20\`, {
      headers: {
        "User-Agent": "Sapira-Download-Stats-Worker/1.0",
        Accept: "application/vnd.github+json",
      },
    });
    if (res.ok) {
      const releases = await res.json();
      if (Array.isArray(releases)) {
        for (const rel of releases) {
          if (!Array.isArray(rel.assets)) continue;
          for (const asset of rel.assets) {
            const name = String(asset.name || "");
            if (name === "SHA256SUMS.txt") continue;
            const count = Number(asset.download_count) || 0;
            const plat = classifyPlatform(name);
            if (plat in byPlatform) {
              byPlatform[plat] += count;
            }
            githubTotal += count;
          }
        }
      }
      const payload = { byPlatform, githubTotal };
      await cache.put(
        cacheKey,
        new Response(JSON.stringify(payload), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=120",
          },
        })
      );
      return payload;
    }
  } catch {
    // Ignore transient GitHub errors
  }

  return { byPlatform, githubTotal };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // 1. Public aggregate download statistics (zero PII, zero cookies)
    if (url.pathname === "/stats" || url.pathname === "/stats/") {
      const [r2Data, ghData] = await Promise.all([
        readR2Counts(env.BUCKET),
        fetchGitHubCounts(),
      ]);

      const byPlatform = {
        mac: ghData.byPlatform.mac || 0,
        windows: ghData.byPlatform.windows || 0,
        linux: ghData.byPlatform.linux || 0,
        android: ghData.byPlatform.android || 0,
      };

      let r2Total = 0;
      for (const [fileName, rawCount] of Object.entries(r2Data.files)) {
        const count = Number(rawCount) || 0;
        const plat = classifyPlatform(fileName);
        if (plat in byPlatform) {
          byPlatform[plat] += count;
        }
        r2Total += count;
      }

      const total = byPlatform.mac + byPlatform.windows + byPlatform.linux + byPlatform.android;

      return Response.json(
        {
          total,
          byPlatform,
          r2Total,
          githubTotal: ghData.githubTotal,
          updatedAt: r2Data.updatedAt || new Date().toISOString(),
        },
        {
          headers: {
            ...CORS_HEADERS,
            "Cache-Control": "public, max-age=15",
          },
        }
      );
    }

    // 2. Tracked zero-latency CDN redirect: /dl/v0.1.0/<filename>
    const match = /^\\/dl\\/(v[^/]+)\\/([^/]+)$/.exec(url.pathname);
    if (match) {
      const version = decodeURIComponent(match[1]);
      const fileName = decodeURIComponent(match[2]);
      if (!VALID_VERSION.test(version) || !VALID_FILE.test(fileName)) {
        return new Response("Invalid release asset", { status: 400, headers: CORS_HEADERS });
      }

      const ua = request.headers.get("user-agent") || "";
      if (request.method === "GET" && !BOT_UA.test(ua)) {
        ctx.waitUntil(incrementR2Count(env.BUCKET, fileName));
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: \`\${R2_CDN}/\${version}/\${encodeURIComponent(fileName)}\`,
          "Cache-Control": "no-store",
          ...CORS_HEADERS,
        },
      });
    }

    return new Response("Sapira Downloads Gateway", { status: 200, headers: CORS_HEADERS });
  },
};
`;

async function main() {
  const token = resolveAuthToken();
  const subRes = await cfApi(token, 'GET', `/accounts/${ACCOUNT_ID}/workers/subdomain`);
  const subdomain = subRes.subdomain;

  const metadata = {
    main_module: 'worker.js',
    compatibility_date: '2025-01-01',
    bindings: [{ type: 'r2_bucket', name: 'BUCKET', bucket_name: BUCKET }],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append(
    'worker.js',
    new Blob([WORKER_SOURCE], { type: 'application/javascript+module' }),
    'worker.js'
  );

  await cfApi(token, 'PUT', `/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}`, form);
  await cfApi(
    token,
    'POST',
    `/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/subdomain`,
    JSON.stringify({ enabled: true }),
    { 'Content-Type': 'application/json' }
  );

  const workerUrl = `https://${WORKER_NAME}.${subdomain}.workers.dev`;
  console.log(`✓ Deployed Sapira Download Stats Worker: ${workerUrl}`);
  console.log(`  Stats endpoint: ${workerUrl}/stats`);
  console.log(`  Download route: ${workerUrl}/dl/v0.1.0/<filename>`);
}

main().catch((err) => {
  console.error('Failed to deploy download tracker:', err.message || err);
  process.exit(1);
});
