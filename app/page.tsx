"use client";

import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { LeftPanel } from "@/components/approval/LeftPanel";
import { RightPanel } from "@/components/approval/RightPanel";
import { ApplicationDetail } from "@/components/approval/ApplicationDetail";
import { useApplications } from "@/hooks/useApplications";
import { getCurrentTargetMonth } from "@/lib/constants";
import { Application, AICheckResult } from "@/lib/types";

export default function ApprovalPage() {
  const [targetMonth, setTargetMonth] = useState(getCurrentTargetMonth());
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [aiCheckResults, setAiCheckResults] = useState<
    Record<string, AICheckResult>
  >({});
  const [aiCheckLoading, setAiCheckLoading] = useState<
    Record<string, boolean>
  >({});
  const aiCheckFetchedRef = useRef<Set<string>>(new Set());

  const { applications, isLoading, error, refetch } =
    useApplications(targetMonth);

  const selectedApplication = applications.find(
    (app) => app.applicationId === selectedApplicationId
  );

  useEffect(() => {
    if (applications.length > 0 && !selectedApplicationId) {
      setSelectedApplicationId(applications[0].applicationId);
    }
  }, [applications, selectedApplicationId]);

  useEffect(() => {
    const app = selectedApplication;
    if (!app) return;
    if (app.targetMonth !== targetMonth) return;

    const id = app.applicationId;
    if (aiCheckFetchedRef.current.has(id)) return;
    aiCheckFetchedRef.current.add(id);

    setAiCheckLoading((prev) => ({ ...prev, [id]: true }));

    const ac = new AbortController();
    fetch("/api/ai-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: id,
        receiptUrl: app.receiptUrl,
        tool: app.tool,
        amount: app.amount,
        targetMonth: app.targetMonth,
        purpose: app.purpose ?? "",
      }),
      signal: ac.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setAiCheckResults((prev) => ({ ...prev, [id]: data.data }));
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        // その他のエラーは無視（ロード完了扱い）
      })
      .finally(() => {
        setAiCheckLoading((prev) => ({ ...prev, [id]: false }));
      });

    return () => {
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when selected id/month change
  }, [selectedApplication?.applicationId, selectedApplication?.targetMonth, targetMonth]);

  const handleMonthChange = (month: string) => {
    setTargetMonth(month);
    setSelectedApplicationId(null);
  };

  const handleSelectApplication = (app: Application) => {
    setSelectedApplicationId(app.applicationId);
  };

  const handleCheckSubmitted = () => {
    refetch();
  };

  const effectiveApplication =
    selectedApplication != null
      ? {
          ...selectedApplication,
          aiCheckResult:
            aiCheckResults[selectedApplication.applicationId] ??
            selectedApplication.aiCheckResult,
        }
      : undefined;

  const centerContent =
    effectiveApplication ? (
      <ApplicationDetail
        application={effectiveApplication}
        aiCheckLoading={
          aiCheckLoading[effectiveApplication.applicationId] ?? false
        }
      />
    ) : (
      <div className="flex items-center justify-center h-full min-h-[200px] text-body text-muted-foreground">
        申請を選択してください
      </div>
    );

  return (
    <AppShell
      header={
        <Header
          targetMonth={targetMonth}
          onMonthChange={handleMonthChange}
          applications={applications}
        />
      }
      sidebarBulkCheckProps={{
        targetMonth,
        applications,
        onDone: refetch,
      }}
      left={
        <LeftPanel
          applications={applications}
          selectedId={selectedApplicationId}
          onSelect={handleSelectApplication}
          isLoading={isLoading}
          error={error}
        />
      }
      center={centerContent}
      right={
        <RightPanel
          application={effectiveApplication}
          onCheckSubmitted={handleCheckSubmitted}
        />
      }
    />
  );
}
