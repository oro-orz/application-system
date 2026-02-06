"use client";

import { useState, useEffect, useCallback } from "react";
import { SimpleShell } from "@/components/layout/SimpleShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMonthOptions, formatMonthYear } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faRotateRight, faCircleCheck, faCircleXmark, faClock, faTrash } from "@fortawesome/free-solid-svg-icons";

type JobStatus = "queued" | "running" | "completed" | "failed";

interface Job {
  id: string;
  month: string;
  status: JobStatus;
  total: number;
  offset: number;
  processed: number;
  failed_count: number;
  errors: { applicationId?: string; employeeName?: string; message: string }[];
  overwrite: boolean;
  created_at: string;
  completed_at: string | null;
}

const POLL_MS = 2000;
const PROCESS_MS = 500;

export default function AICheckJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const monthOptions = getMonthOptions(24);
  const [selectedMonth, setSelectedMonth] = useState(() => monthOptions[0]?.value ?? "");
  const [overwrite, setOverwrite] = useState(false);
  const [starting, setStarting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-check-jobs?limit=30");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setJobs(data.data as Job[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const hasActiveJob = jobs.some((j) => j.status === "queued" || j.status === "running");

  useEffect(() => {
    if (!hasActiveJob) return;
    const t = setInterval(fetchJobs, POLL_MS);
    return () => clearInterval(t);
  }, [hasActiveJob, fetchJobs]);

  const runProcessChunk = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/ai-check-jobs/${jobId}/process`, { method: "POST" });
    const data = await res.json();
    return data.success && data.done;
  }, []);

  const driveJob = useCallback(
    async (jobId: string) => {
      setProcessingId(jobId);
      try {
        for (;;) {
          const done = await runProcessChunk(jobId);
          await fetchJobs();
          if (done) break;
          await new Promise((r) => setTimeout(r, PROCESS_MS));
        }
      } finally {
        setProcessingId(null);
      }
    },
    [runProcessChunk, fetchJobs]
  );

  const handleStart = async () => {
    if (!selectedMonth || starting) return;
    setStarting(true);
    try {
      const res = await fetch("/api/ai-check-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, overwrite }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message ?? "ジョブの作成に失敗しました");
        return;
      }
      await fetchJobs();
      const id = data.data?.id;
      if (id) driveJob(id);
    } finally {
      setStarting(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("この実行履歴を削除しますか？")) return;
    setDeletingId(jobId);
    try {
      const res = await fetch(`/api/ai-check-jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchJobs();
      } else {
        alert(data.message ?? "削除に失敗しました");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleRerun = async (month: string, withOverwrite: boolean) => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch("/api/ai-check-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, overwrite: withOverwrite }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message ?? "ジョブの作成に失敗しました");
        return;
      }
      await fetchJobs();
      const id = data.data?.id;
      if (id) driveJob(id);
    } finally {
      setStarting(false);
    }
  };

  const statusLabel = (s: JobStatus) => {
    switch (s) {
      case "queued":
        return { text: "待機中", icon: faClock, className: "text-amber-600" };
      case "running":
        return { text: "実行中", icon: faClock, className: "text-blue-600" };
      case "completed":
        return { text: "完了", icon: faCircleCheck, className: "text-green-600" };
      case "failed":
        return { text: "失敗", icon: faCircleXmark, className: "text-red-600" };
      default:
        return { text: s, icon: faClock, className: "" };
    }
  };

  return (
    <SimpleShell title="AIチェック実行進捗">
      <div className="p-6 max-w-3xl space-y-6">
        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-body-lg font-semibold text-foreground">新規実行</h2>
          <p className="text-caption text-muted-foreground">
            対象月を選んで実行します。実行済みの申請はスキップされます（「上書きして再実行」のときは除く）。ブラウザを閉じてもサーバー側で進捗するように設計されています。
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-body text-muted-foreground">対象月</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="月を選択" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-body cursor-pointer">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="rounded border-input"
              />
              <span>上書きして再実行（既存結果を無視）</span>
            </label>
            <Button
              type="button"
              onClick={handleStart}
              disabled={starting || !selectedMonth}
              className="rounded-xl gap-2"
            >
              <FontAwesomeIcon icon={faPlay} />
              {starting ? "開始中…" : "実行"}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-body-lg font-semibold text-foreground">実行履歴・進捗</h2>
          {loading ? (
            <p className="text-body text-muted-foreground">読み込み中…</p>
          ) : jobs.length === 0 ? (
            <p className="text-body text-muted-foreground">まだジョブはありません。</p>
          ) : (
            <ul className="space-y-4">
              {jobs.map((job) => {
                const sl = statusLabel(job.status);
                const current = job.processed + job.failed_count;
                const total = job.total || 1;
                const pct = total > 0 ? Math.round((current / total) * 100) : 0;
                return (
                  <li
                    key={job.id}
                    className="rounded-xl border border-border bg-muted/30 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={sl.icon} className={sl.className} />
                        <span className="font-medium text-foreground">
                          {formatMonthYear(job.month)}
                        </span>
                        <span className={`text-caption ${sl.className}`}>{sl.text}</span>
                        {job.overwrite && (
                          <span className="text-caption text-amber-600">（上書き）</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(job.status === "queued" || job.status === "running") &&
                          processingId !== job.id && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => driveJob(job.id)}
                            >
                              進める
                            </Button>
                          )}
                        {(job.status === "completed" || job.status === "failed") && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg gap-1"
                            onClick={() => handleRerun(job.month, false)}
                            disabled={starting}
                          >
                            <FontAwesomeIcon icon={faRotateRight} />
                            再実行（スキップ）
                          </Button>
                        )}
                        {(job.status === "completed" || job.status === "failed") && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg gap-1"
                            onClick={() => handleRerun(job.month, true)}
                            disabled={starting}
                          >
                            <FontAwesomeIcon icon={faRotateRight} />
                            再実行（上書き）
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(job.id)}
                          disabled={deletingId === job.id || starting}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          削除
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-caption text-muted-foreground">
                        <span>
                          {current} / {job.total} 件
                        </span>
                        <span>成功 {job.processed}、失敗 {job.failed_count}</span>
                      </div>
                      <div
                        className="h-2 rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuenow={current}
                        aria-valuemin={0}
                        aria-valuemax={job.total || 1}
                      >
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {job.completed_at && (
                      <p className="text-caption text-muted-foreground">
                        完了: {new Date(job.completed_at).toLocaleString("ja-JP")}
                      </p>
                    )}
                    {Array.isArray(job.errors) && job.errors.length > 0 && (
                      <details className="text-caption">
                        <summary className="cursor-pointer text-amber-700 font-medium">
                          エラー {job.errors.length} 件
                        </summary>
                        <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
                          {(job.errors as { applicationId?: string; employeeName?: string; message: string }[]).map((e, i) => (
                            <li key={i}>
                              {e.employeeName ?? e.applicationId ?? "—"}: {e.message}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-caption text-muted-foreground">
          バックグラウンドで進めるには、cron などで POST
          /api/ai-check-jobs/process-next を定期的に呼んでください。キューにあるジョブが1チャンクずつ進みます。
        </p>
      </div>
    </SimpleShell>
  );
}
