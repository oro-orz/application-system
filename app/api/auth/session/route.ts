/**
 * POST /api/auth/session
 * Body: { idToken: string }
 * - トークン検証 → 社員取得 → 許可判定 → 許可時のみセッション Cookie を設定して 200、不許可時は 403 と code を返す。
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { getEmployeeByGoogleEmail } from "@/lib/bigquery-employee";
import { isLoginAllowed } from "@/lib/auth-config";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const AUTH_ERROR_CODES = {
  EMPLOYEE_NOT_FOUND: "EMPLOYEE_NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken =
      typeof body?.idToken === "string" ? body.idToken.trim() : "";
    if (!idToken) {
      return NextResponse.json(
        { code: "INVALID_REQUEST", message: "idToken is required" },
        { status: 400 }
      );
    }

    const decoded = await verifyIdToken(idToken);
    const email = decoded.email ?? "";
    if (!email) {
      return NextResponse.json(
        { code: AUTH_ERROR_CODES.EMPLOYEE_NOT_FOUND, message: "Email not in token" },
        { status: 403 }
      );
    }

    const employee = await getEmployeeByGoogleEmail(email);
    if (!employee) {
      return NextResponse.json(
        {
          code: AUTH_ERROR_CODES.EMPLOYEE_NOT_FOUND,
          message: "登録外のGmailからのログインはできません",
        },
        { status: 403 }
      );
    }

    if (!isLoginAllowed(employee, email)) {
      return NextResponse.json(
        {
          code: AUTH_ERROR_CODES.FORBIDDEN,
          message: "権限がないためログインできません",
        },
        { status: 403 }
      );
    }

    const token = await createSessionToken({
      uid: decoded.uid,
      email,
      name: employee.name,
      tmg_email: employee.tmg_email || undefined,
      employee_number: employee.employee_number || undefined,
      department: employee.department || undefined,
      role: employee.role || undefined,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
    return response;
  } catch (e) {
    const errCast = e as { code?: string };
    if (errCast?.code === "auth/id-token-expired") {
      return NextResponse.json(
        { code: "TOKEN_EXPIRED", message: "Token expired" },
        { status: 401 }
      );
    }
    console.error("[auth/session]", e);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
