"use client";

import { AICheckResult } from "@/lib/types";
import { AIRiskBadge } from "@/components/shared/AIRiskBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleXmark } from "@fortawesome/free-solid-svg-icons";

interface AICheckSectionProps {
  result?: AICheckResult;
  isLoading?: boolean;
}

export function AICheckSection({
  result,
  isLoading = false,
}: AICheckSectionProps) {
  if (isLoading && !result) {
    return (
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-body text-muted-foreground">AIチェック実行中</span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const vendorDisplay =
    result.extractedProductName?.trim()
      ? `${result.extractedVendor}（${result.extractedProductName.trim()}）`
      : result.extractedVendor;

  const rows = [
    { label: "申請金額一致", isMatch: result.amountMatch, value: formatCurrency(result.extractedAmount) },
    { label: "対象月内の日付", isMatch: result.dateMatch, value: formatDate(result.extractedDate) },
    { label: "ツール名一致", isMatch: result.vendorMatch, value: vendorDisplay },
    {
      label: "適格請求書登録番号",
      isMatch: result.hasQualifiedInvoiceNumber === true,
      value: result.hasQualifiedInvoiceNumber === true ? "記載あり" : result.hasQualifiedInvoiceNumber === false ? "記載なし" : "—",
    },
  ];

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-center gap-2">
        <AIRiskBadge riskLevel={result.riskLevel} />
      </div>

      <div className="space-y-3">
        {rows.map(({ label, isMatch, value }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-2 text-body min-w-0">
              {isMatch ? (
                <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <FontAwesomeIcon icon={faCircleXmark} className="h-4 w-4 text-red-600 flex-shrink-0" />
              )}
              <span className={isMatch ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                {label}
              </span>
            </div>
            <span className="text-body font-semibold text-foreground truncate text-right max-w-[50%]">
              {value}
            </span>
          </div>
        ))}
      </div>

      {result.findings.length > 0 && (
        <ul className="space-y-1 text-body text-amber-700">
          {result.findings.map((finding, index) => (
            <li key={index}>・{finding}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
