import { NextRequest, NextResponse } from "next/server";
import { getApplications } from "@/lib/gasApi";
import { getServerSupabase } from "@/lib/supabase";

/** ジョブ一覧 */
export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 20));
    const supabase = getServerSupabase();
    const { data: rows, error } = await supabase
      .from("ai_check_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: rows ?? [] });
  } catch (err) {
    console.error("ai-check-jobs list error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** ジョブ作成（対象月を指定） */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const month = typeof body.month === "string" ? body.month.trim() : "";
    const overwrite = Boolean(body.overwrite);

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, message: "body に month（YYYY-MM）を指定してください" },
        { status: 400 }
      );
    }

    const applications = await getApplications(month);
    const total = applications.length;

    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("ai_check_jobs")
      .insert({
        month,
        status: "queued",
        total,
        offset: 0,
        processed: 0,
        failed_count: 0,
        errors: [],
        overwrite,
      })
      .select("id, month, status, total, overwrite, created_at")
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        month: row.month,
        status: row.status,
        total: row.total,
        overwrite: row.overwrite,
        created_at: row.created_at,
      },
    });
  } catch (err) {
    console.error("ai-check-jobs create error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
