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
    // accuracy
    const mapeVals = item.periods.map(p => p.itemMape).filter(v => v != null);
    const avgMape = mapeVals.length ? mapeVals.reduce((a, b) => a + b, 0) / mapeVals.length : null;
    const dirRows = item.periods.filter(p => p.directionCorrect != null);
    const dirMatch = dirRows.length ? Math.round(dirRows.filter(p => p.directionCorrect).length / dirRows.length * 100) : null;
    return { series, basis, histN: histRows.length, peak, low, avg, latest, delivered, returned, monthAvg, maxMA, peakMonth, seasonIsActual, seasonYears, mix, mixN, mixPct, avgMape, dirMatch };
  }, [item]);

  if (!items.length) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>No item data available.</div>;

  return (
    <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '14px 24px 24px' }} className="h-scroller">
      {/* Item picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Item</span>
        <SearchBox value={search} onType={v => setSearch(v)} onPick={opt => { setSel(opt.code); setSearch(opt.label); }} onClear={() => setSearch('')} options={items} placeholder="Search any item by name or code…" width="0 0 380px" />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Pick an item to see its full demand history.</span>
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14, alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Demand over time</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8 }}>On-site units each month — actual where known (amber), forecast ahead (indigo).</div>
              <ItemForecastCard item={item} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Action mix */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Action mix</div>
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
              </div>
              {/* Accuracy */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Forecast accuracy</div>
                <div style={{ display: 'flex', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono)', lineHeight: 1, color: stats.avgMape == null ? 'var(--text-3)' : stats.avgMape < 30 ? '#059669' : stats.avgMape <= 100 ? '#D97706' : '#DC2626' }}>{stats.avgMape != null ? stats.avgMape.toFixed(1) + '%' : '—'}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600, marginTop: 4 }}>Avg MAPE</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono)', lineHeight: 1, color: stats.dirMatch == null ? 'var(--text-3)' : stats.dirMatch >= 80 ? '#059669' : stats.dirMatch >= 60 ? '#D97706' : '#DC2626' }}>{stats.dirMatch != null ? stats.dirMatch + '%' : '—'}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600, marginTop: 4 }}>Direction match</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>How close the forecast has been for this item across the months with actuals.</div>
              </div>
            </div>
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
