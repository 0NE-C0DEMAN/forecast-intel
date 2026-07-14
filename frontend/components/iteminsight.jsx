/* ============================================================
   Item Insights — per-item historical demand profile.

   Sonu's ask: search an item (e.g. ABJ) and see how its demand has behaved
   over time — peak, average, lowest, which months it peaks, the deliver/return
   mix, and how accurate the forecast has been. All from the per-item monthly
   history we already have (on-site balance + action + accuracy). No LLM, no
   extra data — pure analytics over the existing records.
   ============================================================ */
function ItemInsightPage({ allData }) {
  const MN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MNL = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmtP = p => { if (!p) return ''; const [y, m] = p.split('-'); return MN[parseInt(m)] + ' ' + y; };
  const fmtK = v => v == null ? '—' : (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v).toLocaleString());
  const ac = a => a === 'Deliver' ? '#059669' : a === 'Return' ? '#DC2626' : '#D97706';
  // Largest-remainder rounding so a set of shares totals exactly 100.
  const lr = (counts, n) => {
    const keys = Object.keys(counts);
    if (!n) { const o = {}; keys.forEach(k => o[k] = 0); return o; }
    const arr = keys.map(k => { const raw = counts[k] / n * 100; return { k, f: Math.floor(raw), rem: raw - Math.floor(raw) }; });
    let left = 100 - arr.reduce((s, o) => s + o.f, 0);
    arr.slice().sort((x, y) => y.rem - x.rem).forEach(o => { if (left > 0) { o.f++; left--; } });
    const out = {}; arr.forEach(o => out[o.k] = o.f); return out;
  };

  // Item options for the search box.
  const items = React.useMemo(() => {
    const seen = new Set(), out = [];
    (allData || []).forEach(d => { if (d.itemCode && !seen.has(d.itemCode)) { seen.add(d.itemCode); out.push({ label: d.description || d.itemCode, sub: d.itemCode, code: d.itemCode, isHV: d.isHV }); } });
    return out.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  }, [allData]);

  // No item is pre-selected: the page loads blank and waits for a search, so
  // the user always starts from their own pick rather than a default item.
  const [search, setSearch] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const [thr, setThr] = React.useState(15); // APE threshold for the reliability table (10/15/20%)

  const item = React.useMemo(() => {
    if (!sel) return null;
    const rows = (allData || []).filter(d => d.itemCode === sel).sort((a, b) => a.period < b.period ? -1 : a.period > b.period ? 1 : 0);
    if (!rows.length) return null;
    return { itemCode: sel, description: rows[0].description || sel, isHV: rows[0].isHV, periods: rows };
  }, [sel, allData]);

  // Stats — "demand" = on-site closing balance. Use actuals for the historical
  // truth where available, fall back to predictions for items without actuals.
  const stats = React.useMemo(() => {
    if (!item) return null;
    const series = item.periods.map(p => ({
      period: p.period,
      bal: p.actualClosingBal != null ? p.actualClosingBal : p.predictedClosingBal,
      isActual: p.actualClosingBal != null,
      action: p.actualAction || p.predictedAction,
      // Actual months: real net movement (|close − prev|, 0 if prev unknown).
      // Forecast months: the model's action quantity. Same convention as the
      // app-wide fcQty(), so "total delivered / returned" reflect what actually
      // happened rather than what was predicted.
      qty: p.actualClosingBal != null
        ? (p.prevClosingBal != null ? Math.abs(p.actualClosingBal - p.prevClosingBal) : 0)
        : (p.quantity || 0),
    }));
    const histRows = series.filter(s => s.isActual);
    const basis = histRows.length ? histRows : series;
    const withBal = basis.filter(s => s.bal != null);
    let peak = null, low = null, sum = 0;
    withBal.forEach(s => { if (!peak || s.bal > peak.bal) peak = s; if (!low || s.bal < low.bal) low = s; sum += s.bal; });
    const avg = withBal.length ? sum / withBal.length : null;
    // "Latest" = most recent ACTUAL reading, not the last point in the series.
    // The forecast can run many months out and degrade toward zero at long
    // horizons, so the final forecast point is a misleading "current level".
    // Items with no actuals (brand-new) fall back to their last forecast point.
    const latest = histRows.length ? histRows[histRows.length - 1] : series[series.length - 1];
    const delivered = basis.filter(s => s.action === 'Deliver').reduce((a, s) => a + s.qty, 0);
    const returned = basis.filter(s => s.action === 'Return').reduce((a, s) => a + s.qty, 0);
    // Seasonality — on-site by calendar month, over the ACTUAL history. Each
    // calendar month is averaged across every year that has an actual reading
    // (2026 forecast months are excluded). Coverage isn't uniform across the
    // catalogue: most items have two full years (2024+2025), some only 2025,
    // and brand-new items have no actuals at all — so we track which years feed
    // each bar and state the basis honestly rather than implying "all years".
    const seasonIsActual = histRows.length > 0;
    const byMonth = {};
    basis.forEach(s => {
      if (s.bal == null) return;
      const parts = s.period.split('-'), yy = parts[0], m = parseInt(parts[1]);
      const b = (byMonth[m] = byMonth[m] || { sum: 0, n: 0, years: {} });
      b.sum += s.bal; b.n++; b.years[yy] = true;
    });
    const monthAvg = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1, b = byMonth[m];
      return { m, label: MN[m], avg: b && b.n ? b.sum / b.n : null, yrs: b ? Object.keys(b.years).sort() : [] };
    });
    const maxMA = Math.max(...monthAvg.map(x => x.avg || 0), 1);
    let peakMonth = null; monthAvg.forEach(x => { if (x.avg != null && (!peakMonth || x.avg > peakMonth.avg)) peakMonth = x; });
    const seasonYears = Object.keys(basis.filter(s => s.bal != null).reduce((o, s) => { o[s.period.split('-')[0]] = 1; return o; }, {})).sort();
    // action mix
    const mix = { Deliver: 0, Return: 0, 'No Change': 0 }; basis.forEach(s => { if (mix[s.action] != null) mix[s.action]++; });
    const mixN = basis.length || 1;
    // Percentages via largest-remainder rounding so they total exactly 100.
    const mixPct = (() => {
      const arr = ['Deliver', 'Return', 'No Change'].map(a => { const raw = mix[a] / mixN * 100; return { a, f: Math.floor(raw), rem: raw - Math.floor(raw) }; });
      let left = 100 - arr.reduce((s, o) => s + o.f, 0);
      arr.slice().sort((x, y) => y.rem - x.rem).forEach(o => { if (left > 0) { o.f++; left--; } });
      const out = {}; arr.forEach(o => { out[o.a] = o.f; }); return out;
    })();
    // accuracy — MAPE for an item is the mean of its monthly absolute % errors
    // (APE), taken straight from the monthly APE values rather than blending the
    // per-year item_mape figures. For a single item, average APE == MAPE.
    // Model accuracy is the intuitive inverse, 100 − MAPE (floored at 0).
    const apeVals = item.periods.map(p => p.ape).filter(v => v != null);
    const avgApe = apeVals.length ? apeVals.reduce((a, b) => a + b, 0) / apeVals.length : null;
    const modelAcc = avgApe != null ? Math.max(0, 100 - avgApe) : null;
    const dirRows = item.periods.filter(p => p.directionCorrect != null);
    const dirMatch = dirRows.length ? Math.round(dirRows.filter(p => p.directionCorrect).length / dirRows.length * 100) : null;

    // Predicted-vs-actual action mix, over months that have an actual so both
    // exist — shows whether the model's action distribution matched reality, and
    // how often the predicted action equalled the actual one.
    const cmp = item.periods.filter(p => p.actualClosingBal != null);
    const predCounts = { Deliver: 0, Return: 0, 'No Change': 0 };
    const actCounts = { Deliver: 0, Return: 0, 'No Change': 0 };
    cmp.forEach(p => { if (predCounts[p.predictedAction] != null) predCounts[p.predictedAction]++; if (actCounts[p.actualAction] != null) actCounts[p.actualAction]++; });
    const cmpN = cmp.length;
    const actionMatch = cmpN ? Math.round(cmp.filter(p => p.predictedAction === p.actualAction).length / cmpN * 100) : null;
    const predPct = lr(predCounts, cmpN);
    const actPct = lr(actCounts, cmpN);

    // Month × year reliability matrix — for each calendar month, in each year we
    // have an actual for: was the predicted direction right, and what was the
    // APE? Powers the "how confident for this month" table.
    const matrixYears = Object.keys(item.periods.reduce((o, p) => { o[p.period.split('-')[0]] = 1; return o; }, {})).sort();
    const matrix = {};
    item.periods.forEach(p => {
      const parts = p.period.split('-'), y = parts[0], m = parseInt(parts[1]);
      (matrix[m] = matrix[m] || {})[y] = {
        hasActual: p.actualClosingBal != null,
        dir: p.directionCorrect == null ? null : !!p.directionCorrect,
        ape: p.ape == null ? null : p.ape,        // this month's error
        mape: p.itemMape == null ? null : p.itemMape, // the item's overall error that year
      };
    });

    // ---- Next month's outlook + how much to trust it -------------------
    // "coming" = the first forecast month after the latest actual. Confidence
    // is read from the recent track record (last 6 actual months) and how the
    // model did for that same calendar month in prior years.
    const pAsc = item.periods;
    const actualRows = pAsc.filter(p => p.actualClosingBal != null);
    const futureRows = pAsc.filter(p => p.actualClosingBal == null);
    const lastActualP = actualRows.length ? actualRows[actualRows.length - 1].period : null;
    const coming = futureRows.find(p => !lastActualP || p.period > lastActualP) || futureRows[0] || null;

    const last6 = actualRows.slice(-6);
    const r6ape = last6.map(p => p.ape).filter(v => v != null);
    const r6dir = last6.filter(p => p.directionCorrect != null);
    const recent6 = {
      n: last6.length,
      ape: r6ape.length ? r6ape.reduce((a, b) => a + b, 0) / r6ape.length : null,
      dirN: r6dir.length,
      dirHits: r6dir.filter(p => p.directionCorrect).length,
    };

    let sameMonth = null;
    if (coming) {
      const cm = parseInt(coming.period.split('-')[1]);
      const cells = matrix[cm] ? Object.values(matrix[cm]).filter(c => c.hasActual) : [];
      const dc = cells.filter(c => c.dir != null);
      const apc = cells.filter(c => c.ape != null);
      sameMonth = {
        m: cm,
        dirN: dc.length,
        dirHits: dc.filter(c => c.dir).length,
        ape: apc.length ? apc.reduce((a, c) => a + c.ape, 0) / apc.length : null,
      };
    }

    let confidence = null;
    if (coming) {
      const dirRates = [];
      if (recent6.dirN) dirRates.push(recent6.dirHits / recent6.dirN);
      if (sameMonth && sameMonth.dirN) dirRates.push(sameMonth.dirHits / sameMonth.dirN);
      const dirScore = dirRates.length ? dirRates.reduce((a, b) => a + b, 0) / dirRates.length : null;
      const apeArr = [recent6.ape, sameMonth && sameMonth.ape].filter(v => v != null);
      const apeScore = apeArr.length ? apeArr.reduce((a, b) => a + b, 0) / apeArr.length : null;
      if (dirScore != null || apeScore != null) {
        const dirGood = dirScore != null && dirScore >= 0.6;
        const dirOk = dirScore != null && dirScore >= 0.4;
        const apeGood = apeScore != null && apeScore <= 15;
        const apeOk = apeScore != null && apeScore <= 30;
        let level = 'Low';
        if ((dirGood && apeOk) || (apeGood && dirGood)) level = 'High';
        else if (dirOk || apeOk) level = 'Medium';
        let note;
        if (apeScore != null && apeScore <= 20 && dirScore != null && dirScore < 0.5)
          note = 'Forecast sizes have been close, but the up/down direction is often wrong — trust the quantity more than the direction.';
        else if (dirScore != null && dirScore >= 0.6 && apeScore != null && apeScore <= 20)
          note = 'Both the size and the direction have held up for this item.';
        else if ((dirScore == null || dirScore < 0.5) && (apeScore == null || apeScore > 30))
          note = 'Recent forecasts for this item have been off — treat this prediction with caution.';
        else
          note = 'Mixed track record — use this as a guide, not a guarantee.';
        confidence = { level, dirScore, apeScore, note };
      }
    }

    return { series, basis, histN: histRows.length, peak, low, avg, latest, delivered, returned, monthAvg, maxMA, peakMonth, seasonIsActual, seasonYears, mix, mixN, mixPct, avgApe, modelAcc, dirMatch, predPct, actPct, actionMatch, cmpN, matrix, matrixYears, coming, recent6, sameMonth, confidence };
  }, [item]);

  if (!items.length) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>No item data available.</div>;

  return (
    <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '14px 24px 24px' }} className="h-scroller">
      {/* Item picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Item</span>
        <SearchBox value={search} onType={v => setSearch(v)} onPick={opt => { setSel(opt.code); setSearch(opt.label); }} onClear={() => { setSearch(''); setSel(null); }} options={items} placeholder="Search any item by name or code…" width="0 0 380px" />
        {sel ? (
          <button onClick={() => { setSel(null); setSearch(''); }}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', background: '#fff', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--text-2)'; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12"></path></svg>
            Clear
          </button>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Pick an item to see its full demand history.</span>
        )}
      </div>

      {item && stats ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{item.description}</h2>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{item.itemCode}</span>
            {item.isHV && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-surface)', padding: '2px 9px', borderRadius: 20 }}>★ High value</span>}
            <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{stats.series.length} months tracked · {stats.histN} with actuals</span>
            {stats.histN === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', padding: '2px 9px', borderRadius: 20 }}>Forecast basis · no actuals yet</span>}
          </div>

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Peak on-site', value: fmtK(stats.peak ? stats.peak.bal : null), sub: stats.peak ? fmtP(stats.peak.period) : '', color: 'var(--accent)' },
              { label: 'Average', value: fmtK(stats.avg), sub: 'units per month', color: 'var(--text)' },
              { label: 'Lowest', value: fmtK(stats.low ? stats.low.bal : null), sub: stats.low ? fmtP(stats.low.period) : '', color: 'var(--text)' },
              { label: 'Latest', value: fmtK(stats.latest ? stats.latest.bal : null), sub: stats.latest ? (fmtP(stats.latest.period) + (stats.latest.isActual ? '' : ' · forecast')) : '', color: 'var(--text)' },
              { label: 'Total delivered', value: fmtK(stats.delivered), sub: 'units out', color: '#059669' },
              { label: 'Total returned', value: fmtK(stats.returned), sub: 'units back', color: '#DC2626' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)', color: c.color, lineHeight: 1.1 }}>{c.value}</div>
                <div style={{ fontSize: 9, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 4 }}>{c.label}</div>
                <div style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 1 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Demand chart + side panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14, alignItems: 'stretch' }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Demand over time</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8 }}>On-site units each month — actual where known (amber), forecast ahead (indigo).</div>
              <ItemForecastCard item={item} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Action mix — predicted vs actual */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Action mix{stats.cmpN > 0 ? ' · predicted vs actual' : ''}</div>
                {stats.cmpN > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 14, marginBottom: 7 }}>
                      <span></span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right', minWidth: 34 }}>Pred</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right', minWidth: 34 }}>Actual</span>
                    </div>
                    {['Deliver', 'Return', 'No Change'].map(a => (
                      <div key={a} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 14, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-2)' }}>
                          <span style={{ width: 9, height: 9, borderRadius: 2, background: ac(a), flexShrink: 0 }}></span>{a}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)', textAlign: 'right', minWidth: 34 }}>{stats.predPct[a]}%</span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: ac(a), textAlign: 'right', minWidth: 34 }}>{stats.actPct[a]}%</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>Predicted action matched the actual action in <b style={{ color: stats.actionMatch >= 60 ? '#059669' : stats.actionMatch >= 40 ? '#D97706' : '#DC2626' }}>{stats.actionMatch}%</b> of months.</div>
                  </>
                ) : (
                  <>
                    {['Deliver', 'Return', 'No Change'].map(a => {
                      const pct = stats.mixPct[a];
                      return (
                        <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 2, background: ac(a), flexShrink: 0 }}></span>
                          <span style={{ fontSize: 11, color: 'var(--text-2)', minWidth: 62 }}>{a}</span>
                          <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden', minWidth: 20 }}><div style={{ height: '100%', width: pct + '%', background: ac(a), borderRadius: 3 }}></div></div>
                          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text-2)', flexShrink: 0 }}>{pct}%</span>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>Forecast only — no actuals yet to compare against.</div>
                  </>
                )}
              </div>
              {/* Forecast accuracy */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Forecast accuracy</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
                  {[
                    { v: stats.avgApe, label: 'Avg MAPE', kind: 'err' },
                    { v: stats.avgApe, label: 'Avg APE', kind: 'err' },
                    { v: stats.modelAcc, label: 'Model accuracy', kind: 'acc' },
                    { v: stats.dirMatch, label: 'Direction match', kind: 'dir' },
                  ].map(c => {
                    const col = c.v == null ? 'var(--text-3)'
                      : c.kind === 'err' ? (c.v < 30 ? '#059669' : c.v <= 100 ? '#D97706' : '#DC2626')
                      : c.kind === 'acc' ? (c.v >= 80 ? '#059669' : c.v >= 50 ? '#D97706' : '#DC2626')
                      : (c.v >= 80 ? '#059669' : c.v >= 60 ? '#D97706' : '#DC2626');
                    const txt = c.v == null ? '—' : (c.kind === 'dir' ? Math.round(c.v) + '%' : c.v.toFixed(1) + '%');
                    return (
                      <div key={c.label}>
                        <div style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--mono)', lineHeight: 1, color: col }}>{txt}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600, marginTop: 4 }}>{c.label}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>Error (MAPE / APE) against model accuracy (100 - MAPE), plus how often the predicted direction was right — across the months with actuals.</div>
              </div>
            </div>
          </div>

          {/* Next month's outlook + confidence */}
          {stats.coming && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Next month's outlook</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 14 }}>What the model expects next, and how much to trust it — based on its recent months and how it has done for this month in prior years.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18, alignItems: 'center' }}>
                <div style={{ borderRight: '1px solid var(--border)', paddingRight: 18 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{fmtP(stats.coming.period)} · forecast</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--accent)', lineHeight: 1.1, marginTop: 4 }}>{fmtK(stats.coming.predictedClosingBal)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>units on-site expected</div>
                  {stats.coming.predictedAction && (
                    <span style={{ display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 700, color: ac(stats.coming.predictedAction), background: stats.coming.predictedAction === 'Deliver' ? 'rgba(5,150,105,.08)' : stats.coming.predictedAction === 'Return' ? 'rgba(220,38,38,.07)' : 'rgba(217,119,6,.08)', padding: '3px 11px', borderRadius: 20 }}>{stats.coming.predictedAction}{stats.coming.quantity != null ? ' · ' + fmtK(stats.coming.quantity) : ''}</span>
                  )}
                  {stats.coming.predValueAvg != null && (
                    <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px dashed var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Est. rental value</div>
                      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)', lineHeight: 1.15, marginTop: 3 }}><DirhamSign />{fmtNum0(stats.coming.predValueAvg)}</div>
                      {/* Low–high value range only; per-unit rates stay internal (ML-side). */}
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{fmtNum0(stats.coming.predValueLow)} – {fmtNum0(stats.coming.predValueHigh)}</div>
                    </div>
                  )}
                </div>
                <div>
                  {stats.confidence ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>Confidence</span>
                        <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', padding: '3px 12px', borderRadius: 20,
                          color: stats.confidence.level === 'High' ? '#047857' : stats.confidence.level === 'Medium' ? '#B45309' : '#B91C1C',
                          background: stats.confidence.level === 'High' ? 'rgba(5,150,105,.10)' : stats.confidence.level === 'Medium' ? 'rgba(217,119,6,.10)' : 'rgba(220,38,38,.08)' }}>{stats.confidence.level}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ color: 'var(--text-2)' }}>Last {stats.recent6.n} month{stats.recent6.n === 1 ? '' : 's'}</span>
                          <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{stats.recent6.dirN ? stats.recent6.dirHits + '/' + stats.recent6.dirN + ' direction' : '—'}{stats.recent6.ape != null ? ' · ' + Math.round(stats.recent6.ape) + '% APE' : ''}</span>
                        </div>
                        {stats.sameMonth && stats.sameMonth.dirN > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ color: 'var(--text-2)' }}>{MNL[stats.sameMonth.m]}, prior years</span>
                            <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{stats.sameMonth.dirHits + '/' + stats.sameMonth.dirN + ' direction'}{stats.sameMonth.ape != null ? ' · ' + Math.round(stats.sameMonth.ape) + '% APE' : ''}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 11, lineHeight: 1.5 }}>{stats.confidence.note}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>Not enough actual history yet to judge how reliable this forecast is. A confidence read will appear here once a few months of actuals are in.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Monthly reliability — how often the forecast was right per month, across years */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 2 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Monthly reliability · how much to trust each month</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, maxWidth: 820 }}>How reliable the forecast has been for each calendar month, across all the years with data: the share of years the <b style={{ color: 'var(--text-2)' }}>direction</b> was right, the month's <b style={{ color: 'var(--text-2)' }}>APE</b> was within the threshold, and the year's overall <b style={{ color: 'var(--text-2)' }}>MAPE</b> was within it. Greener is more reliable — hover any tile for the year-by-year detail.</div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Threshold</span>
                <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
                  {[10, 15, 20].map(t => (
                    <button key={t} onClick={() => setThr(t)}
                      style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', padding: '4px 10px', border: 'none', cursor: 'pointer', background: thr === t ? 'var(--accent)' : '#fff', color: thr === t ? '#fff' : 'var(--text-2)' }}>{t}%</button>
                  ))}
                </div>
              </div>
            </div>
            {(() => {
              const monthsWithData = Object.keys(stats.matrix).map(Number).filter(m => stats.matrixYears.some(y => stats.matrix[m][y] && stats.matrix[m][y].hasActual));
              if (!monthsWithData.length) return <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '18px 0' }}>No completed months yet — reliability needs at least one month with an actual.</div>;
              const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
              const metrics = [
                { label: 'Direction', has: c => c.dir != null, pass: c => c.dir === true, yr: c => c.dir == null ? '?' : (c.dir ? '✓' : '✗') },
                { label: 'APE ≤' + thr + '%', has: c => c.ape != null, pass: c => c.ape <= thr, yr: c => c.ape == null ? '?' : Math.round(c.ape) + '%' },
                { label: 'MAPE ≤' + thr + '%', has: c => c.mape != null, pass: c => c.mape <= thr, yr: c => c.mape == null ? '?' : Math.round(c.mape) + '%' },
              ];
              const tintOf = r => r == null ? { bg: '#F3F4F6', fg: '#9CA3AF' }
                : r >= 0.8 ? { bg: '#E7F6EF', fg: '#047857' }
                : r >= 0.5 ? { bg: '#FBF0E1', fg: '#B45309' }
                : { bg: '#FBE7E7', fg: '#B91C1C' };
              const gridCols = '108px repeat(12, minmax(0, 1fr))';
              const tile = { borderRadius: 6, padding: '9px 2px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, lineHeight: 1.1 };
              return (
                <div className="h-scroller" style={{ marginTop: 12 }}>
                  <div style={{ minWidth: 640 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, marginBottom: 4 }}>
                      <div></div>
                      {allMonths.map(m => <div key={m} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.02em' }}>{MN[m]}</div>)}
                    </div>
                    {metrics.map(metric => (
                      <div key={metric.label} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, marginBottom: 4, alignItems: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{metric.label}</div>
                        {allMonths.map(m => {
                          const yc = stats.matrixYears.map(y => ({ y, c: stats.matrix[m] && stats.matrix[m][y] })).filter(o => o.c && o.c.hasActual && metric.has(o.c));
                          const n = yc.length;
                          const hits = yc.filter(o => metric.pass(o.c)).length;
                          const t = tintOf(n ? hits / n : null);
                          const detail = yc.map(o => o.y + ' ' + metric.yr(o.c)).join('   ');
                          const tip = MN[m] + ' · ' + metric.label + (n ? '  (' + hits + '/' + n + ')' + (detail ? '  —  ' + detail : '') : '  —  no actual yet');
                          return <div key={m} title={tip} style={{ ...tile, background: t.bg, color: t.fg }}>{n ? hits + '/' + n : '–'}</div>;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.5 }}>Each tile shows how many years passed out of those with data (e.g. 2/2), shaded green (mostly passed) through red (mostly missed); grey "–" means no actual recorded for that month yet. The years are summarised into one score per month, so the grid stays the same size whether the item has 2 years of history or 20. Hover a tile for the per-year breakdown.</div>
          </div>

          {/* Seasonality */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Seasonality · on-site by calendar month</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 20 }}>
                {!stats.seasonIsActual ? 'forecast basis' : stats.seasonYears.length >= 2 ? `avg of ${stats.seasonYears[0]}–${stats.seasonYears[stats.seasonYears.length - 1]}` : `${stats.seasonYears[0] || ''} only`}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 12 }}>
              {stats.peakMonth ? `Demand for this item is highest in ${MNL[stats.peakMonth.m]}. ` : ''}
              {!stats.seasonIsActual
                ? 'Based on the forecast — this item has no actuals recorded yet.'
                : stats.seasonYears.length >= 2
                  ? `Each bar averages that month across ${stats.seasonYears[0]}–${stats.seasonYears[stats.seasonYears.length - 1]} actuals.`
                  : `Based on ${stats.seasonYears[0]} actuals only — not enough history yet to average across years.`}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
              {stats.monthAvg.map(x => {
                const h = x.avg != null ? Math.max(x.avg / stats.maxMA * 100, 2) : 0;
                const isPeak = stats.peakMonth && x.m === stats.peakMonth.m;
                const tip = x.avg == null
                  ? x.label + ': no data'
                  : x.label + ': ' + fmtK(x.avg) + (stats.seasonIsActual ? (x.yrs.length ? ' · ' + x.yrs.join(', ') : '') : ' · forecast');
                return (
                  <div key={x.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: 'var(--text-3)', marginBottom: 2, whiteSpace: 'nowrap' }}>{x.avg != null ? fmtK(x.avg) : ''}</div>
                    <div title={tip} style={{ width: '68%', height: h + '%', minHeight: x.avg != null ? 2 : 0, background: isPeak ? 'var(--accent)' : '#C7D2FE', borderRadius: '3px 3px 0 0', transition: 'height .15s' }}></div>
                    <div style={{ fontSize: 9, color: isPeak ? 'var(--text)' : 'var(--text-3)', fontWeight: isPeak ? 700 : 400, marginTop: 5 }}>{x.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '72px 24px 80px', color: 'var(--text-3)' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.45, marginBottom: 14 }}>
            <circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.35-4.35"></path>
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Search for an item to begin</div>
          <div style={{ fontSize: 12, maxWidth: 430, lineHeight: 1.5 }}>Type a name or code in the box above to see its demand history, peak and seasonality, action mix, and forecast accuracy.</div>
        </div>
      )}
    </div>
  );
}
window.ItemInsightPage = ItemInsightPage;
