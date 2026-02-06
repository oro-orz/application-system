/**
 * GET /api/auth/me
 * セッションを検証し、ログイン中ならユーザー情報を返す。
 */
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { getSessionCookieName } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      uid: session.uid,
      email: session.email,
      name: session.name,
      tmg_email: session.tmg_email,
      employee_number: session.employee_number,
      department: session.department,
      role: session.role,
    },
  });
}
