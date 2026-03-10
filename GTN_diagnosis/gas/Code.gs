/**
 * GTN 外国人雇用リスク診断 — Google Apps Script API
 * =====================================================
 * 【セットアップ手順】
 *   1. SPREADSHEET_ID を実際のスプレッドシートIDに変更する
 *      （スプレッドシートURL中の /d/XXXXXXXX/edit の XXXXXXXX 部分）
 *   2. 「デプロイ」→「新しいデプロイ」→ 種類:「ウェブアプリ」
 *   3. 実行ユーザー: 「自分」
 *      アクセスできるユーザー: 「全員」（CORS対応に必要）
 *   4. デプロイして発行されたURLを app.js の GAS_URL に設定する
 */

/* =============================================
   ★ 設定値（必ず変更してください）
   ============================================= */

/** スプレッドシートID ← ここを変更 */
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

/** データ保存先シート名 */
const SHEET_NAME = 'responses';

/** エラーログシート名 */
const ERROR_SHEET = 'error_log';

/* =============================================
   スプレッドシートの列定義
   1行目のヘッダーと完全に一致させること
   ============================================= */
const HEADERS = [
  'timestamp',
  'source',
  'company_name',
  'name',
  'email',
  'phone',
  'industry',
  'employee_size',
  'foreign_hiring_status',
  'score',
  'success_rate',
  'grade',
  'major_risks',
  'q1',
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q8',
  'q9',
  'q10',
];

/* =============================================
   doPost — POSTリクエスト受信・保存
   ============================================= */
function doPost(e) {
  try {
    // --- 1. JSONパース ---
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('リクエストボディが空です');
    }

    const raw = JSON.parse(e.postData.contents);

    // --- 2. フィールドマッピング（クライアント側のキー → スプレッドシート列名） ---
    const record = mapFields(raw);

    // --- 3. スプレッドシートへ保存 ---
    const sheet = getOrCreateSheet(SHEET_NAME);
    ensureHeaders(sheet);

    const row = HEADERS.map(col => {
      const val = record[col];
      return val !== undefined && val !== null ? val : '';
    });

    sheet.appendRow(row);

    // --- 4. 成功レスポンス ---
    return buildResponse({ status: 'ok', saved: true });

  } catch (err) {
    logError(err, e);
    return buildResponse({ status: 'error', message: err.message }, true);
  }
}

/* =============================================
   doGet — ヘルスチェック & OPTIONSプリフライト代替
   ============================================= */
function doGet(e) {
  return buildResponse({ status: 'ok', message: 'GTN Diagnosis API is running.' });
}

/* =============================================
   フィールドマッピング
   クライアント（app.js）のペイロードキーを
   スプレッドシートの列名に変換する
   ============================================= */
function mapFields(raw) {
  return {
    // 基本情報
    timestamp:             raw.timestamp             || new Date().toISOString(),
    source:                raw.source                || 'direct',

    // フォーム入力（クライアント側のキー名に合わせてマッピング）
    company_name:          raw.company               || '',
    name:                  raw.name                  || '',
    email:                 raw.email                 || '',
    phone:                 raw.phone                 || '',
    industry:              raw.industry              || '',
    employee_size:         raw.employees             || '',
    foreign_hiring_status: raw.foreignStatus         || '',

    // 診断結果
    score:                 raw.score                 !== undefined ? raw.score : '',
    success_rate:          raw.rate                  !== undefined ? raw.rate  : '',
    grade:                 raw.rating                || '',
    major_risks:           formatRisks(raw.risks),

    // 各設問の回答（a1〜a10 → q1〜q10）
    q1:  raw.a1  || '',
    q2:  raw.a2  || '',
    q3:  raw.a3  || '',
    q4:  raw.a4  || '',
    q5:  raw.a5  || '',
    q6:  raw.a6  || '',
    q7:  raw.a7  || '',
    q8:  raw.a8  || '',
    q9:  raw.a9  || '',
    q10: raw.a10 || '',
  };
}

/** risksを文字列化（配列 or 文字列どちらも対応） */
function formatRisks(risks) {
  if (Array.isArray(risks)) return risks.join(' / ');
  if (typeof risks === 'string') return risks;
  return '';
}

/* =============================================
   スプレッドシートユーティリティ
   ============================================= */

/** シートを取得。存在しなければ新規作成 */
function getOrCreateSheet(name) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/** 1行目にヘッダーがなければ自動挿入（書式付き） */
function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) return; // 既にデータあり

  sheet.appendRow(HEADERS);

  // ヘッダー行の書式
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  range.setFontWeight('bold');
  range.setBackground('#1a5c3a'); // GTN グリーン
  range.setFontColor('#ffffff');
  range.setHorizontalAlignment('center');

  // 列幅の自動調整
  sheet.autoResizeColumns(1, HEADERS.length);

  // 先頭行を固定
  sheet.setFrozenRows(1);
}

/* =============================================
   エラーログ
   ============================================= */
function logError(err, e) {
  try {
    const sheet = getOrCreateSheet(ERROR_SHEET);

    // ヘッダーがなければ作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['timestamp', 'error_message', 'raw_body']);
      const hdr = sheet.getRange(1, 1, 1, 3);
      hdr.setFontWeight('bold');
      hdr.setBackground('#b91c1c');
      hdr.setFontColor('#ffffff');
    }

    sheet.appendRow([
      new Date().toISOString(),
      err.message || String(err),
      e && e.postData ? e.postData.contents : '(bodyなし)',
    ]);
  } catch (_) {
    // ログ記録の失敗は無視して本処理を妨げない
  }
}

/* =============================================
   レスポンス生成
   CORS対応:
     GAS を「アクセス: 全員」でデプロイすると
     Access-Control-Allow-Origin: * が自動付与される。
     クライアント側は mode:'no-cors' でも動作する。
   ============================================= */
function buildResponse(data, isError) {
  const payload = JSON.stringify(data);
  const output  = ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
