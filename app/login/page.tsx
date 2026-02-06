"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AUTH_ERROR_CODES = {
  EMPLOYEE_NOT_FOUND: "EMPLOYEE_NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;

const ERROR_MESSAGES: Record<string, string> = {
  [AUTH_ERROR_CODES.EMPLOYEE_NOT_FOUND]: "登録外のGmailからのログインはできません",
  [AUTH_ERROR_CODES.FORBIDDEN]: "権限がないためログインできません",
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return { user: null };
      })
      .then((data) => {
        if (data?.user) {
          router.replace("/");
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  async function handleGoogleLogin() {
    const auth = getFirebaseAuth();
    if (!auth) {
      setErrorMessage(
        "認証の初期化に失敗しました。.env.local に NEXT_PUBLIC_FIREBASE_API_KEY 等が設定されているか確認し、開発サーバーを再起動してください。"
      );
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      const data = (await res.json()) as { code?: string; message?: string };
      if (res.ok) {
        router.replace("/");
        return;
      }
      if (res.status === 403 && data.code) {
        const msg = ERROR_MESSAGES[data.code] ?? data.message ?? "ログインできませんでした。";
        setErrorMessage(msg);
        return;
      }
      setErrorMessage(data.message ?? "ログインに失敗しました。");
    } catch (e) {
      console.error("[login]", e);
      setErrorMessage("ログイン処理中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <p className="text-[hsl(var(--muted-foreground))]">確認中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">TMG精算 ログイン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div
              className="rounded-md bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] px-3 py-2 text-sm"
              role="alert"
            >
              {errorMessage}
            </div>
          )}
          <Button
            type="button"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? "ログイン中..." : "Google でログイン"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
