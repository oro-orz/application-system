import { NextRequest, NextResponse } from "next/server";
import { getApplications } from "@/lib/gasApi";
import { checkReceipt, fetchReceiptAsBase64 } from "@/lib/aiChecker";
import { getServerSupabase } from "@/lib/supabase";
import type { Application } from "@/lib/types";

const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 1件の申請に対してAIチェックを実行しDBに保存する */
async function runOne(
  app: Application
): Promise<{ success: true } | { success: false; message: string }> {
  if (!app.receiptUrl?.trim()) {
    return { success: false, message: "領収書URLなし" };
  }
  if (app.tool == null || !app.targetMonth) {
    return { success: false, message: "ツールまたは対象月なし" };
  }

  try {
    const { base64, mimeType } = await fetchReceiptAsBase64(app.receiptUrl);
    const result = await checkReceipt(
      base64,
      {
        tool: String(app.tool),
        amount: Number(app.amount),
        targetMonth: String(app.targetMonth),
        purpose: app.purpose != null ? String(app.purpose) : "",
      },
      { mimeType }
    );

    const supabase = getServerSupabase();
    await supabase.from("ai_check_results").upsert(
      {
        application_id: app.applicationId,
        result: result as unknown as Record<string, unknown>,
      },
      { onConflict: "application_id" }
    );
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, message };
  }
}

/** 1リクエストあたりの最大件数（タイムアウト対策で分割処理） */
const DEFAULT_CHUNK_SIZE = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const month = typeof body.month === "string" ? body.month.trim() : "";
    const limit = Math.min(
      Math.max(1, Number(body.limit) || DEFAULT_CHUNK_SIZE),
      50
    );
    const offset = Math.max(0, Number(body.offset) || 0);

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, message: "body に month（YYYY-MM）を指定してください" },
        { status: 400 }
      );
    }

    const allApplications: Application[] = await getApplications(month);
    if (allApplications.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
        errors: [],
        nextOffset: null,
        message: `${month} の申請は0件でした`,
      });
    }

    const applications = allApplications.slice(offset, offset + limit);
    const errors: { applicationId: string; employeeName?: string; message: string }[] = [];
    let processed = 0;

    for (let i = 0; i < applications.length; i++) {
      if (i > 0) await sleep(DELAY_MS);

      const app = applications[i];
      const one = await runOne(app);
      if (one.success) {
        processed++;
      } else {
        errors.push({
          applicationId: app.applicationId,
          employeeName: app.employeeName,
          message: one.message,
        });
      }
    }

    const nextOffset =
      offset + limit < allApplications.length ? offset + limit : null;

    return NextResponse.json({
      success: true,
      total: allApplications.length,
      processed,
      failed: errors.length,
      errors,
      nextOffset,
      message:
        nextOffset == null
          ? `${month} を一括チェックしました。成功 ${processed} 件、失敗 ${errors.length} 件`
          : `${month} の ${offset + 1}〜${offset + applications.length} 件目を処理しました（残りあり）`,
    });
  } catch (err) {
    console.error("AI check bulk error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
