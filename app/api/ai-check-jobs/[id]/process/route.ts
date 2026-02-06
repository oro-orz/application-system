import { NextResponse } from "next/server";
import { processJobChunk } from "@/lib/aiCheckJob";

/** 指定ジョブを1チャンク進める */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await processJobChunk(id);
    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, done: result.done });
  } catch (err) {
    console.error("ai-check-jobs process error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
