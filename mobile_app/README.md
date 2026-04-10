# Worship Team Scheduler Mobile

Flutter scaffold for iOS and Android using the same Firebase backend as the web app.

## What is included

- Google sign-in flow
- Firestore-backed worship schedule stream
- Shared `worshipScheduler/sharedState` document integration
- Starter UI for services and team members

## Before running

1. Install Flutter.
2. From this `mobile_app` folder, run `flutter pub get`.
3. In Firebase Console, add:
   - an Android app
   - an iOS app
4. Download and place:
   - `google-services.json` into `android/app/`
   - `GoogleService-Info.plist` into `ios/Runner/`
5. Replace the placeholder app IDs in `lib/firebase_options.dart`.

## Recommended next commands

```bash
cd mobile_app
flutter create .
flutterfire configure
flutter run
```

If you prefer not to use `flutterfire configure`, keep the scaffold here and manually update `lib/firebase_options.dart` with the native app IDs from Firebase.
