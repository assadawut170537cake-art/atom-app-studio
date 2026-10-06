# A.T.O.M. Mobile App

Flutter client for the ATOM / FRIDAY / ULTRON tri-core.

## Build Android APK

Run from this directory:

```powershell
flutter pub get
flutter build apk --release
Copy-Item build\app\outputs\flutter-apk\app-release.apk ..\ATOM-v1.0.apk
```

The Android package ID is `com.atom.atom_app` and the installed app is named
`A.T.O.M.`. The release APK produced from this source is an ATOM-branded
tri-core client that starts on ATOM by default. `FRIDAY-v1.0.apk` in the
parent folder is a separate, older APK and is not produced by this build.
