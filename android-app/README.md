# MotoNav for Android

This folder wraps the web app in `../motonav` as an Android app with Capacitor. The APK is built by GitHub Actions (`.github/workflows/android-apk.yml`), so no Android tools are needed on your own machine.

## Get the APK

1. Open the repository on GitHub, then Releases, then the release named `motonav-latest`.
2. Download `MotoNav-<version>.apk` on the phone.
3. Open it. Android asks to allow installs from the browser or file manager: allow it for this one install.
4. Open MotoNav, allow location when asked.

Each push to the branch rebuilds the APK and replaces that release. The Actions tab also keeps the file as a build artifact.

## Updating and the signing key

The workflow signs the APK with a key. With no key stored in the repository secrets it makes a new one on every build, and Android refuses to update an app signed with a different key. In that case uninstall the old MotoNav before installing a newer APK (routes stored in the app are lost, so use Backup and restore first).

To keep one key: make a keystore on your computer (`keytool -genkeypair -keystore motonav.keystore -alias motonav -keyalg RSA -keysize 2048 -validity 10000`), then add three repository secrets: `ANDROID_KEYSTORE_BASE64` (the file, base64), `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_ALIAS`. Keep the keystore and its password safe; do not commit them.

## Build it yourself

Needs JDK 21, Node 20 and the Android SDK (platform 35, build-tools 35).

```bash
cd android-app
npm ci
npm run sync          # copies ../motonav into www/ and updates the Android project
cd android && ./gradlew assembleRelease
```

The icons and splash screens come from `scripts/make-icons.js`.

## What the APK does not do

It is the same app as the web version, in a native shell. Background location and notification check-ins are not built. Voice input depends on the phone's WebView and is probably unavailable. The routing server address is in Settings and starts as a public demo server meant for testing.
