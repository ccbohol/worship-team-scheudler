import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          "DefaultFirebaseOptions are not configured for this platform.",
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: "AIzaSyDkpOLVec-hOn8qHJK_pJ_j4B6Ge05HO0w",
    appId: "1:966718570949:web:200784acc1c2fc6b194bac",
    messagingSenderId: "966718570949",
    projectId: "worship-team-scheduler-c7ced",
    authDomain: "worship-team-scheduler-c7ced.firebaseapp.com",
    storageBucket: "worship-team-scheduler-c7ced.firebasestorage.app",
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: "AIzaSyDkpOLVec-hOn8qHJK_pJ_j4B6Ge05HO0w",
    appId: "1:966718570949:android:28fef3069c3d8ef3194bac",
    messagingSenderId: "966718570949",
    projectId: "worship-team-scheduler-c7ced",
    storageBucket: "worship-team-scheduler-c7ced.firebasestorage.app",
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: "AIzaSyDkpOLVec-hOn8qHJK_pJ_j4B6Ge05HO0w",
    appId: "1:966718570949:ios:c5abfb6b447cd192194bac",
    messagingSenderId: "966718570949",
    projectId: "worship-team-scheduler-c7ced",
    storageBucket: "worship-team-scheduler-c7ced.firebasestorage.app",
    iosBundleId: "com.nlcc.worshipTeamScheduler",
  );
}
