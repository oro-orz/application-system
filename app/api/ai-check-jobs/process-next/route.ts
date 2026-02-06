import { NextResponse } from "next/server";
import { processNextJobChunk } from "@/lib/aiCheckJob";

/** キューから1ジョブを1チャンク処理（cron やバックグラウンドから呼ぶ） */
export async function POST() {
  try {
    const result = await processNextJobChunk();
    return NextResponse.json({ success: true, processed: result.processed, jobId: result.jobId });
  } catch (err) {
    console.error("ai-check-jobs process-next error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
