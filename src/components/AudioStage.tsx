import { useEffect, useRef } from 'react';
import type { AudioMetadata, MediaTrack } from '../types/media';
import { formatFileSize } from '../utils/format';
import { SAPIRA_THEMES, STRINGS, type SapiraLanguage, type SapiraTheme } from '../utils/i18n';
import { PrismLogo } from './PrismLogo';

interface AudioStageProps {
  track: MediaTrack;
  metadata: AudioMetadata;
  isPlaying: boolean;
  analyser: AnalyserNode | null;
  theme: SapiraTheme;
  language: SapiraLanguage;
  showTelemetry: boolean;
  showVisualizer: boolean;
  onTogglePlay: () => void;
}

export function AudioStage({
  track,
  metadata,
  isPlaying,
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

    const dpr = window.devicePixelRatio || 1;
    const size = 460;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const bars = 120;
    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = 122; // aurora starts cleanly beyond the halo ring
    const ringRadius = 108; // generous equal breathing space around the 168px logo
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const smooth = new Float32Array(bars);

    let raf = 0;
    let t = 0;
    let bass = 0;
    let prevBass = 0;
    let sweepP = 1.4; // 0..1 = travelling, >1 = resting
    let sweepPower = 0;
    let shock = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      t += 0.02;

      // Bass energy (low bins) drives the whole composition
      let rawBass = 0;
      if (analyser && data && isPlaying) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < 8; i++) sum += data[i];
        rawBass = sum / (8 * 255);
      } else if (isPlaying) {
        rawBass = 0.25 + 0.12 * Math.sin(t * 2.4);
      }
      bass += (rawBass - bass) * 0.15;

      // Prism sweep synced to the music: a strong beat launches a beam,
      // louder passages make it faster and brighter.
      const beat = isPlaying && bass > 0.3 && bass - prevBass > 0.025;
      if (beat && sweepP >= 1) {
        sweepP = 0;
        sweepPower = Math.min(1, 0.55 + bass);
      }
      if (beat && shock < 0.5) shock = 1;
      shock *= 0.93;
      prevBass = bass;
      if (sweepP < 1.4) sweepP += isPlaying ? 0.012 + bass * 0.05 : 0.02;
      const beamWindow = sweepP < 1 ? Math.sin(Math.PI * Math.min(1, Math.max(0, sweepP))) : 0;

      if (coreRef.current) {
        coreRef.current.style.setProperty('--sweep-p', Math.min(1, sweepP).toFixed(3));
        coreRef.current.style.setProperty('--sweep-o', Math.min(1, beamWindow * sweepPower).toFixed(3));
      }
      // Logo breathes with the beat; glow follows
      if (coreRef.current) {
        const s = isPlaying ? 1 + bass * 0.085 : 1;
        const g = isPlaying ? 16 + bass * 26 : 10;
        coreRef.current.style.transform = `scale(${s.toFixed(4)})`;
        coreRef.current.style.filter = `drop-shadow(0 0 ${g.toFixed(1)}px rgba(125, 211, 252, ${(0.28 + bass * 0.36).toFixed(2)}))`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `scale(${(0.92 + (isPlaying ? bass * 0.16 : 0)).toFixed(3)})`;
        glowRef.current.style.opacity = (isPlaying ? 0.52 + bass * 0.34 : 0.36).toFixed(3);
      }

      if (!showVisualizer) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const themeSpec = SAPIRA_THEMES.find((th) => th.id === theme) ?? SAPIRA_THEMES[0];
      const [c0, c1, c2] = themeSpec.colors;

      // Concentric halo ring: equal gap around the centered brand logo
      const ringGrad = ctx.createLinearGradient(cx - ringRadius, cy, cx + ringRadius, cy);
      ringGrad.addColorStop(0, c0);
      ringGrad.addColorStop(0.5, c1);
      ringGrad.addColorStop(1, c2);
      ctx.save();
      ctx.globalAlpha = isPlaying ? 0.42 + bass * 0.45 : 0.26;
      ctx.shadowColor = 'rgba(125, 211, 252, 0.85)';
      ctx.shadowBlur = isPlaying ? 6 + bass * 12 : 4;
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Aurora corona (balanced amplitude): smooth luminous contour + prism particles
      for (let i = 0; i < bars; i++) {
        const ratio = i / bars;
        const mirror = 1 - Math.abs(ratio * 2 - 1);
        let target = 0.04;
        if (analyser && data && isPlaying) {
          const idx = Math.floor(Math.pow(mirror, 1.3) * data.length * 0.5);
          target = (data[idx] || 0) / 255;
        } else if (isPlaying) {
          target = 0.13 + 0.09 * Math.sin(t * 2 + mirror * 7);
        }
        smooth[i] += (target - smooth[i]) * 0.28;
      }

      const contour: Array<{ x: number; y: number; amp: number; mirror: number; angle: number }> = [];
      for (let i = 0; i < bars; i++) {
        const prev = smooth[(i - 1 + bars) % bars];
        const next = smooth[(i + 1) % bars];
        const amp = Math.min(1.0, Math.pow((prev + 2 * smooth[i] + next) / 4, 0.88) * 1.16);
        const ratio = i / bars;
        const angle = ratio * Math.PI * 2 - Math.PI / 2;
        const r = baseRadius + 2 + amp * 46;
        contour.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          amp,
          mirror: 1 - Math.abs(ratio * 2 - 1),
          angle,
        });
      }

      const tracePath = () => {
        const last = contour[contour.length - 1];
        const first = contour[0];
        ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
        for (let i = 0; i < contour.length; i++) {
          const a = contour[i];
          const b = contour[(i + 1) % contour.length];
          ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        ctx.closePath();
      };

      const conic = ctx.createConicGradient(-Math.PI / 2, cx, cy);
      conic.addColorStop(0, c0);
      conic.addColorStop(0.25, c1);
      conic.addColorStop(0.5, c2);
      conic.addColorStop(0.75, c1);
      conic.addColorStop(1, c0);

      // Beat shockwave: restrained ripple expanding outward on strong hits
      if (shock > 0.03) {
        ctx.save();
        ctx.globalAlpha = shock * 0.44;
        ctx.strokeStyle = conic;
        ctx.shadowColor = 'rgba(125, 211, 252, 0.85)';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.1 + shock * 1.4;
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

      // Glowing contour line
      ctx.save();
      ctx.globalAlpha = isPlaying ? 0.56 + bass * 0.38 : 0.22;
      ctx.shadowColor = 'rgba(147, 197, 253, 0.9)';
      ctx.shadowBlur = isPlaying ? 8 + bass * 20 : 4;
      ctx.strokeStyle = conic;
      ctx.lineWidth = 1.85;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      tracePath();
      ctx.stroke();
      ctx.restore();

      // Prism particles drifting gently near the contour
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < contour.length; i += 2) {
        const c = contour[i];
        const drift = c.amp * 15 + 2.5 * Math.sin(t * 1.6 + i * 0.7);
        const px = c.x + Math.cos(c.angle) * drift;
        const py = c.y + Math.sin(c.angle) * drift;
        const radius = 0.85 + c.amp * 2.3;
        ctx.shadowColor = c2;
        ctx.shadowBlur = 5 + c.amp * 8;
        ctx.fillStyle = c1;
        ctx.globalAlpha = isPlaying ? 0.34 + c.amp * 0.6 : 0.18;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();


      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, isPlaying, showVisualizer, theme]);

  const tStr = STRINGS[language];

  const displayTitle = metadata.title || track.name;
  const hasCover = Boolean(metadata.coverDataUrl);

  return (
    <section className="audio-stage" onClick={onTogglePlay}>
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
    </section>
  );
}
