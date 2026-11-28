# Microsoft Store Publishing Guide — Sapira Media Player

**Sapira Media Player** este configurat pentru publicare în **Microsoft Store** (Windows 10 / 11 Desktop Bridge `.appx` / MSIX), unde Microsoft semnează automat pachetul cu certificatul oficial de Store la certificare (**zero alerte SmartScreen**).

---

## 1. Rezervarea numelui în Microsoft Partner Center

1. Deschide [Microsoft Partner Center → Apps and games](https://partner.microsoft.com/dashboard).
2. Click **New product → MSIX or PWA app** și rezervă numele **`Sapira Media Player`**.
3. Mergi la **Product management → Product Identity** și copiază cele 3 valori exacte generate de Microsoft:
   - `Package/Identity/Name` (ex. `ValentinBorsan.SapiraMediaPlayer` sau `12345Valentin.SapiraMediaPlayer`)
   - `Package/Identity/Publisher` (ex. `CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)
   - `Package/Properties/PublisherDisplayName` (numele tău / al publisher-ului din Partner Center)

---

## 2. Configurarea build-ului (GitHub Secrets sau local)

### Opțiunea A — Automat în GitHub Actions (Recomandat)
Adaugă cele 3 valori în **GitHub Repo → Settings → Secrets and variables → Actions**:
- `MS_STORE_IDENTITY_NAME` = `Package/Identity/Name`
- `MS_STORE_PUBLISHER` = `CN=...`
- `MS_STORE_PUBLISHER_DISPLAY_NAME` = `PublisherDisplayName`

Apoi rulează workflow-ul `.github/workflows/release.yml` (manual din **Actions → Run workflow** sau prin tag `v*`). Job-ul `package-windows` va genera automat fișierul gata de upload:
`Sapira Media Player-<version>-x64.appx` (sau îl poți descărca din artefactul `sapira-windows-latest`).

### Opțiunea B — AppVeyor

Proiectul AppVeyor citește [`appveyor.yml`](./appveyor.yml) din rădăcina depozitului și construiește pachetul pe Windows cu Node.js 22.

1. În **AppVeyor → Settings → Environment**, adaugă `MS_STORE_IDENTITY_NAME`, `MS_STORE_PUBLISHER` și `MS_STORE_PUBLISHER_DISPLAY_NAME` cu valorile exacte din **Product identity**. Sunt valori din manifestul pachetului. Nu introduce parole sau certificate.
2. După ce fișierul `appveyor.yml` ajunge pe ramura `main`, pornește **New build** pentru acea ramură. Dacă proiectul a fost configurat să ignore YAML-ul din depozit, dezactivează acea opțiune.
3. Descarcă fișierul `.appx` din fila **Artifacts** a buildului reușit și încarcă-l în Partner Center.

### Opțiunea C — Local pe un PC cu Windows 10/11
Actualizează temporar sau direct în [`electron-builder.json`](./electron-builder.json) secțiunea `"appx"` cu valorile din Partner Center și rulează:

```powershell
npm run dist:msstore
```

*(Pachetul `.appx` pentru Microsoft Store **nu trebuie semnat manual** cu certificat EV — Microsoft îl resignează automat cu certificatul de încredere Microsoft Store în timpul certificării.)*

---

## 3. Asset-uri & Formularul de Certificare Partner Center

Asset-urile vizuale necesare Store-ului sunt deja generate în [`build/appx/`](./build/appx/):
- `StoreLogo.png` (50×50)
- `Square44x44Logo.png` (44×44)
- `Square150x150Logo.png` (150×150)
- `SmallTile.png` (71×71)
- `LargeTile.png` (310×310)
- `Wide310x150Logo.png` (310×150)

La completarea formularului de trimitere în **Partner Center**:
1. **Privacy Policy URL**: `https://sapiraplayer.pages.dev/privacy.html`
2. **Category**: `Multimedia design` / `Entertainment` → **Video & Audio Players**
3. **Restricted Capability (`runFullTrust`) Justification** *(câmp obligatoriu pentru Electron Desktop Bridge)*:
   > *"Sapira Media Player is a desktop Electron audio and 4K video player that launches with Windows.FullTrustApplication to access user-selected local media folders, read sidecar subtitle/lyrics files (.srt, .vtt, .lrc), and optionally invoke user-installed FFmpeg/yt-dlp utilities when requested by the user."*
4. **System Requirements / Data Collection**: Nu colectează date personale, fără telemetrie sau reclame (bifează **No personal data collected** în Age Rating & Privacy).
5. **Screenshots**: Folosește capturi 1920×1080 din aplicație și imaginea din `landing/og-banner.png`.
