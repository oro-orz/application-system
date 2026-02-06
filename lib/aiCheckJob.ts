import { getApplications } from "@/lib/gasApi";
import { checkReceipt, fetchReceiptAsBase64 } from "@/lib/aiChecker";
import { getServerSupabase } from "@/lib/supabase";
import type { Application } from "@/lib/types";

const CHUNK_SIZE = 10;
const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOne(app: Application): Promise<{ success: true } | { success: false; message: string }> {
  if (!app.receiptUrl?.trim()) return { success: false, message: "領収書URLなし" };
  if (app.tool == null || !app.targetMonth) return { success: false, message: "ツールまたは対象月なし" };
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
      { application_id: app.applicationId, result: result as unknown as Record<string, unknown> },
      { onConflict: "application_id" }
    );
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export type JobRow = {
  id: string;
  month: string;
  status: string;
  total: number;
  offset: number;
  processed: number;
  failed_count: number;
  errors: unknown[];
  overwrite: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

/** 1チャンク分だけジョブを進める。完了したら true */
export async function processJobChunk(jobId: string): Promise<{ done: boolean; error?: string }> {
  const supabase = getServerSupabase();
  const { data: job, error: fetchError } = await supabase
    .from("ai_check_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    return { done: false, error: fetchError?.message ?? "Job not found" };
  }

  const row = job as unknown as JobRow;
  if (row.status !== "queued" && row.status !== "running") {
    return { done: row.status === "completed" || row.status === "failed" };
  }

  await supabase
    .from("ai_check_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  const applications: Application[] = await getApplications(row.month);
  if (applications.length === 0) {
    await supabase
      .from("ai_check_jobs")
      .update({
        status: "completed",
        total: 0,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return { done: true };
  }

  const chunk = applications.slice(row.offset, row.offset + CHUNK_SIZE);
  const existingIds = new Set<string>();
  if (!row.overwrite && chunk.length > 0) {
    const { data: existing } = await supabase
      .from("ai_check_results")
      .select("application_id")
      .in("application_id", chunk.map((a) => a.applicationId));
    existing?.forEach((r: { application_id: string }) => existingIds.add(r.application_id));
  }

  let processedDelta = 0;
  let failedDelta = 0;
  const newErrors: { applicationId: string; employeeName?: string; message: string }[] = [];

  for (let i = 0; i < chunk.length; i++) {
    if (i > 0) await sleep(DELAY_MS);
    const app = chunk[i];
    if (!row.overwrite && existingIds.has(app.applicationId)) {
      processedDelta++;
      continue;
    }
    const one = await runOne(app);
    if (one.success) {
      processedDelta++;
    } else {
      failedDelta++;
      newErrors.push({
        applicationId: app.applicationId,
        employeeName: app.employeeName,
        message: one.message,
      });
    }
  }

  const newOffset = row.offset + chunk.length;
  const newProcessed = row.processed + processedDelta;
  const newFailed = row.failed_count + failedDelta;
  const newErrorsList = [...(Array.isArray(row.errors) ? row.errors : []), ...newErrors];
  const isComplete = newOffset >= applications.length;

  await supabase
    .from("ai_check_jobs")
    .update({
      total: applications.length,
      offset: newOffset,
      processed: newProcessed,
      failed_count: newFailed,
      errors: newErrorsList,
      status: isComplete ? "completed" : "running",
      updated_at: new Date().toISOString(),
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq("id", jobId);

  return { done: isComplete };
}

/** キューから1件取り出して1チャンク処理（cron/バックグラウンド用） */
export async function processNextJobChunk(): Promise<{ processed: boolean; jobId?: string }> {
  const supabase = getServerSupabase();
  const { data: jobs } = await supabase
    .from("ai_check_jobs")
    .select("id")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(1);

  const job = jobs?.[0];
  if (!job) return { processed: false };

  await processJobChunk(job.id);
  return { processed: true, jobId: job.id };
}
