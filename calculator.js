/* ============================================================
   Optimum Validator Impact Calculator
   Community contribution — not an official Optimum product
   Research basis: getoptimum.xyz/blog (Mar 2026)
   ============================================================ */

'use strict';

/* ── State ─────────────────────────────────────────────────── */
let operatorType = 'solo';
let liveEthPrice = null;
let userOverrodePrive = false;

/* ── DOM helpers ────────────────────────────────────────────── */
const el  = id => document.getElementById(id);
const num = id => parseFloat(el(id).value);
const int = id => parseInt(el(id).value, 10);

function fmt(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return '$' + Math.round(n / 1_000) + 'K';
  return '$' + Math.round(n).toLocaleString();
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ── Operator type toggle ───────────────────────────────────── */
function setType(type, btn) {
  operatorType = type;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const slider = el('val-count');
  if (type === 'institutional') {
    slider.max = 50000;
    slider.step = 100;
    if (parseInt(slider.value) < 500) slider.value = 500;
  } else {
    slider.max = 5000;
    slider.step = 1;
    if (parseInt(slider.value) > 5000) slider.value = 5000;
  }
  update();
}

/* ── Live ETH price (CoinGecko public API, no key needed) ───── */
async function fetchEthPrice() {
  try {
    const res  = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) throw new Error('non-200');
    const data = await res.json();
    const price = Math.round(data.ethereum.usd);

    liveEthPrice = price;

    if (!userOverrodePrive) {
      // Snap slider to nearest 100
      const snapped = Math.round(price / 100) * 100;
      const clamped = clamp(snapped, 1000, 10000);
      el('eth-price').value = clamped;
      el('eth-price-out').textContent = '$' + price.toLocaleString();
    }

    el('live-badge').style.display = 'inline-flex';
    el('price-hint').textContent =
      `Live price: $${price.toLocaleString()} — last updated ${new Date().toLocaleTimeString()}`;

    update();
  } catch (e) {
    el('price-hint').textContent = 'Could not fetch live price — using slider value.';
  }
}

function onEthPriceManual() {
  userOverrodePrive = true;
  el('live-badge').style.display = 'none';
  el('price-hint').textContent = 'Using manual price. Reload page to re-fetch live price.';
  update();
}

/* ── Core calculation ───────────────────────────────────────── */
function calculate() {
  const validators  = int('val-count');
  const ethPrice    = liveEthPrice && !userOverrodePrive ? liveEthPrice : int('eth-price');
  const baseAPR     = num('base-apr');
  const latencyMs   = int('latency');
  const bwPerNode   = int('bandwidth');
  const bwCostPerGB = num('bw-cost');

  /* APR uplift
     Research: +0.66–0.97% per 50ms of additional slot time.
     Use 0.75 for solo (more conservative, smaller block share)
     and 0.82 for institutional (larger block production share). */
  const intervals            = latencyMs / 50;
  const aprPerInterval       = operatorType === 'solo' ? 0.75 : 0.82;
  const aprUplift            = clamp(parseFloat((intervals * aprPerInterval).toFixed(2)), 0, 2.5);
  const newAPR               = parseFloat((baseAPR + aprUplift).toFixed(2));

  /* Revenue */
  const totalETH             = validators * 32;
  const baseAnnualETH        = totalETH * (baseAPR / 100);
  const newAnnualETH         = totalETH * (newAPR / 100);
  const extraETH             = parseFloat((newAnnualETH - baseAnnualETH).toFixed(2));
  const extraUSD             = extraETH * ethPrice;

  /* MEV bid uplift (from research: 13–18% depending on latency window) */
  const mevPct = latencyMs <= 50  ? 13
               : latencyMs <= 100 ? 14
               : latencyMs <= 150 ? 16
               : latencyMs <= 200 ? 17
               : 18;

  /* Bandwidth savings: 90–95% reduction vs gossipsub */
  const bwReduction          = clamp(90 + (latencyMs - 50) / 200 * 4, 90, 95);
  const monthlyBwBefore      = validators * bwPerNode * bwCostPerGB;
  const monthlySavings       = monthlyBwBefore * (bwReduction / 100);
  const annualBwSavings      = monthlySavings * 12;

  /* Total */
  const totalGain            = extraUSD + annualBwSavings;

  /* Head vote accuracy:
     baseline 98.6%, theoretical max 99.4%, mump2p closes >50% of gap */
  const gap                  = 99.4 - 98.6;                  // 0.8
  const hvaGapClosed         = clamp(0.5 + (latencyMs - 50) / 200 * 0.3, 0.5, 0.8);
  const newHVA               = parseFloat((98.6 + gap * hvaGapClosed).toFixed(2));

  return {
    validators, ethPrice, baseAPR, latencyMs, bwPerNode, bwCostPerGB,
    aprUplift, newAPR, extraETH, extraUSD, mevPct,
    bwReduction, monthlySavings, annualBwSavings, totalGain, newHVA
  };
}

/* ── Render ─────────────────────────────────────────────────── */
function render(r) {
  /* Input display values */
  const ethDisplay = liveEthPrice && !userOverrodePrive ? liveEthPrice : int('eth-price');
  el('val-count-out').textContent = int('val-count').toLocaleString();
  el('base-apr-out').textContent  = num('base-apr').toFixed(1) + '%';
  el('eth-price-out').textContent = '$' + ethDisplay.toLocaleString();
  el('latency-out').textContent   = int('latency') + ' ms';
  el('bw-out').textContent        = int('bandwidth').toLocaleString() + ' GB';
  el('bw-cost-out').textContent   = '$' + num('bw-cost').toFixed(2);

  /* KPI cards */
  el('apr-uplift').textContent   = '+' + r.aprUplift.toFixed(2) + '%';
  el('new-apr').textContent      = r.newAPR.toFixed(2) + '%';
  el('base-apr-kpi').textContent = r.baseAPR.toFixed(1) + '%';
  el('extra-usd').textContent    = fmt(r.extraUSD);
  el('extra-eth').textContent    = r.extraETH.toFixed(2) + ' ETH/yr';
  el('mev-uplift').textContent   = '~' + r.mevPct + '%';
  el('bw-monthly').textContent   = fmt(r.monthlySavings);
  el('bw-pct').textContent       = '~' + Math.round(r.bwReduction) + '% reduction';
  el('bw-annual').textContent    = fmt(r.annualBwSavings);
  el('total-gain').textContent   = fmt(r.totalGain);

  /* APR bar chart */
  const maxAPR = Math.max(r.newAPR, r.baseAPR) * 1.25;
  el('apr-chart').innerHTML = `
    <div class="apr-row">
      <div class="apr-row-label">Without mump2p</div>
      <div class="apr-track">
        <div class="apr-bar apr-bar-base" style="width:${(r.baseAPR / maxAPR * 100).toFixed(1)}%">
          ${r.baseAPR.toFixed(1)}%
        </div>
      </div>
    </div>
    <div class="apr-row">
      <div class="apr-row-label">With mump2p</div>
      <div class="apr-track">
        <div class="apr-bar apr-bar-new" style="width:${(r.newAPR / maxAPR * 100).toFixed(1)}%">
          ${r.newAPR.toFixed(2)}%
        </div>
      </div>
    </div>
  `;

  /* Head vote accuracy */
  el('hva-new-bar').style.width = r.newHVA + '%';
  el('hva-new-val').textContent  = r.newHVA.toFixed(2) + '%';

  /* Insight */
  let insight = '';
  if (r.validators >= 5000) {
    insight = `At <strong>${r.validators.toLocaleString()} validators</strong>, you're running at large institutional scale. A ${r.latencyMs}ms latency improvement could generate roughly <strong>${fmt(r.extraUSD)}</strong> in additional staking revenue annually, plus <strong>${fmt(r.annualBwSavings)}</strong> in bandwidth savings — a combined <strong>${fmt(r.totalGain)}</strong> per year.`;
  } else if (r.validators >= 500) {
    insight = `With <strong>${r.validators.toLocaleString()} validators</strong>, a ${r.latencyMs}ms propagation improvement translates to approximately <strong>${fmt(r.extraUSD)}</strong> more in annual staking revenue. Your bandwidth savings add another <strong>${fmt(r.annualBwSavings)}</strong> per year.`;
  } else if (r.validators >= 50) {
    insight = `For <strong>${r.validators} validators</strong>, mump2p's ${r.latencyMs}ms latency gain adds roughly <strong>${fmt(r.extraUSD)}</strong> in annual APR revenue and cuts bandwidth costs by <strong>${fmt(r.annualBwSavings)}</strong> — meaningful savings for a mid-sized operation.`;
  } else {
    insight = `Solo operators with <strong>${r.validators} validator${r.validators > 1 ? 's' : ''}</strong> benefit most from fewer missed attestations and improved head vote accuracy. A ${r.latencyMs}ms gain adds ~<strong>${fmt(r.extraUSD)}</strong> per year. Every basis point adds up over time.`;
  }
  el('insight-text').innerHTML = insight;
}

/* ── Main update ─────────────────────────────────────────────── */
function update() {
  const r = calculate();
  render(r);
  syncUrlParams(r);
}

/* ── URL sharing ─────────────────────────────────────────────── */
function syncUrlParams(r) {
  const params = new URLSearchParams({
    type:   operatorType,
    vc:     r.validators,
    apr:    r.baseAPR,
    price:  r.ethPrice,
    lat:    r.latencyMs,
    bw:     r.bwPerNode,
    bwc:    r.bwCostPerGB,
  });
  history.replaceState(null, '', '?' + params.toString());
}

function loadUrlParams() {
  const p = new URLSearchParams(location.search);
  if (!p.has('vc')) return;   // nothing to restore

  const type = p.get('type') || 'solo';
  operatorType = type;
  const btn = document.querySelector(`[data-type="${type}"]`);
  if (btn) {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  if (p.has('vc'))    el('val-count').value = clamp(+p.get('vc'), 1, 50000);
  if (p.has('apr'))   el('base-apr').value  = clamp(+p.get('apr'), 2, 8);
  if (p.has('price')) {
    el('eth-price').value = clamp(+p.get('price'), 1000, 10000);
    userOverrodePrive = true;
  }
  if (p.has('lat'))   el('latency').value   = clamp(+p.get('lat'), 50, 250);
  if (p.has('bw'))    el('bandwidth').value  = clamp(+p.get('bw'), 100, 2000);
  if (p.has('bwc'))   el('bw-cost').value    = clamp(+p.get('bwc'), 0.01, 0.30);
}

async function shareResults() {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    el('share-label').textContent = 'Copied!';
    setTimeout(() => { el('share-label').textContent = 'Share'; }, 2000);
  } catch {
    prompt('Copy this link:', url);
  }
}

/* ── Bootstrap ───────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  loadUrlParams();
  update();
  fetchEthPrice();
  // Refresh live price every 60 seconds
  setInterval(() => {
    if (!userOverrodePrive) fetchEthPrice();
  }, 60_000);
});
