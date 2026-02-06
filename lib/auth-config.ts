/**
 * ログイン許可条件の取得と判定。
 * ALLOWED_LOGIN_EMAILS, ALLOWED_DEPARTMENTS, ALLOWED_ROLE をパースし、
 * 社員情報が条件を満たすか判定する。
 */
import type { EmployeeRow } from "./bigquery-employee";

function parseCsv(envValue: string | undefined): string[] {
  if (!envValue || typeof envValue !== "string") return [];
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 許可メールリスト（小文字で比較用） */
export function getAllowedEmails(): string[] {
  return parseCsv(process.env.ALLOWED_LOGIN_EMAILS).map((e) =>
    e.toLowerCase()
  );
}

/** 許可所属課 */
export function getAllowedDepartments(): string[] {
  return parseCsv(process.env.ALLOWED_DEPARTMENTS);
}

/** 許可権限（役職） */
export function getAllowedRoles(): string[] {
  return parseCsv(process.env.ALLOWED_ROLE);
}

/**
 * 社員がログイン許可条件を満たすか判定する。
 * (department in ALLOWED_DEPARTMENTS) OR (role in ALLOWED_ROLE) OR (email in ALLOWED_LOGIN_EMAILS)
 */
export function isLoginAllowed(employee: EmployeeRow, googleEmail: string): boolean {
  const allowedDepts = getAllowedDepartments();
  const allowedRoles = getAllowedRoles();
  const allowedEmails = getAllowedEmails();
  const emailLower = googleEmail.toLowerCase().trim();

  if (allowedDepts.length > 0 && allowedDepts.includes(employee.department.trim())) {
    return true;
  }
  if (allowedRoles.length > 0 && allowedRoles.includes(employee.role.trim())) {
    return true;
  }
  if (allowedEmails.length > 0 && allowedEmails.includes(emailLower)) {
    return true;
  }
  return false;
}
