"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines, faArchive, faCalendarDays, faWandMagicSparkles, faListCheck } from "@fortawesome/free-solid-svg-icons";
import type { Application } from "@/lib/types";

const navItems = [
  { href: "/", icon: faFileLines, label: "TMG精算" },
  { href: "/ai-check-jobs", icon: faListCheck, label: "AIチェック実行" },
  { href: "/archive", icon: faArchive, label: "アーカイブ" },
  { href: "/leave", icon: faCalendarDays, label: "休暇申請" },
];

export interface SidebarBulkCheckProps {
  targetMonth: string;
  applications: Application[];
  onDone: () => void;
}

interface SidebarProps {
  bulkCheckProps?: SidebarBulkCheckProps | null;
}

export function Sidebar({ bulkCheckProps }: SidebarProps) {
  const [bulkState, setBulkState] = useState<{
    total: number;
    processed: number;
    failed: number;
    message: string;
  } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  const runBulkCheck = async () => {
    if (!bulkCheckProps || bulkCheckProps.applications.length === 0) return;
    setBulkRunning(true);
    setBulkState({ total: 0, processed: 0, failed: 0, message: "開始中…" });
    const chunkSize = 10;
    let offset: number | null = 0;
    let totalProcessed = 0;
    let totalFailed = 0;
    let total = 0;
    try {
      while (offset !== null) {
        const res: Response = await fetch("/api/ai-check-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: bulkCheckProps.targetMonth,
            limit: chunkSize,
            offset,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setBulkState((s) => ({
            ...(s ?? { total: 0, processed: 0, failed: 0, message: "" }),
            message: data.message ?? "エラー",
          }));
          break;
        }
        total = data.total ?? total;
        totalProcessed += data.processed ?? 0;
        totalFailed += data.failed ?? 0;
        setBulkState({
          total,
          processed: totalProcessed,
          failed: totalFailed,
          message:
            data.nextOffset != null
              ? "処理中…"
              : `完了（成功 ${totalProcessed}、失敗 ${totalFailed}）`,
        });
        offset = data.nextOffset ?? null;
      }
      if (offset === null) bulkCheckProps.onDone();
    } catch {
      setBulkState((s) => ({
        ...(s ?? { total: 0, processed: 0, failed: 0, message: "" }),
        message: "リクエストに失敗しました",
      }));
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <aside
      className="w-16 flex-shrink-0 bg-base flex flex-col rounded-r-xl"
      aria-label="メインナビゲーション"
    >
      <div className="p-2 flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-center h-12 w-12 rounded-xl text-base-foreground/80 hover:bg-white/10 hover:text-base-foreground transition-colors"
            title={item.label}
            aria-label={item.label}
          >
            <FontAwesomeIcon icon={item.icon} className="text-lg" />
          </Link>
        ))}
      </div>

      {bulkCheckProps && (
        <div className="p-2 border-t border-base-foreground/10 flex flex-col gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={runBulkCheck}
            disabled={bulkRunning || bulkCheckProps.applications.length === 0}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-base-foreground/80 hover:bg-white/10 hover:text-base-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none min-h-[56px]"
            title={
              bulkCheckProps.applications.length === 0
                ? "申請がありません"
                : "今月を一括AIチェック"
            }
          >
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              className={`text-lg ${bulkRunning ? "animate-pulse" : ""}`}
            />
            <span className="text-[10px] leading-tight font-medium text-center">
              {bulkRunning ? "実行中" : "一括チェック"}
            </span>
          </button>
          {bulkState && (
            <div className="text-[10px] text-base-foreground/70 text-center space-y-1 px-0.5">
              {bulkState.total > 0 && (
                <div className="font-medium">
                  {bulkState.processed + bulkState.failed}/{bulkState.total} 件
                </div>
              )}
              <div
                className="h-1 rounded-full bg-base-foreground/20 overflow-hidden"
                role="progressbar"
                aria-valuenow={bulkState.total ? bulkState.processed + bulkState.failed : 0}
                aria-valuemin={0}
                aria-valuemax={bulkState.total || 1}
              >
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width:
                      bulkState.total > 0
                        ? `${((bulkState.processed + bulkState.failed) / bulkState.total) * 100}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="truncate" title={bulkState.message}>
                {bulkState.message}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
