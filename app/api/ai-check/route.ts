import { NextRequest, NextResponse } from "next/server";
import { checkReceipt, fetchReceiptAsBase64 } from "@/lib/aiChecker";
import { getServerSupabase } from "@/lib/supabase";
import type { AICheckResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { applicationId, receiptUrl, tool, amount, targetMonth, purpose } =
      body;

    if (!receiptUrl || tool == null || !targetMonth) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const appId = applicationId ? String(applicationId) : null;

    if (appId) {
      try {
        const supabase = getServerSupabase();
        const { data: row } = await supabase
          .from("ai_check_results")
          .select("result")
          .eq("application_id", appId)
          .single();

        if (row?.result) {
          const cached = row.result as AICheckResult;
          return NextResponse.json({
            success: true,
            data: cached,
            cached: true,
          });
        }
      } catch {
        // Supabase 未設定 or 未マイグレーション時はそのまま AI 実行
      }
    }

    const { base64, mimeType } = await fetchReceiptAsBase64(receiptUrl);

    const result = await checkReceipt(
      base64,
      {
        tool: String(tool),
        amount: Number(amount),
        targetMonth: String(targetMonth),
        purpose: purpose != null ? String(purpose) : "",
      },
      { mimeType }
    );

    if (appId) {
      try {
        const supabase = getServerSupabase();
        await supabase.from("ai_check_results").upsert(
          {
            application_id: appId,
            result: result as unknown as Record<string, unknown>,
          },
          { onConflict: "application_id" }
        );
      } catch (e) {
        console.error("AI check result save error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI check API error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
