/**
 * BigQuery 社員マスタ（tmg_portal.employees）から google_email で社員を取得する。
 * BIGQUERY_PROJECT_ID, BIGQUERY_DATASET_ID, BIGQUERY_LOCATION, GOOGLE_SERVICE_ACCOUNT_KEY を使用。
 */
import { BigQuery } from "@google-cloud/bigquery";

export interface EmployeeRow {
  employee_number: string;
  name: string;
  department: string;
  role: string;
  tmg_email: string;
  google_email: string | null;
}

const DEFAULT_LOCATION = "asia-northeast1";

/** 有効な BigQuery リージョン（CloudRegion）文字列かどうか。メール等の誤設定を弾く。 */
function isValidBigQueryLocation(value: string): boolean {
  return (
    value.length >= 5 &&
    value.length <= 32 &&
    !value.includes("@") &&
    /^[a-z0-9-]+$/.test(value)
  );
}

function getQueryLocation(): string {
  const raw = process.env.BIGQUERY_LOCATION ?? "";
  return isValidBigQueryLocation(raw) ? raw : DEFAULT_LOCATION;
}

function getBigQueryClient(): BigQuery {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const location = getQueryLocation();
  if (!key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY must be set");
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(key) as Record<string, unknown>;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY must be a valid JSON string");
  }
  /** サービスアカウントの project_id を優先（404 Not found を防ぐ）。なければ BIGQUERY_PROJECT_ID。いずれも小文字で渡す。 */
  const fromCreds =
    typeof credentials.project_id === "string"
      ? credentials.project_id.trim().toLowerCase()
      : "";
  const fromEnv =
    (process.env.BIGQUERY_PROJECT_ID ?? "").trim().toLowerCase();
  const projectId = fromCreds || fromEnv;
  if (!projectId) {
    throw new Error(
      "BIGQUERY_PROJECT_ID or GOOGLE_SERVICE_ACCOUNT_KEY.project_id must be set"
    );
  }
  return new BigQuery({
    projectId,
    credentials: credentials as object,
    location,
  });
}

/**
 * google_email で社員を 1 件取得する。見つからなければ null。
 */
export async function getEmployeeByGoogleEmail(
  googleEmail: string
): Promise<EmployeeRow | null> {
  const datasetId = process.env.BIGQUERY_DATASET_ID ?? "tmg_portal";
  const client = getBigQueryClient();
  const query = `
    SELECT employee_number, name, department, role, tmg_email, google_email
    FROM \`${client.projectId}.${datasetId}.employees\`
    WHERE LOWER(TRIM(google_email)) = LOWER(TRIM(@email))
    LIMIT 1
  `;
  const [rows] = await client.query({
    query,
    params: { email: googleEmail },
    location: getQueryLocation(),
  });
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    employee_number: String(row.employee_number ?? ""),
    name: String(row.name ?? ""),
    department: String(row.department ?? ""),
    role: String(row.role ?? ""),
    tmg_email: String(row.tmg_email ?? ""),
    google_email: row.google_email != null ? String(row.google_email) : null,
  };
}
