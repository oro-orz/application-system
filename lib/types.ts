// ============================================
// 型定義
// ============================================

export type ApplicationStatus = "申請中" | "承認済" | "却下";
export type CheckStatus =
  | "未確認"
  | "経理承認済"
  | "差し戻し"
  | "役員確認待ち"
  | "最終承認済";
export type AIRiskLevel = "OK" | "WARNING" | "ERROR";

export interface Application {
  applicationId: string;
  applicationDate: string;
  employeeNumber: string;
  employeeName: string;
  location: string;
  tool: string;
  amount: number;
  targetMonth: string;
  purpose: string;
  receiptUrl: string;
  creditUrl?: string;
  status: ApplicationStatus;
  checkStatus: CheckStatus;

  // AI自動チェック結果
  aiCheckResult?: AICheckResult;
  aiRiskLevel?: AIRiskLevel;

  // 経理チェック
  accountingChecker?: string;
  accountingCheckDate?: string;
  accountingComment?: string;

  // 役員確認
  executiveApprover?: string;
  executiveApprovalDate?: string;
  executiveComment?: string;

  supervisor?: string;
}

export interface AICheckResult {
  extractedAmount: number;
  extractedDate: string;
  extractedVendor: string;
  /** Apple/Google領収書の場合、領収書に記載の商品・アプリ名（例: Canva, CapCut） */
  extractedProductName?: string;
  amountMatch: boolean;
  dateMatch: boolean;
  vendorMatch: boolean;
  /** 適格請求書発行事業者登録番号（T+10桁）の記載有無 */
  hasQualifiedInvoiceNumber?: boolean;
  riskLevel: AIRiskLevel;
  findings: string[];
  recommendation: string;
  confidence: number;
  processingTime?: number;
}

export interface FilterOptions {
  searchQuery?: string;
  aiRiskLevel?: AIRiskLevel | "all";
  checkStatus?: CheckStatus | "all";
  location?: string;
}

export interface CheckSubmitPayload {
  applicationId: string;
  action:
    | "accounting_approve"
    | "accounting_reject"
    | "send_to_executive"
    | "executive_approve"
    | "executive_reject";
  checker: string;
  comment?: string;
}

/** 承認履歴 1 件（Supabase に保存し、API で返す用） */
export type ApprovalHistoryAction = CheckSubmitPayload["action"];

export interface ApprovalHistoryItem {
  id: string;
  applicationId: string;
  action: ApprovalHistoryAction;
  checker: string;
  comment: string | null;
  createdAt: string;
}
