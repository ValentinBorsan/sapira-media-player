import { FilePlus2, FolderOpen, Globe, ListMusic } from 'lucide-react';
import { STRINGS, type SapiraLanguage } from '../utils/i18n';
import { PrismLogo } from './PrismLogo';

interface EmptyStageProps {
  language: SapiraLanguage;
  showTelemetry: boolean;
  onOpenFiles: () => void;
  onOpenFolder: () => void;
  onOpenStream: () => void;
  onOpenLibrary: () => void;
}

export function EmptyStage({
  language,
  showTelemetry,
  onOpenFiles,
  onOpenFolder,
  onOpenStream,
  onOpenLibrary,
}: EmptyStageProps) {
  const t = STRINGS[language];

  return (
    <section className="empty-stage">
      {showTelemetry && <div className="hud-grid-bg" />}
      <div className="prism-aura" />

      {showTelemetry && (
        <>
          <div className="hud-corners" aria-hidden="true">
            <span className="hud-corner tl" />
            <span className="hud-corner tr" />
            <span className="hud-corner bl" />
            <span className="hud-corner br" />
          </div>
          <span className="hud-telemetry top-left">SAPIRA MEDIA PLAYER // PRISM ENGINE</span>
          <span className="hud-telemetry top-right">{t.telemetryRight}</span>
        </>
      )}

      <div className="empty-card">
        <div className="emblem-chamber">
          <div className="orbital-ring outer" />
          <div className="orbital-ring inner" />
          <div className="empty-emblem">
            <PrismLogo size={130} idle className="emblem-logo-float" />
          </div>
        </div>

        <h1 className="empty-title">Sapira Media Player</h1>
        <p className="empty-subtitle">
          {t.emptySubtitle1}
          <br />
          {t.emptySubtitle2}
        </p>

        <div className="empty-actions" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={onOpenFiles}>
            <FilePlus2 size={16} />
            {t.openMedia}
          </button>
          <button className="btn-ghost" onClick={onOpenFolder}>
            <FolderOpen size={16} />
            {t.openFolder}
          </button>
          <button className="btn-ghost" onClick={onOpenStream}>
            <Globe size={16} />
            {t.openUrl}
          </button>
          <button className="btn-ghost" onClick={onOpenLibrary}>
            <ListMusic size={16} />
            {t.playlists}
          </button>
        </div>

        <div className="empty-hints">
          <span className="hint-item">
            <kbd>Space</kbd> Play
          </span>
          <span className="hint-item">
            <kbd>⌘K</kbd> {t.commandPalette}
          </span>
          <span className="hint-item">
            <kbd>F</kbd> Fullscreen
          </span>
          <span className="hint-item">
            <kbd>,</kbd> {t.settings}
          </span>
          <span className="hint-item">
            <kbd>?</kbd> {t.shortcuts}
          </span>
        </div>
      </div>
    </section>
  );
}
