#!/usr/bin/env node
/**
 * ローカルで一括AIチェックを実行するスクリプト
 * 事前に npm run dev で開発サーバーを起動しておいてください。
 * 件数が多い場合は10件ずつチャンクでリクエストするため、タイムアウトしません。
 *
 * 使い方:
 *   npm run bulk-check              # 2026-01 で実行（デフォルト）
 *   npm run bulk-check 2026-02      # 指定月で実行
 *   MONTH=2026-01 npm run bulk-check
 *   CHUNK=20 npm run bulk-check     # 1回あたり20件ずつ（デフォルト10）
 *
 * サーバーが 3000 以外のポートのとき:
 *   BASE_URL=http://localhost:3003 npm run bulk-check 2026-01
 */

const month = process.argv[2] || process.env.MONTH || "2026-01";
const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const chunkSize = Math.min(50, Math.max(1, parseInt(process.env.CHUNK || "10", 10) || 10));

async function main() {
  console.log(`一括AIチェック: ${month}（${chunkSize}件ずつ） ${baseUrl}`);
  let offset = 0;
  let totalProcessed = 0;
  let totalFailed = 0;
  const allErrors = [];

  for (;;) {
    const res = await fetch(`${baseUrl}/api/ai-check-bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, limit: chunkSize, offset }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("応答がJSONではありません:", text.slice(0, 200));
      console.error("ステータス:", res.status);
      process.exit(1);
    }
    if (!res.ok) {
      console.error("エラー:", data.message || res.statusText);
      process.exit(1);
    }

    totalProcessed += data.processed ?? 0;
    totalFailed += data.failed ?? 0;
    if (data.errors?.length) allErrors.push(...data.errors);
    console.log(data.message);

    if (data.nextOffset == null) {
      break;
    }
    offset = data.nextOffset;
  }

  console.log(`\n合計: 成功 ${totalProcessed} 件、失敗 ${totalFailed} 件`);
  if (allErrors.length > 0) {
    console.log("失敗した申請:");
    allErrors.forEach((e) => console.log(`  - ${e.employeeName ?? e.applicationId}: ${e.message}`));
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
