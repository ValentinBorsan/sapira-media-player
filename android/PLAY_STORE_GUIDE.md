# Sapira Media Player — Google Play Console Guide (`org.sapira.mediaplayer`)

Acest folder conține aplicația nativă **Android** pentru **Sapira Media Player** (Kotlin + Jetpack Compose + AndroidX Media3 ExoPlayer), pregătită conform cerințelor Google Play Store (`targetSdk = 36`, Edge-to-Edge, permisiuni granulare media, `MediaSessionService` pentru redare cu ecranul oprit).

---

## 1. Generarea cheii de semnare (Upload Keystore)

Rulează o singură dată din folderul `android/` (folosind `keytool` din Android Studio):

```bash
"/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
  -genkeypair -v \
  -keystore sapira-upload-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias sapira
```

Creează apoi fișierul `android/keystore.properties` (deja ignorat în `.gitignore`, nu se urcă niciodată pe GitHub):

```properties
storeFile=sapira-upload-key.jks
storePassword=PAROLA_TA_KEYSTORE
keyAlias=sapira
keyPassword=PAROLA_TA_KEY
```

---

## 2. Cele două ediții Android (`play` vs `full`)

Proiectul are două *product flavors* separate pentru a respecta 100% politicile Google Play, oferind în același timp suport complet nativ YouTube în varianta APK directă:

- **`play` (`org.sapira.mediaplayer`)** — *Ediția Google Play Store*:
  - Redă linkurile YouTube prin playerul oficial încorporat YouTube IFrame (fără extracție terță, conform termenilor Google Play).
- **`full` (`org.sapira.mediaplayer.full` — „Sapira Full”)** — *Ediția GitHub / Cloudflare R2 (APK direct)*:
  - Extrage nativ fluxurile YouTube prin **NewPipeExtractor** și le redă direct în **Media3 ExoPlayer** (până la **1080p H.264 + AAC** combinat prin `MergingMediaSource`, mod **Doar Audio** cu ecranul oprit, Lock Screen, Equalizer și **Share → Sapira** direct din aplicația YouTube).
  - Datorită sufixului `.full`, poți avea ambele ediții instalate simultan pe telefon.

Din folderul `android/`:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assemblePlayDebug assembleFullDebug bundlePlayRelease assembleFullRelease
```

Artefactele generate se află mai jos (fără un upload keystore configurat în `keystore.properties`, pachetele `release` sunt nesemnate; verifică semnătura cu `jarsigner -verify app/build/outputs/bundle/playRelease/app-play-release.aab` înainte de încărcarea în Google Play Console):
- **Google Play Console (`.aab`)**: `android/app/build/outputs/bundle/playRelease/app-play-release.aab`
- **APK cu YouTube nativ (`full`, gata de instalat pe telefon)**: `android/app/build/outputs/apk/full/debug/app-full-debug.apk` (sau `full/release/app-full-release.apk` cu keystore configurat)
- **APK ediția Google Play (`play`)**: `android/app/build/outputs/apk/play/debug/app-play-debug.apk`

---

## 3. Completarea secțiunilor obligatorii în Google Play Console

1. **App Content → Privacy Policy**:
   - Folosește URL-ul paginii `landing/privacy.html` publicate (sau `https://github.com/ValentinBorsan/sapira-media-player/blob/main/PRIVACY.md`).
2. **App Content → Data Safety**:
   - *Does your app collect or share any of the required user data types?* → **No** (Sapira nu are analytics, reclame, conturi sau telemetrie).
3. **App Content → Foreground Service Permissions (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`)**:
   - *Use case*: Media playback (audio & video player continuing playback when user locks the screen or switches apps, with MediaSession notification controls).
   - Înregistrează un scurt screen-recording de 15–20s pe telefon în care pornești o piesă în Sapira, blochezi sau ieși în Home Screen și arăți notificarea media activă.
4. **App Category**:
   - *Application* → **Music & Audio** sau **Video Players & Editors**.
   - *Ads*: **No, my app does not contain ads**.
