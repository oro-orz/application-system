// ============================================
// 定数定義
// ============================================

export const CHECK_STATUS = {
  UNCONFIRMED: "未確認",
  ACCOUNTING_APPROVED: "経理承認済",
  REJECTED: "差し戻し",
  EXECUTIVE_PENDING: "役員確認待ち",
  EXECUTIVE_APPROVED: "最終承認済",
} as const;

export const AI_RISK_LEVEL = {
  OK: "OK",
  WARNING: "WARNING",
  ERROR: "ERROR",
} as const;

export const LOCATIONS = [
  "天神",
  "中洲",
  "熊本",
  "九大",
  "目黒",
] as const;

export const CHECK_STATUS_COLORS = {
  [CHECK_STATUS.UNCONFIRMED]: "bg-gray-100 text-gray-800 border-gray-300",
  [CHECK_STATUS.ACCOUNTING_APPROVED]:
    "bg-green-100 text-green-800 border-green-300",
  [CHECK_STATUS.REJECTED]: "bg-[#EF4343] text-white border-[#EF4343]",
  [CHECK_STATUS.EXECUTIVE_PENDING]:
    "bg-purple-600 text-white border-purple-600",
  [CHECK_STATUS.EXECUTIVE_APPROVED]:
    "bg-emerald-100 text-emerald-800 border-emerald-300",
} as const;

export const AI_RISK_COLORS = {
  [AI_RISK_LEVEL.OK]: "bg-green-50 text-green-700 border-green-200",
  [AI_RISK_LEVEL.WARNING]: "bg-yellow-50 text-yellow-700 border-yellow-200",
  [AI_RISK_LEVEL.ERROR]: "bg-red-50 text-red-700 border-red-200",
} as const;

export const AI_RISK_LABELS = {
  [AI_RISK_LEVEL.OK]: "OK",
  [AI_RISK_LEVEL.WARNING]: "要確認",
  [AI_RISK_LEVEL.ERROR]: "NG",
} as const;

// 月の自動切り替えロジック用
export function getCurrentTargetMonth(): string {
  const now = new Date();
  // 今月1日から15日まで → 先月分を表示
  // 今月16日以降 → 今月分を表示
  if (now.getDate() <= 15) {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  } else {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
}
