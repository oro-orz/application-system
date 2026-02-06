# 業務ツール立替申請 - AI自動チェック統合システム

経理担当者と役員による二段階承認フローを実装した立替申請管理システムです。Claude APIによる領収書の自動チェック機能を搭載しています。

## 機能

### 実装済み機能

- **ログイン**: Firebase（Google）認証。所属課・役職・メール許可リストでアクセス制御。未登録／権限なし時はエラーメッセージを表示。
- **左右分割UI**: 申請一覧（左）と詳細（右）のシンプルな画面構成
- **AI自動チェック**: Claude APIによる領収書の自動読み取り・整合性チェック
- **二段階承認フロー**:
  - 経理チェック: 基本的な承認・差し戻し・役員へ回す
  - 役員確認: 経理が迷った案件のみ
- **月別表示**: 対象月の申請を表示（アーカイブは `/archive`）
- **CSVエクスポート**: 会計ソフト連携用のデータ出力
- **領収書表示**: Google Driveの画像はAPI経由で表示

### 主な特徴

1. **経理の負担軽減**: AIが自動で領収書を読み取り、不一致を検出
2. **シンプルなフロー**: 基本は経理のみで完結、必要な時だけ役員へ
3. **月次管理**: 月ごとに申請を表示、アーカイブで過去月を参照可能

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```env
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
OPENAI_API_KEY=sk-proj-xxxxx
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Supabase の準備（承認履歴・コメント用）

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. ダッシュボードの **SQL Editor** で `supabase/migrations/001_approval_history.sql` の内容を実行し、`approval_history` テーブルを作成
3. **Settings → API** で **Project URL** を `NEXT_PUBLIC_SUPABASE_URL`、**service_role** キーを `SUPABASE_SERVICE_ROLE_KEY` に設定

※ 承認結果はスプシには書き戻しません。経理・役員の意思疎通用にのみ Supabase に保存します。

#### Firebase 認証の設定（ログイン）

- **クライアント**: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_APP_ID`（Firebase Console のプロジェクト設定から取得）
- **サーバー**: `FIREBASE_SERVICE_ACCOUNT_KEY`（Service Account の JSON を文字列で設定）
- **セッション**: `AUTH_SECRET`（32文字以上のランダム文字列。JWT 署名に使用）
- **BigQuery**: `BIGQUERY_PROJECT_ID`, `BIGQUERY_DATASET_ID`, `BIGQUERY_LOCATION`, `GOOGLE_SERVICE_ACCOUNT_KEY`（社員マスタ参照）
- **ログイン許可条件**: `ALLOWED_DEPARTMENTS`（例: `システム課,経理課`）、`ALLOWED_ROLE`（例: `役員`）、`ALLOWED_LOGIN_EMAILS`（カンマ区切りのメール）。いずれかを満たすユーザーのみログイン可能。未登録の Gmail や条件を満たさない場合はログイン拒否となり、画面にメッセージを表示する。

#### GAS URL について（申請一覧の表示）

`NEXT_PUBLIC_GAS_API_URL` には **v1（API 用）** のコードをデプロイした URL を設定してください。申請一覧・詳細は JSON で返す API が必要です。HTML を表示するデプロイ（v2 の画面用など）の URL を設定すると「GAS が JSON ではなく HTML を返しました」というエラーになります。同じスプレッドシートに v1 のコードを入れた GAS を「ウェブアプリ」としてデプロイし、その URL をここに設定してください。

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセス（未ログイン時は `/login` にリダイレクトされます）

### 4. GAS側の設定

#### スプレッドシートの列構成

申請管理シートに以下の列を追加：

| 列 | 項目名 | 説明 |
|----|--------|------|
| Q | AI自動チェック結果 | JSON形式 |
| R | AI検出フラグ | OK/WARNING/ERROR |
| S | 経理チェック担当者 | 氏名 |
| T | 経理チェック日時 | タイムスタンプ |
| U | 経理コメント | テキスト |
| V | 役員承認者 | 氏名 |
| W | 役員承認日時 | タイムスタンプ |
| X | 役員コメント | テキスト |

また、P列を「経理確認」から「チェックステータス」に変更し、値を以下に統一：

- 未確認
- 経理承認済
- 差し戻し
- 役員確認待ち
- 最終承認済

#### GAS code.gsの更新

ファイル群2.md の「17. GAS側の追加コード」を既存の `code.gs` にマージし、Web Appとして再デプロイ。

## 使い方

### 経理担当者

1. 左パネルで未確認の申請を選択
2. 右パネルで領収書を確認
3. AI判定結果を参考にチェック
4. 問題なければ「経理承認」
5. 迷ったら「役員へ回す」

### 役員

1. 「役員確認待ち」の申請を選択
2. 経理のコメントを確認
3. 最終判断を下す

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **AI**: OpenAI API（領収書OCR・gpt-4o-mini）
- **バックエンド**: Google Apps Script
- **データ**: Google Sheets / Google Drive（申請データは読み取り専用）
- **承認履歴・コメント**: Supabase（スプシには書き戻さない）

## ディレクトリ構造

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx          # メイン承認画面
│   ├── globals.css
│   ├── archive/page.tsx  # 過去月アーカイブ
│   └── api/
│       ├── ai-check/       # AI自動チェック
│       ├── approval-history/ # 承認履歴の取得・追加（Supabase）
│       └── image/          # 領収書画像プロキシ
├── components/
│   ├── ui/               # shadcn/ui
│   ├── layout/           # Header, TwoColumnLayout
│   ├── approval/         # 承認画面用
│   └── shared/           # 共通コンポーネント
├── lib/
│   ├── types.ts
│   ├── constants.ts
│   ├── utils.ts
│   ├── formatters.ts
│   ├── gasApi.ts
│   ├── supabase.ts        # Supabase サーバー用クライアント
│   └── aiChecker.ts
└── hooks/
    ├── useApplications.ts
    └── useCheckSubmit.ts
```

## ライセンス

MIT
