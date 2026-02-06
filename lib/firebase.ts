/**
 * Firebase クライアント初期化（ブラウザのみ）。
 * NEXT_PUBLIC_FIREBASE_* を参照して Google ログインに使用する。
 */
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }
  return { apiKey, authDomain, projectId, appId };
}

/** ブラウザでのみ Firebase App を返す。設定不足・SSR では null */
function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  const config = getFirebaseConfig();
  if (!config) return null;
  const apps = getApps();
  if (apps.length > 0) return apps[0] as FirebaseApp;
  return initializeApp(config);
}

/** ブラウザでのみ Auth を返す。設定不足・SSR・初期化失敗時は null */
export function getFirebaseAuth(): Auth | null {
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    return getAuth(app);
  } catch {
    return null;
  }
}
