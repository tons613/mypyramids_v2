import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyDA02ZfAToLHF4uifjw1-WQZi3Stt3geqw",
  authDomain: "pyramids-ng.firebaseapp.com",
  projectId: "pyramids-ng",
  storageBucket: "pyramids-ng.firebasestorage.app",
  messagingSenderId: "470831813097",
  appId: "1:470831813097:web:16cc19ce98c7fb90e7fb78",
};

let app: FirebaseApp;
let auth: Auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    // Firebase's React Native entry exposes this persistence adapter. Require
    // it dynamically so web builds continue using the browser auth provider.
    const { getReactNativePersistence } = require("firebase/auth") as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
    };
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  } catch (error: any) {
    if (error?.code !== "auth/already-initialized") throw error;
    auth = getAuth(app);
  }
}

export { app, auth };
