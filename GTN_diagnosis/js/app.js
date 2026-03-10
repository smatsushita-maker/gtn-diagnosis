/**
 * GTN 外国人雇用リスク診断 — メインロジック
 * -----------------------------------------------
 * GAS連携URLは下記 GAS_URL を差し替えてください
 * 相談ページURLは下記 CONSULT_URL を差し替えてください
 */

'use strict';

/* =============================================
   ★ 設定値（差し替えポイント）
   ============================================= */

/** Google Apps Script デプロイURL ← ここを差し替え */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwCUN-cO15RF-T5-BU5zJR74FHutgnWnuP3G7Mmar4QZwEWfLSpUBoNGn4TGsxn9SJl/exec';

/** 無料相談ページURL ← ここを差し替え */
const CONSULT_URL = 'https://calendar.app.google/erJ8R63g9zWargiR9';

/* =============================================
   診断データ
   ============================================= */

const QUESTIONS = [
  {
    id: 1,
    text: '外国人材を雇用する目的は明確ですか？',
    options: [
      { label: 'A', text: '明確に定義されている', score: 2 },
      { label: 'B', text: '人手不足解消が中心', score: 1 },
      { label: 'C', text: 'とりあえず採用を検討している', score: 0 },
    ],
    risks: {
      B: { label: '雇用目的が「人手不足解消」に偏っている', detail: '採用後の役割設計・定着支援が手薄になりやすい状態です。', level: 'mid' },
      C: { label: '雇用目的が不明確', detail: '採用・受入の設計全体に影響する根本的なリスク要因です。', level: 'high' },
    },
  },
  {
    id: 2,
    text: '外国人材の受入責任者は決まっていますか？',
    options: [
      { label: 'A', text: '専任または明確な責任者がいる', score: 2 },
      { label: 'B', text: '兼任で対応予定', score: 1 },
      { label: 'C', text: '特に決まっていない', score: 0 },
    ],
    risks: {
      B: { label: '受入担当者が兼任で対応が手薄', detail: 'サポートの質が安定せず、対応が後回しになりやすい状態です。', level: 'mid' },
      C: { label: '受入責任者が不明確', detail: '問題発生時に対応できず、現場対応が属人化するリスクがあります。', level: 'high' },
    },
  },
  {
    id: 3,
    text: '外国人材に任せる仕事内容は明確ですか？',
    options: [
      { label: 'A', text: '明確に定義されている', score: 2 },
      { label: 'B', text: 'ある程度決まっている', score: 1 },
      { label: 'C', text: '現場判断に任せる予定', score: 0 },
    ],
    risks: {
      B: { label: '業務内容の定義が不十分', detail: '入社後のミスマッチや、期待値のズレが生じやすい状態です。', level: 'mid' },
      C: { label: '業務内容の定義が未設定', detail: '指示・評価の基準が定まらず、早期離職につながるリスクがあります。', level: 'high' },
    },
  },
  {
    id: 4,
    text: '外国人材の評価方法や基準はありますか？',
    options: [
      { label: 'A', text: '明確な評価制度がある', score: 2 },
      { label: 'B', text: '一部あるが十分ではない', score: 1 },
      { label: 'C', text: '特にない', score: 0 },
    ],
    risks: {
      B: { label: '評価基準が不完全', detail: '公平感の欠如がモチベーション低下の原因になる可能性があります。', level: 'mid' },
      C: { label: '評価制度が未整備', detail: '成長実感や公平感が持てず、離職リスクが高まる状態です。', level: 'high' },
    },
  },
  {
    id: 5,
    text: '日本語力や業務理解を支援する仕組みはありますか？',
    options: [
      { label: 'A', text: '教育やフォロー体制がある', score: 2 },
      { label: 'B', text: '必要に応じて対応予定', score: 1 },
      { label: 'C', text: '特にない', score: 0 },
    ],
    risks: {
      B: { label: '教育・フォロー体制が場当たり的', detail: '業務習熟が遅れ、現場の負担増にもつながる可能性があります。', level: 'mid' },
      C: { label: '教育・サポート体制がない', detail: '業務理解の遅れや孤立感から、早期離職につながるリスクがあります。', level: 'high' },
    },
  },
  {
    id: 6,
    text: '生活面のサポート体制はありますか？',
    options: [
      { label: 'A', text: '社内または外部連携で整っている', score: 2 },
      { label: 'B', text: '一部のみ対応できる', score: 1 },
      { label: 'C', text: '特に想定していない', score: 0 },
    ],
    risks: {
      B: { label: '生活サポートが限定的', detail: '住居・行政手続きなど生活面の不安が仕事に影響するリスクがあります。', level: 'mid' },
      C: { label: '生活支援体制がない', detail: '入国後の生活基盤が不安定になり、定着率に大きく影響します。', level: 'high' },
    },
  },
  {
    id: 7,
    text: 'これまでに外国人材の早期離職はありましたか？',
    options: [
      { label: 'A', text: 'ほとんどない', score: 2 },
      { label: 'B', text: '一部ある', score: 1 },
      { label: 'C', text: '複数回ある、または不安が大きい', score: 0 },
    ],
    risks: {
      B: { label: '過去の離職要因が未解消の可能性', detail: '同様の状況が繰り返されるリスクがあります。', level: 'mid' },
      C: { label: '離職再発リスクが高い状態', detail: '受入体制の根本的な見直しが必要な状況と考えられます。', level: 'high' },
    },
  },
  {
    id: 8,
    text: '外国人材のキャリアや将来像を考えていますか？',
    options: [
      { label: 'A', text: '考えている', score: 2 },
      { label: 'B', text: 'これから考える予定', score: 1 },
      { label: 'C', text: '特に考えていない', score: 0 },
    ],
    risks: {
      B: { label: 'キャリアビジョンが未定義', detail: '将来への見通しが持てないことが離職動機になるケースがあります。', level: 'mid' },
      C: { label: 'キャリア設計が未整備', detail: '長期定着を見込みにくく、転職先に流出するリスクが高い状態です。', level: 'high' },
    },
  },
  {
    id: 9,
    text: '外国人雇用に関する社内ルールや受入方針はありますか？',
    options: [
      { label: 'A', text: 'ある', score: 2 },
      { label: 'B', text: '一部だけある', score: 1 },
      { label: 'C', text: 'ない', score: 0 },
    ],
    risks: {
      B: { label: '社内方針が部分的で対応にムラがある', detail: '担当者によって対応がバラつき、不公平感につながるリスクがあります。', level: 'mid' },
      C: { label: '社内受入方針がない', detail: 'トラブル時の判断基準がなく、組織として対応できないリスクがあります。', level: 'high' },
    },
  },
  {
    id: 10,
    text: '外国人雇用の最終責任を誰が持つか明確ですか？',
    options: [
      { label: 'A', text: '経営者または責任者が明確', score: 2 },
      { label: 'B', text: '人事や現場が担当予定', score: 1 },
      { label: 'C', text: '曖昧', score: 0 },
    ],
    risks: {
      B: { label: '責任体制が現場・人事任せ', detail: '経営レベルのリスク管理ができておらず、問題の発見が遅れる可能性があります。', level: 'mid' },
      C: { label: '雇用責任の所在が曖昧', detail: '問題発生時に誰も判断できない状態は、組織全体のリスクになります。', level: 'high' },
    },
  },
];

/* スコア → 成功確率のルックアップ */
const SCORE_RATE_MAP = {
  20: 95, 19: 91, 18: 86,
  17: 80, 16: 75,
  15: 70, 14: 65, 13: 61,
  12: 56, 11: 51, 10: 46,
   9: 41,  8: 37,  7: 33,
   6: 30,  5: 27,  4: 25,
   3: 23,  2: 22,  1: 21,
   0: 20,
};

/* スコア → 評価 */
function calcRating(score) {
  if (score >= 16) return 'A';
  if (score >= 10) return 'B';
  return 'C';
}

/* 総評コメント */
const COMMENTS = {
  A: '基礎的な受入体制は比較的整っています。一方で、運用面や定着支援の精度によっては離職リスクが生じる可能性があります。採用前に役割分担と運用設計を再確認することで、さらに成功確率を高められます。',
  B: '外国人雇用を進めるうえで一定の土台はありますが、いくつか重要なリスク要因が見られます。このまま採用を先行させると、定着や現場運用の段階で課題が顕在化する可能性があります。',
  C: '現時点では、外国人雇用を進めた場合に早期離職や現場混乱が起きるリスクが高い状態です。採用活動を先行させる前に、受入体制や責任体制を整理することをおすすめします。',
};

/* =============================================
   ストレージユーティリティ
   ============================================= */

const STORAGE_ANSWERS_KEY = 'gtn_risk_answers';    // { "1": "A", "2": "C", ... }
const STORAGE_SOURCE_KEY  = 'gtn_risk_source';

function saveAnswers(answers) {
  localStorage.setItem(STORAGE_ANSWERS_KEY, JSON.stringify(answers));
}

function loadAnswers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ANSWERS_KEY)) || {};
  } catch { return {}; }
}

function clearAnswers() {
  localStorage.removeItem(STORAGE_ANSWERS_KEY);
  sessionStorage.removeItem('gtn_risk_current');
}

function saveCurrentIndex(idx) {
  sessionStorage.setItem('gtn_risk_current', String(idx));
}

function loadCurrentIndex() {
  const v = sessionStorage.getItem('gtn_risk_current');
  return v !== null ? parseInt(v, 10) : 0;
}

function saveSource(src) {
  localStorage.setItem(STORAGE_SOURCE_KEY, src);
}

function loadSource() {
  return localStorage.getItem(STORAGE_SOURCE_KEY) || 'direct';
}

/* =============================================
   GA4 イベント
   ============================================= */
function trackEvent(name, params = {}) {
  // GA4 gtag
  if (typeof gtag !== 'undefined') {
    gtag('event', name, params);
  }
  // GTM dataLayer
  if (typeof dataLayer !== 'undefined') {
    dataLayer.push({ event: name, ...params });
  }
}

/* =============================================
   GAS送信（Google Sheets連携）
   ============================================= */
async function sendToGAS(payload) {
  // ── デバッグ: URL確認 ──────────────────────────
  console.log('[GTN] GAS_URL :', GAS_URL);
  console.log('[GTN] payload :', JSON.parse(JSON.stringify(payload))); // 深いコピーで確実に展開

  if (!GAS_URL || GAS_URL === 'YOUR_GAS_DEPLOYMENT_URL_HERE') {
    console.warn('[GTN] ⚠ GAS_URL が未設定です。送信をスキップします。');
    return;
  }

  // ── デバッグ: 送信開始 ─────────────────────────
  console.log('[GTN] sending to GAS...');
  console.log('[GTN] fetch オプション:', {
    method: 'POST',
    mode:   'no-cors',
    body:   JSON.stringify(payload),
  });

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors', // GASはno-corsが必要（レスポンス本文は読めない）
      headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify(payload),
    });

    // ── デバッグ: fetch 完了（no-cors は type:'opaque' になる） ──
    console.log('[GTN] GAS送信完了');
    console.log('[GTN] Response type:', res.type);   // "opaque" なら GAS に到達している
    console.log('[GTN] Response status:', res.status); // no-cors は常に 0

  } catch (err) {
    // ── デバッグ: エラー詳細 ───────────────────────
    console.error('[GTN] GAS送信エラー ▼');
    console.error('  name   :', err.name);
    console.error('  message:', err.message);
    console.error('  stack  :', err.stack);
  }
}

/* =============================================
   CHECK PAGE ロジック
   ============================================= */
const CheckPage = {
  answers: {},
  currentIdx: 0,

  init() {
    // UTMソースを保存
    const src = new URLSearchParams(window.location.search).get('source') || 'direct';
    saveSource(src);

    this.answers    = loadAnswers();
    this.currentIdx = loadCurrentIndex();

    // インデックスが範囲外ならリセット
    if (this.currentIdx >= QUESTIONS.length) this.currentIdx = 0;

    this.bindEvents();
    this.render();
  },

  bindEvents() {
    document.getElementById('btn-prev').addEventListener('click', () => this.prev());
    document.getElementById('btn-next').addEventListener('click', () => this.next());
  },

  render() {
    const q   = QUESTIONS[this.currentIdx];
    const tot = QUESTIONS.length;

    // プログレスバー（回答済み数ベース）
    const answeredCount = Object.keys(this.answers).length;
    const pct = Math.round((answeredCount / tot) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-label').textContent =
      `質問 ${this.currentIdx + 1} / ${tot}`;

    // 質問本文
    document.getElementById('q-label').textContent = `Q${q.id}`;
    document.getElementById('q-text').textContent  = q.text;

    // 選択肢描画
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    q.options.forEach((opt) => {
      const alreadySelected = this.answers[q.id] === opt.label;
      const item = document.createElement('div');
      item.className = 'option-item';
      item.innerHTML = `
        <input type="radio" name="q${q.id}" id="opt_${q.id}_${opt.label}"
               value="${opt.label}" ${alreadySelected ? 'checked' : ''}>
        <label class="option-label" for="opt_${q.id}_${opt.label}">
          <span class="option-badge">${opt.label}</span>
          <span>${opt.text}</span>
        </label>
      `;
      container.appendChild(item);
    });

    // 選択イベント
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => this.onSelect(q.id, radio.value));
    });

    // ボタン状態
    const hasAns = this.answers[q.id] !== undefined;
    const isLast = this.currentIdx === tot - 1;
    const prevBtn  = document.getElementById('btn-prev');
    const nextBtn  = document.getElementById('btn-next');

    prevBtn.disabled = this.currentIdx === 0;

    if (isLast) {
      nextBtn.textContent = '結果を見る →';
      nextBtn.className   = 'btn-finish';
    } else {
      nextBtn.textContent = '次の質問へ →';
      nextBtn.className   = 'btn-next-q';
    }
    nextBtn.disabled = !hasAns;

    // フェードアニメーション
    const card = document.getElementById('question-card');
    card.classList.remove('fade-up');
    void card.offsetWidth;
    card.classList.add('fade-up');
  },

  onSelect(qId, label) {
    this.answers[qId] = label;
    saveAnswers(this.answers);
    document.getElementById('btn-next').disabled = false;

    // GA4イベント
    const q = QUESTIONS.find(q => q.id === qId);
    const opt = q.options.find(o => o.label === label);
    trackEvent('question_answered', {
      question_num: qId,
      answer_label: label,
      answer_score: opt.score,
    });
  },

  prev() {
    if (this.currentIdx > 0) {
      this.currentIdx--;
      saveCurrentIndex(this.currentIdx);
      this.render();
    }
  },

  next() {
    const q = QUESTIONS[this.currentIdx];
    if (!this.answers[q.id]) return;

    if (this.currentIdx < QUESTIONS.length - 1) {
      this.currentIdx++;
      saveCurrentIndex(this.currentIdx);
      this.render();
    } else {
      // 全問完了 → 結果ページへ
      const score = this.calcScore();
      trackEvent('diagnosis_complete', {
        score,
        rating: calcRating(score),
        source: loadSource(),
      });
      sessionStorage.setItem('gtn_risk_current', '0');
      window.location.href = 'result.html';
    }
  },

  calcScore() {
    return QUESTIONS.reduce((acc, q) => {
      const label = this.answers[q.id];
      if (!label) return acc;
      const opt = q.options.find(o => o.label === label);
      return acc + (opt ? opt.score : 0);
    }, 0);
  },
};

/* =============================================
   RESULT PAGE ロジック
   ============================================= */
const ResultPage = {
  score:  0,
  rating: 'B',
  rate:   0,
  risks:  [],
  answers: {},

  init() {
    this.answers = loadAnswers();

    // 回答がなければ診断ページへ戻す
    if (Object.keys(this.answers).length === 0) {
      window.location.href = 'check.html';
      return;
    }

    this.score  = this.calcScore();
    this.rating = calcRating(this.score);
    this.rate   = SCORE_RATE_MAP[this.score] ?? 20;
    this.risks  = this.extractRisks();

    // ローディング後に描画
    setTimeout(() => {
      this.render();
      document.getElementById('loading-overlay').classList.add('hide');
    }, 2000);

    // CTAリンク設定
    document.querySelectorAll('.js-consult-link').forEach(el => {
      el.href = CONSULT_URL;
    });

    // もう一度やり直す
    document.querySelectorAll('.js-retry').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        clearAnswers();
        window.location.href = 'check.html';
      });
    });

    // フォームハンドリング
    this.initForm();

    // 印刷ボタン
    const printBtn = document.getElementById('btn-print');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // source取得
    const source = new URLSearchParams(window.location.search).get('source')
                   || loadSource() || 'direct';
    saveSource(source);
  },

  calcScore() {
    return QUESTIONS.reduce((acc, q) => {
      const label = this.answers[q.id];
      if (!label) return acc;
      const opt = q.options.find(o => o.label === label);
      return acc + (opt ? opt.score : 0);
    }, 0);
  },

  extractRisks() {
    const risks = [];
    // C回答（high）→ B回答（mid）の順で収集
    const collectLevel = (level) => {
      QUESTIONS.forEach(q => {
        const label = this.answers[q.id];
        if (!label || label === 'A') return;
        const riskDef = q.risks[label];
        if (!riskDef || riskDef.level !== level) return;
        risks.push({ qId: q.id, ...riskDef });
      });
    };
    collectLevel('high');
    collectLevel('mid');
    return risks.slice(0, 5); // 最大5件
  },

  render() {
    // 成功確率アニメーション
    this.animateCounter(this.rate);

    // 評価バッジ
    const badge = document.getElementById('rating-badge');
    badge.textContent = `総合評価：${this.rating}評価`;
    badge.className   = `rating-badge rating-${this.rating.toLowerCase()}`;

    // 総評
    document.getElementById('result-comment').textContent = COMMENTS[this.rating];

    // リスクリスト描画
    this.renderRisks();

    // スコア補足
    const scoreEl = document.getElementById('score-detail');
    if (scoreEl) {
      scoreEl.textContent = `スコア：${this.score} / 20点`;
    }

    // GA4
    trackEvent('result_viewed', {
      score:  this.score,
      rating: this.rating,
      rate:   this.rate,
      source: loadSource(),
    });
  },

  animateCounter(target) {
    const el = document.getElementById('rate-num');
    if (!el) return;
    const duration = 1500;
    const start = performance.now();
    const step = (ts) => {
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(ease * target);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  renderRisks() {
    const container = document.getElementById('risk-list');
    if (!container) return;

    if (this.risks.length === 0) {
      container.innerHTML = `
        <div class="risk-none">
          ✓ 現時点で抽出された主要リスクはありません。<br>
          引き続き受入体制の維持・改善をおすすめします。
        </div>
      `;
      return;
    }

    container.innerHTML = this.risks.map(r => `
      <div class="risk-item risk-${r.level}" role="listitem">
        <span class="risk-icon">${r.level === 'high' ? '⚠' : '△'}</span>
        <div>
          <div class="risk-item-label">${r.label}</div>
          <div class="risk-item-detail">${r.detail}</div>
        </div>
      </div>
    `).join('');
  },

  /* ---- フォーム ---- */
  initForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.validateForm(form)) return;

      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      const formData = this.getFormData(form);
      const payload  = this.buildPayload(formData);

      // ── デバッグ: フォーム送信直前 ──────────────────
      console.group('[GTN] フォーム送信');
      console.log('formData :', JSON.parse(JSON.stringify(formData)));
      console.log('payload  :', JSON.parse(JSON.stringify(payload)));
      console.groupEnd();

      await sendToGAS(payload);

      // ── デバッグ: sendToGAS 完了後 ──────────────────
      console.log('[GTN] sendToGAS 処理完了 → サンクス画面に切り替えます');

      // サンクス表示
      document.getElementById('form-body').style.display = 'none';
      document.getElementById('thanks-msg').classList.add('show');

      // GA4
      trackEvent('form_submit', {
        rating: this.rating,
        score:  this.score,
        source: loadSource(),
        industry: formData.industry,
        employees: formData.employees,
        foreign_status: formData.foreignStatus,
      });

      // CTA CTAクリック計測用要素の表示
      trackEvent('lead_captured', {
        rating: this.rating,
        source: loadSource(),
      });
    });
  },

  validateForm(form) {
    let valid = true;
    const fields = form.querySelectorAll('[data-required]');

    fields.forEach(field => {
      const errEl = document.getElementById(field.id + '-err');
      field.classList.remove('error');
      if (errEl) errEl.classList.remove('show');

      if (!field.value.trim()) {
        field.classList.add('error');
        if (errEl) { errEl.textContent = 'この項目は必須です。'; errEl.classList.add('show'); }
        valid = false;
      }
    });

    // メールバリデーション
    const emailEl = document.getElementById('f-email');
    if (emailEl && emailEl.value.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim());
      if (!emailOk) {
        emailEl.classList.add('error');
        const errEl = document.getElementById('f-email-err');
        if (errEl) { errEl.textContent = '正しいメールアドレスを入力してください。'; errEl.classList.add('show'); }
        valid = false;
      }
    }

    return valid;
  },

  getFormData(form) {
    return {
      company:       form.querySelector('#f-company').value.trim(),
      name:          form.querySelector('#f-name').value.trim(),
      email:         form.querySelector('#f-email').value.trim(),
      phone:         form.querySelector('#f-phone').value.trim(),
      industry:      form.querySelector('#f-industry').value,
      employees:     form.querySelector('#f-employees').value,
      foreignStatus: form.querySelector('#f-foreign-status').value,
    };
  },

  buildPayload(formData) {
    const answerLabels = QUESTIONS.map(q => this.answers[q.id] || '未回答');
    return {
      timestamp:     new Date().toISOString(),
      score:         this.score,
      rate:          this.rate,
      rating:        this.rating,
      risks:         this.risks.map(r => r.label),
      source:        loadSource(),
      // フォーム情報
      company:       formData.company,
      name:          formData.name,
      email:         formData.email,
      phone:         formData.phone,
      industry:      formData.industry,
      employees:     formData.employees,
      foreignStatus: formData.foreignStatus,
      // 各回答（Q1〜Q10）
      a1: answerLabels[0],  a2: answerLabels[1],  a3: answerLabels[2],
      a4: answerLabels[3],  a5: answerLabels[4],  a6: answerLabels[5],
      a7: answerLabels[6],  a8: answerLabels[7],  a9: answerLabels[8],
      a10: answerLabels[9],
    };
  },
};

/* =============================================
   初期化
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'check')  CheckPage.init();
  if (page === 'result') ResultPage.init();
});
