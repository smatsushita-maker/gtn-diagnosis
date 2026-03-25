# GTN 外国人雇用リスク診断（無料版）

Global Talent Navi (GTN) の外国人雇用リスク診断ツール。
10問・約3分の質問に答えることで、外国人雇用の成功確率とリスク項目を表示し、無料相談へ誘導します。

---

## ファイル構成

```
GTN_diagnosis/
├─ diagnosis.html     ← 診断LPページ（流入エントリー）
├─ check.html         ← 診断ページ（10問ステップ形式）
├─ result.html        ← 結果ページ（成功確率・リスク・フォーム）
├─ css/
│  └─ style.css       ← 全ページ共通スタイル
├─ js/
│  └─ app.js          ← 診断ロジック・スコアリング・GAS連携
├─ assets/
│  ├─ images/         ← OGP画像等を配置
│  └─ icons/          ← アイコン素材
└─ README.md
```

---

## ★ 必須の差し替え箇所（`js/app.js` の先頭）

```js
/** Google Apps Script デプロイURL ← ここを差し替え */
const GAS_URL = 'YOUR_GAS_DEPLOYMENT_URL_HERE';

/** 無料相談ページURL ← ここを差し替え */
const CONSULT_URL = 'https://example.com/contact';
```

---

## スコアリング仕様

| 選択肢 | 点数 |
|--------|------|
| A      | 2点  |
| B      | 1点  |
| C      | 0点  |

**最大スコア：20点（10問 × 2点）**

### 総合評価

| スコア   | 評価 |
|----------|------|
| 16〜20点 | A評価 |
| 10〜15点 | B評価 |
| 0〜9点   | C評価 |

### 成功確率の目安

| スコア  | 成功確率の目安 |
|---------|--------------|
| 18〜20点 | 85〜95% |
| 16〜17点 | 75〜84% |
| 13〜15点 | 60〜74% |
| 10〜12点 | 45〜59% |
| 0〜9点  | 20〜44% |

---

## ページ遷移フロー

```
流入（note / X / LinkedIn / 検索 等）
   ↓ ?source=note 等のパラメータで流入元を保持
diagnosis.html（LP）
   ↓ 「無料で診断する」ボタン
check.html（10問診断）← localStorage に回答を保存
   ↓ 全10問完了後「結果を見る」
result.html（結果 + フォーム）
   ↓ フォーム送信 → GASへPOST → サンクスメッセージ
```

---

## Google Sheets 連携（GAS設定手順）

### 1. Googleスプレッドシートを作成

1行目にヘッダーを設定（順序は送信データに合わせること）:

```
日時 | スコア | 成功確率% | 評価 | リスク | 流入元 | 会社名 | 氏名 | メール | 電話 | 業種 | 従業員数 | 外国人雇用状況 | Q1 | Q2 | ... | Q10
```

### 2. Apps Script を作成

スプレッドシートの「拡張機能」→「Apps Script」を開き、以下を貼り付け:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    sheet.appendRow([
      data.timestamp,
      data.score,
      data.rate,
      data.rating,
      (data.risks || []).join(' / '),
      data.source,
      data.company,
      data.name,
      data.email,
      data.phone,
      data.industry,
      data.employees,
      data.foreignStatus,
      // 各設問の回答
      data.a1, data.a2, data.a3, data.a4, data.a5,
      data.a6, data.a7, data.a8, data.a9, data.a10,
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 3. デプロイ

- 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
- 実行ユーザー：「自分」
- アクセスできるユーザー：「全員」
- デプロイ後に表示されるURLを `app.js` の `GAS_URL` に貼り付け

> **注意**: GASへのPOSTは `mode: 'no-cors'` を使用するため、レスポンス内容は取得できません。データはスプレッドシートに記録されます。

---

## URLパラメータ（流入元トラッキング）

診断LPへの流入URLに `?source=` パラメータを付与することで、流入元を記録できます。

```
https://example.com/diagnosis?source=note
https://example.com/diagnosis?source=x
https://example.com/diagnosis?source=linkedin
https://example.com/diagnosis?source=email
```

---

## GA4 イベント設計

`app.js` 内の `trackEvent()` 関数でイベントを送信します。
gtag または GTM の dataLayer に対応しています。

| イベント名           | トリガー                     | 主なパラメータ           |
|--------------------|------------------------------|-------------------------|
| `page_view_lp`     | diagnosis.html 到達時         | source                  |
| `question_answered`| 各質問に回答時                | question_num, answer_label, answer_score |
| `diagnosis_complete`| 10問完了・result.html遷移時  | score, rating, source   |
| `result_viewed`    | result.html 描画完了時        | score, rating, rate, source |
| `cta_click`        | CTAボタンクリック時           | cta_id, location        |
| `form_submit`      | フォーム送信成功時            | rating, score, source, industry, employees |
| `lead_captured`    | リード情報取得完了時          | rating, source          |

**GA4の設定:**
```html
<!-- diagnosis.html の </head> 前に追加 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## CTAクリック計測用 ID / class

| 要素                | id / class          | 場所          |
|--------------------|---------------------|---------------|
| LP ヒーローCTA      | `id="cta-hero"`     | diagnosis.html |
| LP 下部CTA          | `id="cta-bottom"`   | diagnosis.html |
| 結果ページCTA       | `id="cta-consult"`  | result.html   |
| フォーム送信ボタン   | `id="btn-form-submit"` | result.html |
| 相談リンク          | `class="js-consult-link"` | result.html |

---

## デプロイ方法

### 静的ファイルとしてのデプロイ（推奨）

以下のホスティングサービスに、フォルダごとドラッグ＆ドロップするだけで公開できます：

- **Netlify**: [netlify.com](https://netlify.com) → Drop → 即公開
- **Vercel**: `vercel deploy` コマンド or GitHubと連携
- **さくらのレンタルサーバー**: FTPでアップロード
- **GitHub Pages**: リポジトリ → Settings → Pages で公開

### 公開URL例

```
https://your-domain.com/diagnosis   ← 診断LP
https://your-domain.com/check       ← 診断ページ（.htmlなし運用の場合はリライト設定が必要）
https://your-domain.com/result      ← 結果ページ
```

**`.html`ありでも問題なく動作します。**

---

## データフロー概要

```
[ユーザー]
  → check.html で回答（localStorage に保存）
  → result.html でスコア計算・リスク抽出
  → フォーム入力・送信
  → [app.js] POST to GAS_URL
  → [GAS] スプレッドシートに追記
  → [担当者] スプレッドシートを確認・対応
```

---

## ブラウザ対応

- Chrome / Edge / Firefox / Safari（最新版）
- iOS Safari / Android Chrome（スマホ対応済み）

---

© 2025 Global Talent Navi (GTN). All rights reserved.
