/**
 * Firebase Admin SDK 初期化（サーバー専用）。
 * FIREBASE_SERVICE_ACCOUNT_KEY（JSON 文字列）または FIREBASE_SERVICE_ACCOUNT_KEY_PATH（JSON ファイルパス）でトークン検証に使用する。
 * .env では複数行 JSON が切れるため、複数行のキーはファイルで渡すとよい。
 */
import * as admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadServiceAccountJson(): admin.ServiceAccount {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH?.trim();
  if (keyPath) {
    try {
      const absolute = resolve(process.cwd(), keyPath);
      const raw = readFileSync(absolute, "utf-8");
      return JSON.parse(raw) as admin.ServiceAccount;
    } catch (e) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY_PATH could not be read: " +
          (e instanceof Error ? e.message : String(e))
      );
    }
  }
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY_PATH must be set"
    );
  }
  try {
    return JSON.parse(key) as admin.ServiceAccount;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY must be a single-line JSON (minified), or use FIREBASE_SERVICE_ACCOUNT_KEY_PATH to a .json file. Parse error: " +
        msg
    );
  }
}

function getFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }
  const parsed = loadServiceAccountJson();
  const credential = admin.credential.cert(parsed);
  return admin.initializeApp({ credential });
}

/**
 * ID トークンを検証し、デコードされたクレームを返す。
 * @throws トークン無効時
 */
export async function verifyIdToken(
  idToken: string
): Promise<admin.auth.DecodedIdToken> {
  const app = getFirebaseAdmin();
  return app.auth().verifyIdToken(idToken);
}
