import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

/** ジョブ1件取得 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("ai_check_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !row) {
      return NextResponse.json(
        { success: false, message: error?.message ?? "Not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    console.error("ai-check-jobs get error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** ジョブ1件削除 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServerSupabase();
    const { error } = await supabase.from("ai_check_jobs").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ai-check-jobs delete error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
