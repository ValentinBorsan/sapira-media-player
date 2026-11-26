import { useEffect, useRef } from 'react';

interface AmbilightCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  isPlaying: boolean;
}

/**
 * Low-overhead GPU Cinema Ambilight:
 * Samples the active <video> frame onto a tiny 64×36 canvas at ~18 fps
 * and lets CSS hardware blur diffuse the edge colors into the letterbox bars.
 */
export function AmbilightCanvas({ videoRef, active, isPlaying }: AmbilightCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    canvas.width = 64;
    canvas.height = 36;

    let rafId = 0;
    let lastDraw = 0;

    const sample = (now: number) => {
      if (now - lastDraw >= 55) {
        lastDraw = now;
        const v = videoRef.current;
        if (v && v.readyState >= 2 && v.videoWidth > 0) {
          try {
            ctx.drawImage(v, 0, 0, 64, 36);
          } catch {
            // Ignore cross-origin tainted video frames
          }
        }
      }
      if (isPlaying) {
        rafId = requestAnimationFrame(sample);
      }
    };

    // Draw initial frame immediately (even if paused), then loop while playing
    sample(performance.now());
    if (isPlaying) {
      rafId = requestAnimationFrame(sample);
    }

    return () => cancelAnimationFrame(rafId);
  }, [videoRef, active, isPlaying]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="ambilight-canvas" aria-hidden="true" />;
}
