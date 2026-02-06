import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AICheckResult } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

const GEMINI_MODEL = "gemini-2.5-flash-lite";

const PROMPT = `あなたは経理担当者のアシスタントです。この領収書を分析して、申請内容と整合性をチェックしてください。

【重要：通貨・為替】
- 申請金額は常に日本円（JPY）です。
- 領収書の金額がドル（USD）・ユーロ（EUR）等の外貨の場合は、為替レートを考慮して日本円に換算してから比較してください。目安として 1USD≒150円 程度を使用してよいです。
- extractedAmount は必ず「日本円換算後の数値」で返してください。例：領収書が $35 なら約5,250円なので extractedAmount は 5250。
- 金額一致（amountMatch）の判定は、申請金額（円）と領収書を日本円換算した金額を比較して行ってください。

【チェック項目】
1. 領収書から金額と通貨を読み取り、日本円に換算する
2. 領収書の発行日を読み取る
3. 支払先（店名・サービス名）を読み取る
4. 申請金額（円）と領収書の金額（円換算後）が一致するか
5. 発行日が対象月内か
6. ツール名と支払先が一致するか（完全一致でなくても、関連性があればOK）
7. 不審点や注意事項はあるか

【重要：Apple/Google Play 領収書とアプリ内課金】
- 領収書の支払先がApple（iTunes/App Store）やGoogle Playの場合は問題なし。Canva・CapCut等のアプリ内課金は領収書に「Apple」等と表示されることがある。
- 申請ツールがCanva・CapCut等で、領収書にそのツール名（例：Canva、CapCut）または該当する商品名が明記されている場合は、申請ツールと同一とみなし vendorMatch=true、findings に追加せず、金額・日付が一致していれば riskLevel は OK でよい。
- 領収書がApple/Google請求で、領収書から申請ツール（Canva等）が特定できない場合のみ、vendorMatch=false とし、findingsに「領収書はApple（またはGoogle）請求。申請ツールは{ツール名}。領収書にツール名の記載がなく要確認」を追加し、riskLevel は WARNING とする。

以下のJSON形式で回答してください（JSON以外は出力しないでください）：
{
  "extractedAmount": 数値（必ず日本円換算後の金額）,
  "extractedDate": "YYYY-MM-DD",
  "extractedVendor": "店名またはサービス名",
  "amountMatch": true/false,
  "dateMatch": true/false,
  "vendorMatch": true/false,
  "riskLevel": "OK" | "WARNING" | "ERROR",
  "findings": ["検出事項1", "検出事項2"],
  "recommendation": "要確認" または "却下推奨" など補足があれば短文で（問題なければ空文字で可）,
  "confidence": 0.0〜1.0の数値
}

【判定基準】
- riskLevel: "OK" = 全て問題なし、"WARNING" = 軽微な不一致あり、"ERROR" = 重大な不一致あり
- findings: 検出した事項を箇条書きで（問題がなければ空配列）
- confidence: AIの判定に対する信頼度（0.0〜1.0）`;

function buildApplicationText(applicationData: {
  tool: string;
  amount: number;
  targetMonth: string;
  purpose: string;
}): string {
  return `【申請内容】
- ツール名: ${applicationData.tool}
- 申請金額: ¥${applicationData.amount.toLocaleString()}
- 対象月: ${applicationData.targetMonth}
- 使用目的: ${applicationData.purpose}

${PROMPT}`;
}

async function checkReceiptWithGemini(
  receiptBase64: string,
  applicationData: {
    tool: string;
    amount: number;
    targetMonth: string;
    purpose: string;
  },
  startTime: number,
  fallbackResult: (message: string) => AICheckResult
): Promise<AICheckResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return fallbackResult(
      "PDF用のGemini APIキー（GOOGLE_GEMINI_API_KEY）が設定されていません。"
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const textPart = buildApplicationText(applicationData);
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: receiptBase64,
        },
      },
      { text: textPart },
    ]);

    const response = result.response;
    const text = response.text();
    if (!text) {
      return fallbackResult("Geminiから応答がありませんでした");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackResult("AI応答にJSONが見つかりませんでした");
    }

    const parsed: AICheckResult = JSON.parse(jsonMatch[0]);
    parsed.processingTime = Date.now() - startTime;
    return parsed;
  } catch (error) {
    console.error("Gemini PDF check failed:", error);
    const msg =
      error instanceof Error ? error.message : "PDFのAI処理中にエラーが発生しました";
    return fallbackResult(msg);
  }
}

export async function checkReceipt(
  receiptBase64: string,
  applicationData: {
    tool: string;
    amount: number;
    targetMonth: string;
    purpose: string;
  },
  options?: { mimeType?: string }
): Promise<AICheckResult> {
  const startTime = Date.now();
  const allowed =
    "image/jpeg,image/png,image/gif,image/webp,application/pdf".split(",");
  const mimeType =
    options?.mimeType && allowed.includes(options.mimeType)
      ? options.mimeType
      : "image/jpeg";

  const fallbackResult = (message: string): AICheckResult => ({
    extractedAmount: 0,
    extractedDate: "",
    extractedVendor: "",
    amountMatch: false,
    dateMatch: false,
    vendorMatch: false,
    riskLevel: "ERROR",
    findings: [message],
    recommendation: "手動確認が必要です",
    confidence: 0,
    processingTime: Date.now() - startTime,
  });

  if (mimeType === "application/pdf") {
    return checkReceiptWithGemini(
      receiptBase64,
      applicationData,
      startTime,
      fallbackResult
    );
  }

  try {
    const imageUrl = `data:${mimeType};base64,${receiptBase64}`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: "image_url",
        image_url: { url: imageUrl },
      },
      {
        type: "text",
        text: buildApplicationText(applicationData),
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackResult("AI応答にJSONが見つかりませんでした");
    }

    const result: AICheckResult = JSON.parse(jsonMatch[0]);
    result.processingTime = Date.now() - startTime;
    return result;
  } catch (error) {
    console.error("AI check failed:", error);
    const msg =
      error instanceof Error ? error.message : "AI処理中にエラーが発生しました";
    return fallbackResult(msg);
  }
}

export async function fetchReceiptAsBase64(
  driveUrl: string
): Promise<{ base64: string; mimeType: string }> {
  const fileIdMatch =
    driveUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/) ??
    driveUrl.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (!fileIdMatch) {
    throw new Error("Invalid Google Drive URL");
  }

  const fileId = fileIdMatch[1];
  const baseUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_GAS_API_URL is not defined");
  }

  const response = await fetch(
    `${baseUrl}?action=api&method=getImageBase64&fileId=${encodeURIComponent(fileId)}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch receipt file");
  }

  const data = (await response.json()) as {
    success: boolean;
    message?: string;
    base64?: string;
    mimeType?: string;
  };

  if (!data.success) {
    throw new Error(data.message || "Failed to get file");
  }

  if (data.base64 == null) {
    throw new Error("No base64 in response");
  }

  const mimeType = data.mimeType || "image/jpeg";
  return { base64: data.base64.replace(/\s/g, ""), mimeType };
}
