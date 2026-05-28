/* ============================================================
   Supabase data layer — runs in React so run switching is instant
   (no Streamlit rerun, no iframe reload).  The Python side still
   pre-fetches the latest year for fast first paint; this hook then
   takes over for any subsequent switches.

   Schema reference: forecast_predictions has 18 stored columns; we
   no longer derive Tier / Diff of Actual to Prediction / Difference /
   actual_action / direction_correct / item_mape / months_in_mape /
   bias_correction.  Per-row forecast_mode lets Backtest and Future
   months coexist in one continuous view.
   ============================================================ */
// Top-of-program destructure used here AND in app.jsx — Babel-standalone
// concatenates every <script type="text/babel"> block, so declaring these
// in app.jsx as well would be a "Identifier already declared" SyntaxError.
const { useState, useEffect, useMemo } = React;

const ACTION_THRESHOLD = 0.5;
function classifyAction(delta) {
  if (delta == null) return null;
  if (delta >= ACTION_THRESHOLD) return 'Deliver';
  if (delta <= -ACTION_THRESHOLD) return 'Return';
  return 'No Change';
}
function _num(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function _txt(v) {
  if (v == null) return null;
  return String(v).trim();
}

// Mirror of Python's _supabase_to_records. As of the 2026-05-28 schema
// update every Excel column is stored directly in Supabase, so we just
// map column names through — no more client-side derivation.
function supabaseRowsToRecords(rows) {
  if (!rows || !rows.length) return [];
  return rows.map(r => ({
    itemCode: _txt(r.item_code),
    description: _txt(r.item_description),
    isHV: !!r.is_high_value,
    tier: _txt(r.tier),
    period: _txt(r.year_month),
    prevClosingBal: _num(r.prev_closing_bal),
    predictedClosingBal: _num(r.pred_closing_balance),
    actualClosingBal: _num(r.actual_closing_balance),
    error: _num(r.diff_actual_to_prediction),
    difference: _num(r.difference),
    predictedAction: _txt(r.pred_action),
    actualAction: _txt(r.actual_action),
    directionCorrect: r.direction_correct == null ? null : !!r.direction_correct,
    quantity: _num(r.action_quantity),
    biasCorrection: _num(r.bias_correction_applied),
    ape: _num(r.ape),
    itemMape: _num(r.item_mape),
    mapeMonths: r.months_in_mape == null ? null : Math.round(Number(r.months_in_mape)),
    forecastMode: _txt(r.forecast_mode),
  }));
}

function synthMapeSummary(rows, runMeta) {
  if (!rows || !rows.length) return [];
  const byPeriod = {};
  for (const r of rows) {
    const p = r.year_month;
    if (!byPeriod[p]) byPeriod[p] = { period: p, allMape: [], hvMape: [], items: 0, deliver: 0, ret: 0, mode: r.forecast_mode };
    byPeriod[p].items += 1;
    // Schema as of 2026-05-28: per-row APE lives in column `ape`.
    if (r.ape != null) {
      byPeriod[p].allMape.push(r.ape);
      if (r.is_high_value === 1) byPeriod[p].hvMape.push(r.ape);
    }
    if (r.pred_action === 'Deliver') byPeriod[p].deliver += 1;
    else if (r.pred_action === 'Return') byPeriod[p].ret += 1;
  }
  const tierLabel = (runMeta && runMeta.forecast_mode) || 'Monthly';
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  return Object.values(byPeriod).map(b => ({
    period: b.period,
    model: 'Monthly',
    mapeAll: b.allMape.length ? avg(b.allMape) : null,
    mapeHV: b.hvMape.length ? avg(b.hvMape) : null,
    itemsPredicted: b.items,
    itemsDeliver: b.deliver,
    itemsReturn: b.ret,
    tier: b.mode || tierLabel,
  })).sort((a, b) => a.period.localeCompare(b.period));
}

function formatYearLabel(yearMeta) {
  if (!yearMeta) return 'Supabase';
  const bits = [`Forecast ${yearMeta.year}`];
  if (yearMeta.period_count) bits.push(`${yearMeta.period_count} mo`);
  const modes = Array.isArray(yearMeta.modes) ? [...new Set(yearMeta.modes)] : [];
  if (modes.length) bits.push(modes.sort().join('/'));
  return 'Supabase · ' + bits.join(' · ');
}

function formatSourceLabel(runMeta) {
  if (!runMeta) return 'Supabase';
  const ts = String(runMeta.run_timestamp || '').slice(0, 16).replace('T', ' ');
  const bits = [`Run #${runMeta.id}`];
  if (runMeta.predict_year) bits.push(String(runMeta.predict_year));
  if (runMeta.forecast_mode) bits.push(runMeta.forecast_mode);
  if (ts) bits.push(ts);
  return 'Supabase · ' + bits.join(' · ');
}

/* localStorage cache for years list + per-year predictions. Stale-while-
   revalidate: serve cached values instantly on mount, then refresh in the
   background so the next interaction has fresh data. The cache key includes
   the supabase project URL so swapping creds doesn't read the wrong cache.
   CACHE_NS bumped to v2 when the schema flipped from per-run to per-year
   (and per-row stored columns replaced client-side derivations). */
const CACHE_NS = 'fi.v2';
function _cacheKey(suffix) {
  const url = window.__SUPABASE_URL || 'noenv';
  return `${CACHE_NS}|${url}|${suffix}`;
}
function readCache(suffix) {
  try {
    const raw = localStorage.getItem(_cacheKey(suffix));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function writeCache(suffix, value) {
  try {
    localStorage.setItem(_cacheKey(suffix), JSON.stringify({ ts: Date.now(), value }));
  } catch (e) { /* quota / private mode — ignore */ }
}

// Roll up raw forecast_runs rows into one entry per predict_year so the
// sidebar picker shows "2025 / 2026 / ..." instead of individual runs.
function summariseYears(runs, predictionsByYear) {
  const byYear = {};
  for (const r of runs || []) {
    const y = r.predict_year;
    if (y == null) continue;
    const yi = Number(y);
    if (!byYear[yi]) {
      byYear[yi] = {
        year: yi, run_ids: [], modes: [],
        total_items: 0, hv_item_count: 0,
        avg_mape: null, latest_ts: '', training_years: '',
      };
    }
    const slot = byYear[yi];
    slot.run_ids.push(Number(r.id));
    if (r.forecast_mode) slot.modes.push(r.forecast_mode);
    const ti = Number(r.total_items || 0);
    if (ti > slot.total_items) {
      slot.total_items = ti;
      slot.hv_item_count = Number(r.hv_item_count || 0);
      slot.training_years = r.training_years || '';
    }
    const ts = String(r.run_timestamp || '');
    if (ts > slot.latest_ts) slot.latest_ts = ts;
    if (r.avg_mape != null) slot.avg_mape = Number(r.avg_mape);
  }
  if (predictionsByYear) {
    for (const y in predictionsByYear) {
      if (!byYear[y]) continue;
      const periods = [...new Set((predictionsByYear[y] || []).map(p => p.year_month))].sort();
      byYear[y].period_count = periods.length;
      byYear[y].periods = periods;
      byYear[y].row_count = (predictionsByYear[y] || []).length;
    }
  }
  return Object.values(byYear).sort((a, b) => b.year - a.year);
}

function useSupabaseData() {
  // Initial state hydrated from server-rendered values for fast first paint.
  // If the server didn't provide data (cold deploy, no secrets), fall back
  // to whatever we cached in localStorage from the previous visit.
  const cachedYearsBlob = React.useRef(readCache('years')).current;
  const cachedYearBlob  = React.useRef(readCache('currentYear')).current;
  const initYears       = (window.__YEARS_LIST && window.__YEARS_LIST.length) ? window.__YEARS_LIST : (cachedYearsBlob?.value || []);
  const initYear        = window.__CURRENT_YEAR ?? (cachedYearBlob?.value ?? (initYears[0]?.year ?? null));
  const cachedYearPredBlob = initYear != null ? readCache(`year|${initYear}`) : null;
  const initRecords     = (window.__RAW_DATA && window.__RAW_DATA.length) ? window.__RAW_DATA : (cachedYearPredBlob?.value?.records || []);
  const initMape        = (window.__MAPE_SUMMARY && window.__MAPE_SUMMARY.length) ? window.__MAPE_SUMMARY : (cachedYearPredBlob?.value?.mapeSummary || []);
  const initLabel       = window.__SOURCE_LABEL || cachedYearPredBlob?.value?.sourceLabel || '';

  const [years, setYears] = useState(initYears);
  const [currentYear, setCurrentYear] = useState(initYear);
  const [records, setRecords] = useState(initRecords);
  const [mapeSummary, setMapeSummary] = useState(initMape);
  const [sourceLabel, setSourceLabel] = useState(initLabel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lazy-create the supabase-js client. Returns null if creds aren't set
  // (we'll just keep the server-rendered data in that case).
  const client = React.useMemo(() => {
    const url = window.__SUPABASE_URL;
    const key = window.__SUPABASE_KEY;
    if (!url || !key || !window.supabase) return null;
    try { return window.supabase.createClient(url, key); }
    catch (e) { console.error('supabase client init failed', e); return null; }
  }, []);

  // Paginated fetch for one year's predictions — gathers every row from
  // every run that touches the year. Backtest + Future runs union into a
  // single continuous view via the per-row forecast_mode column.
  const fetchPredictionsForYear = React.useCallback(async (year) => {
    const all = [];
    let offset = 0;
    const PAGE = 1000;
    const lo = `${year}-01`;
    const hi = `${year}-12`;
    while (true) {
      const { data, error: err } = await client
        .from('forecast_predictions')
        .select('*')
        .gte('year_month', lo)
        .lte('year_month', hi)
        .order('year_month')
        .range(offset, offset + PAGE - 1);
      if (err) throw err;
      if (!data || !data.length) break;
      all.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    return all;
  }, [client]);

  const switchYear = React.useCallback(async (year) => {
    if (Number(year) === Number(currentYear)) return;
    if (!client) { setError('Supabase not configured'); return; }
    setError(null);
    // Optimistic hydrate from cache so the dashboard flips instantly when
    // we've already seen this year. Background refresh keeps it fresh.
    const cached = readCache(`year|${year}`);
    if (cached?.value?.records?.length) {
      setRecords(cached.value.records);
      setMapeSummary(cached.value.mapeSummary || []);
      setSourceLabel(cached.value.sourceLabel || `Forecast ${year}`);
      setCurrentYear(Number(year));
      writeCache('currentYear', Number(year));
    } else {
      setLoading(true);
    }
    try {
      const rawRows = await fetchPredictionsForYear(year);
      const recs = supabaseRowsToRecords(rawRows);
      // Synthetic year-meta for the source label + MAPE-summary tier.
      const yearMeta = years.find(y => Number(y.year) === Number(year)) || { year: Number(year) };
      const synthMeta = { ...yearMeta, forecast_mode: (yearMeta.modes || []).sort().join('/') || null };
      const mape = synthMapeSummary(rawRows, synthMeta);
      const label = formatYearLabel({ ...yearMeta, period_count: [...new Set(rawRows.map(r => r.year_month))].length });
      setRecords(recs);
      setMapeSummary(mape);
      setSourceLabel(label);
      setCurrentYear(Number(year));
      writeCache(`year|${year}`, { records: recs, mapeSummary: mape, sourceLabel: label });
      writeCache('currentYear', Number(year));
    } catch (err) {
      console.error('switch year failed', err);
      if (!cached?.value?.records?.length) {
        setError(`Failed to load ${year}: ${err.message || 'unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [client, currentYear, years, fetchPredictionsForYear]);

  // Back-compat shim: old call sites still call switchRun(runId). Translate
  // to the year that run belongs to and switch by year. Avoids breakage if
  // any cached sidebar code in localStorage tries the old API.
  const switchRun = React.useCallback((runId) => {
    const run = (window.__RUNS_LIST || []).find(r => Number(r.id) === Number(runId));
    if (run?.predict_year != null) switchYear(Number(run.predict_year));
  }, [switchYear]);

  // Background refresh on mount: re-fetch the runs list and the current
  // year's predictions so the dashboard stays accurate after a stale
  // hydrate. Runs once per session.
  React.useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: freshRuns, error: rErr } = await client
          .from('forecast_runs').select('*').order('run_timestamp', { ascending: false });
        if (rErr) throw rErr;
        if (cancelled || !freshRuns) return;
        const targetYear = currentYear != null ? Number(currentYear) : Number(summariseYears(freshRuns)[0]?.year);
        if (targetYear == null) return;
        const rawRows = await fetchPredictionsForYear(targetYear);
        if (cancelled) return;
        const periods = [...new Set(rawRows.map(r => r.year_month))].sort();
        const ys = summariseYears(freshRuns, { [targetYear]: rawRows });
        setYears(ys);
        writeCache('years', ys);
        const yearMeta = ys.find(y => Number(y.year) === targetYear) || { year: targetYear };
        const synthMeta = { ...yearMeta, forecast_mode: (yearMeta.modes || []).sort().join('/') || null };
        const recs = supabaseRowsToRecords(rawRows);
        const mape = synthMapeSummary(rawRows, synthMeta);
        const label = formatYearLabel({ ...yearMeta, period_count: periods.length });
        setRecords(recs);
        setMapeSummary(mape);
        setSourceLabel(label);
        if (currentYear == null) {
          setCurrentYear(targetYear);
          writeCache('currentYear', targetYear);
        }
        writeCache(`year|${targetYear}`, { records: recs, mapeSummary: mape, sourceLabel: label });
      } catch (err) {
        console.warn('background refresh failed', err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  // When Streamlit reruns (Excel upload, login, reset), pull fresh values
  // from the injected globals AND mirror them into localStorage so the
  // next page-load can hydrate from cache instantly.
  useEffect(() => {
    const handler = () => {
      const recs = window.__RAW_DATA || [];
      const mape = window.__MAPE_SUMMARY || [];
      const yl   = window.__YEARS_LIST || [];
      const yr   = window.__CURRENT_YEAR ?? null;
      const lbl  = window.__SOURCE_LABEL || '';
      setRecords(recs);
      setMapeSummary(mape);
      setYears(yl);
      setCurrentYear(yr);
      setSourceLabel(lbl);
      if (yl.length) writeCache('years', yl);
      if (yr != null) writeCache('currentYear', yr);
      if (yr != null && recs.length) writeCache(`year|${yr}`, { records: recs, mapeSummary: mape, sourceLabel: lbl });
    };
    window.addEventListener('dataready', handler);
    return () => window.removeEventListener('dataready', handler);
  }, []);

  return { records, mapeSummary, years, currentYear, switchYear, switchRun, loading, error, sourceLabel };
}

// Re-exported on window so other inlined files can use them without
// caring about module ordering. (Babel-standalone compiles each
// <script type="text/babel"> in isolation, so top-level names aren't
// shared across scripts.)
Object.assign(window, {
  supabaseRowsToRecords, synthMapeSummary, formatYearLabel, formatSourceLabel,
  summariseYears, useSupabaseData,
  readCache, writeCache,
  classifyAction,
});
