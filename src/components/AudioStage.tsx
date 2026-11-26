import { memo, useEffect, useRef } from 'react';
import type { AudioMetadata, MediaTrack } from '../types/media';
import { formatFileSize } from '../utils/format';
import { SAPIRA_THEMES, STRINGS, type SapiraLanguage, type SapiraTheme } from '../utils/i18n';
import { PrismLogo } from './PrismLogo';

interface AudioStageProps {
  track: MediaTrack;
  metadata: AudioMetadata;
  isPlaying: boolean;
  lyricsOpen?: boolean;
  analyser: AnalyserNode | null;
  theme: SapiraTheme;
  language: SapiraLanguage;
  showTelemetry: boolean;
  showVisualizer: boolean;
  onTogglePlay: () => void;
}

export const AudioStage = memo(function AudioStage({
  track,
  metadata,
  isPlaying,
  lyricsOpen = false,
  analyser,
  theme,
  language,
  showTelemetry,
  showVisualizer,
  onTogglePlay,
}: AudioStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coreRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 460;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bars = 120;
    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = 122;
    const ringRadius = 108;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const smooth = new Float32Array(bars);
    const contourX = new Float32Array(bars);
    const contourY = new Float32Array(bars);
    const contourAmp = new Float32Array(bars);
    const cosTable = new Float32Array(bars);
    const sinTable = new Float32Array(bars);
    const mirrorTable = new Float32Array(bars);
    const binIdxTable = new Uint16Array(bars);

    const binLen = data ? data.length : 128;
    for (let i = 0; i < bars; i++) {
      const ratio = i / bars;
      const angle = ratio * Math.PI * 2 - Math.PI / 2;
      const mirror = 1 - Math.abs(ratio * 2 - 1);
      cosTable[i] = Math.cos(angle);
      sinTable[i] = Math.sin(angle);
      mirrorTable[i] = mirror;
      binIdxTable[i] = Math.floor(Math.pow(mirror, 1.3) * binLen * 0.5);
    }

    const themeSpec = SAPIRA_THEMES.find((th) => th.id === theme) ?? SAPIRA_THEMES[0];
    const [c0, c1, c2] = themeSpec.colors;

    const ringGrad = ctx.createLinearGradient(cx - ringRadius, cy, cx + ringRadius, cy);
    ringGrad.addColorStop(0, c0);
    ringGrad.addColorStop(0.5, c1);
    ringGrad.addColorStop(1, c2);

    const conic = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    conic.addColorStop(0, c0);
    conic.addColorStop(0.25, c1);
    conic.addColorStop(0.5, c2);
    conic.addColorStop(0.75, c1);
    conic.addColorStop(1, c0);

    let raf = 0;
    let lastFrameTime = 0;
    let t = 0;
    let bass = 0;
    let prevBass = 0;
    let sweepP = 1.4;
    let sweepPower = 0;
    let shock = 0;

    const tracePath = () => {
      const lastIdx = bars - 1;
      ctx.moveTo((contourX[lastIdx] + contourX[0]) * 0.5, (contourY[lastIdx] + contourY[0]) * 0.5);
      for (let i = 0; i < bars; i++) {
        const next = i + 1 === bars ? 0 : i + 1;
        ctx.quadraticCurveTo(
          contourX[i],
          contourY[i],
          (contourX[i] + contourX[next]) * 0.5,
          (contourY[i] + contourY[next]) * 0.5
        );
      }
      ctx.closePath();
    };

    const draw = (now: number) => {
      // Cap visualizer at ~60fps even on 120Hz ProMotion displays for crisp UI headroom
      if (now - lastFrameTime < 15) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = now;

      ctx.clearRect(0, 0, size, size);
      t += 0.02;

      let rawBass = 0;
      if (analyser && data && isPlaying) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < 8; i++) sum += data[i];
        rawBass = sum / (8 * 255);
      } else if (isPlaying) {
        rawBass = 0.25 + 0.12 * Math.sin(t * 2.4);
      }
      bass += (rawBass - bass) * 0.16;

      const beat = isPlaying && bass > 0.3 && bass - prevBass > 0.025;
      if (beat && sweepP >= 1) {
        sweepP = 0;
        sweepPower = Math.min(1, 0.55 + bass);
      }
      if (beat && shock < 0.5) shock = 1;
      shock *= 0.92;
      prevBass = bass;
      if (sweepP < 1.4) sweepP += isPlaying ? 0.014 + bass * 0.05 : 0.025;
      const beamWindow = sweepP < 1 ? Math.sin(Math.PI * Math.min(1, Math.max(0, sweepP))) : 0;

      // Pure GPU-composited transforms & opacity (no per-frame SVG drop-shadow filter invalidation!)
      if (coreRef.current) {
        coreRef.current.style.setProperty('--sweep-p', Math.min(1, sweepP).toFixed(3));
        coreRef.current.style.setProperty('--sweep-o', Math.min(1, beamWindow * sweepPower).toFixed(3));
        const s = isPlaying ? 1 + bass * 0.085 : 1;
        coreRef.current.style.transform = `scale3d(${s.toFixed(4)}, ${s.toFixed(4)}, 1)`;
      }
      if (glowRef.current) {
        const gs = 0.92 + (isPlaying ? bass * 0.18 : 0);
        glowRef.current.style.transform = `scale3d(${gs.toFixed(3)}, ${gs.toFixed(3)}, 1)`;
        glowRef.current.style.opacity = (isPlaying ? 0.52 + bass * 0.38 : 0.36).toFixed(3);
      }

      if (!showVisualizer) {
        if (isPlaying || bass > 0.005) {
          raf = requestAnimationFrame(draw);
        }
        return;
      }

      // Concentric halo ring (layered alpha glow instead of expensive CPU shadowBlur)
      ctx.save();
      ctx.strokeStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.globalAlpha = isPlaying ? 0.14 + bass * 0.22 : 0.08;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.globalAlpha = isPlaying ? 0.46 + bass * 0.44 : 0.26;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      let maxSmooth = 0;
      for (let i = 0; i < bars; i++) {
        let target = 0.04;
        if (analyser && data && isPlaying) {
          target = (data[binIdxTable[i]] || 0) / 255;
        } else if (isPlaying) {
          target = 0.13 + 0.09 * Math.sin(t * 2 + mirrorTable[i] * 7);
        }
        const nextVal = smooth[i] + (target - smooth[i]) * 0.28;
        smooth[i] = nextVal;
        if (nextVal > maxSmooth) maxSmooth = nextVal;
      }

      for (let i = 0; i < bars; i++) {
        const prev = smooth[i === 0 ? bars - 1 : i - 1];
        const next = smooth[i + 1 === bars ? 0 : i + 1];
        const amp = Math.min(1.0, Math.pow((prev + 2 * smooth[i] + next) * 0.25, 0.88) * 1.16);
        const r = baseRadius + 2 + amp * 46;
        contourAmp[i] = amp;
        contourX[i] = cx + cosTable[i] * r;
        contourY[i] = cy + sinTable[i] * r;
      }

      // Beat shockwave
      if (shock > 0.03) {
        ctx.save();
        ctx.strokeStyle = conic;
        ctx.globalAlpha = shock * 0.42;
        ctx.lineWidth = 1.2 + shock * 1.6;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius + (1 - shock) * 82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Soft corona fill between the ring and the contour
      ctx.save();
      ctx.globalAlpha = isPlaying ? 0.16 + bass * 0.34 : 0.06;
      ctx.fillStyle = conic;
      ctx.beginPath();
      tracePath();
      ctx.arc(cx, cy, baseRadius - 2, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.restore();

      // Glowing contour line (dual-pass glow stroke, zero shadowBlur overhead)
      ctx.save();
      ctx.strokeStyle = conic;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      tracePath();
      ctx.globalAlpha = isPlaying ? 0.18 + bass * 0.24 : 0.08;
      ctx.lineWidth = 6.5;
      ctx.stroke();
      ctx.globalAlpha = isPlaying ? 0.62 + bass * 0.36 : 0.24;
      ctx.lineWidth = 1.85;
      ctx.stroke();
      ctx.restore();

      // Prism particles drifting gently near the contour (batched paths, zero shadowBlur)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = c2;
      ctx.globalAlpha = isPlaying ? 0.18 + bass * 0.22 : 0.08;
      ctx.beginPath();
      for (let i = 0; i < bars; i += 2) {
        const amp = contourAmp[i];
        const drift = amp * 15 + 2.5 * Math.sin(t * 1.6 + i * 0.7);
        const px = contourX[i] + cosTable[i] * drift;
        const py = contourY[i] + sinTable[i] * drift;
        const outerR = (0.85 + amp * 2.3) * 2.1;
        ctx.moveTo(px + outerR, py);
        ctx.arc(px, py, outerR, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = c1;
      ctx.globalAlpha = isPlaying ? 0.52 + bass * 0.4 : 0.2;
      ctx.beginPath();
      for (let i = 0; i < bars; i += 2) {
        const amp = contourAmp[i];
        const drift = amp * 15 + 2.5 * Math.sin(t * 1.6 + i * 0.7);
        const px = contourX[i] + cosTable[i] * drift;
        const py = contourY[i] + sinTable[i] * drift;
        const innerR = 0.85 + amp * 2.3;
        ctx.moveTo(px + innerR, py);
        ctx.arc(px, py, innerR, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();

      // Sleep animation loop cleanly once paused decay settles (0% idle CPU/GPU!)
      if (isPlaying || bass > 0.004 || maxSmooth > 0.045 || shock > 0.03 || sweepP < 1.35) {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, isPlaying, showVisualizer, theme]);

  const tStr = STRINGS[language];

  const displayTitle = metadata.title || track.name;
  const hasCover = Boolean(metadata.coverDataUrl);

  return (
    <section className={`audio-stage ${lyricsOpen ? 'lyrics-open' : ''}`} onClick={onTogglePlay}>
      {hasCover && (
        <div
          className="audio-cover-aura"
          style={{ backgroundImage: `url(${metadata.coverDataUrl})` }}
        />
      )}
      {showTelemetry && <div className="hud-grid-bg" />}
      <div ref={glowRef} className="audio-ambient-glow" />

      {showTelemetry && (
        <>
          <div className="hud-corners" aria-hidden="true">
            <span className="hud-corner tl" />
            <span className="hud-corner tr" />
            <span className="hud-corner bl" />
            <span className="hud-corner br" />
          </div>
          <span className="hud-telemetry top-left">
            {isPlaying ? tStr.signalActive : tStr.signalStandby}
          </span>
          <span className="hud-telemetry top-right">{tStr.audioCore}</span>
        </>
      )}

      <div className="audio-hero-column">
        <div className="audio-core-stage">
          <canvas ref={canvasRef} className="audio-visualizer-canvas" />

          <div ref={coreRef} className={`audio-prism-core ${hasCover ? 'has-cover' : ''}`}>
            {hasCover ? (
              <img src={metadata.coverDataUrl} alt={displayTitle} className="audio-disc-cover" />
            ) : (
              <PrismLogo size={168} active={isPlaying} synced />
            )}
          </div>
        </div>

        <div className="audio-meta">
          <h2 className="audio-track-name" title={displayTitle}>
            {displayTitle}
          </h2>
          {(metadata.artist || metadata.album) && (
            <div className="audio-artist-line">
              {metadata.artist && <span className="audio-artist">{metadata.artist}</span>}
              {metadata.artist && metadata.album && <span className="meta-dot">·</span>}
              {metadata.album && <span className="audio-album">{metadata.album}</span>}
              {metadata.year && <span className="audio-year">({metadata.year})</span>}
            </div>
          )}
          <div className="audio-track-details">
            <span className="format-badge">{track.ext}</span>
            <span>AUDIO</span>
            {track.size > 0 && <span>{formatFileSize(track.size)}</span>}
          </div>
        </div>
      </div>
    </section>
  );
});
