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

## 2. Generarea pachetului `.aab` pentru Google Play Console

Din folderul `android/`:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew bundleRelease assembleRelease
```

Fișierul gata de încărcat în **Google Play Console → Testing / Production → Create new release** se află în:
- `android/app/build/outputs/bundle/release/app-release.aab`
- APK pentru test direct pe telefon: `android/app/build/outputs/apk/debug/app-debug.apk`

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
