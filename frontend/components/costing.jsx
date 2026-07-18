/* Costing page — dedicated tab so the cost columns don't crowd Line Items
   (Sonu, Jul 2026). Shows ONLY the costing view: Period, Item, Pred/Actual
   balance, Pred Cost Min/Avg/Max, Actual Cost and the Cost Δ.

   Rows are the records that HAVE costing — the backend fills the cost columns
   for the ~94 High-Value items only, so every row here is HV.
     Actual Cost = actual closing balance × avg rental rate
     Cost Δ      = Actual Cost − Pred Cost Avg  (actual minus predicted, the
                   same convention as the Error column on Line Items)
   Future months have no actuals yet, so Actual Cost / Cost Δ show "—". */
function CostingPage({ allData }) {
  const [search, setSearch] = React.useState('');
  const [exactItem, setExactItem] = React.useState(null);
  const [period, setPeriod] = React.useState('All');
  const [actionFilter, setActionFilter] = React.useState('All');
  const [closestFilter, setClosestFilter] = React.useState('All'); // All | Min | Avg | Max
  // The backend only costs High-Value items, so HV-only IS the costing view —
  // hence default on. Unticking reveals the remaining items (cost cells blank).
  const [hvOnly, setHvOnly] = React.useState(true);
  const [sortCol, setSortCol] = React.useState('period');
  const [sortDir, setSortDir] = React.useState('desc');
  const [tablePage, setTablePage] = React.useState(0);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const PAGE_SIZE = 20;

  const fmtBal = (v) => v == null ? '—' : (Math.round(v) || 0).toLocaleString('en-US');
  const fmtP = (p) => { const m = String(p || '').match(/^(\d{4})-(\d{2})$/); if (!m) return p || '—'; const ns = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${ns[parseInt(m[2])]} '${m[1].slice(2)}`; };

  // Only costed rows (HV items) + the two derived columns.
  // Base set is every row; the HV Only tick (default on) narrows it to the
  // costed ones. Non-HV rows carry no cost, so their cost cells render "—".
  const rows = React.useMemo(() => (allData || [])
    .map(d => {
      const actualCost = (d.actualClosingBal != null && d.avgCost != null) ? d.actualClosingBal * d.avgCost : null;
      const costDiff = actualCost != null ? actualCost - d.predValueAvg : null;
      // Which predicted cost did the actual land closest to?
      // 0=min, 1=avg, 2=max; -1 when there's no actual yet.
      let closest = -1;
      if (actualCost != null) {
        let bd = Infinity;
        [d.predValueLow, d.predValueAvg, d.predValueHigh].forEach((v, k) => {
          if (v == null) return;
          const dd = Math.abs(actualCost - v);
          if (dd < bd) { bd = dd; closest = k; }
        });
      }
      return { ...d, actualCost, costDiff, closest };
    }), [allData]);

  // Ascending like Line Items — PeriodSelector's ‹ › arrows step oldest→newest
  // and its dropdown lists newest first on its own.
  const periods = React.useMemo(() => [...new Set(rows.map(r => r.period))].sort(), [rows]);
  const options = React.useMemo(() => {
    const seen = new Set(); const out = [];
    rows.forEach(r => {
      if (hvOnly && !r.isHV) return; // suggest only what's actually listed
      const k = r.itemCode || r.description;
      if (!seen.has(k)) { seen.add(k); out.push({ label: r.description || r.itemCode, sub: r.itemCode, code: r.itemCode, isHV: r.isHV }); }
    });
    return out.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  }, [rows, hvOnly]);

  const filtered = React.useMemo(() => {
    let out = rows;
    if (hvOnly) out = out.filter(r => r.isHV);
    if (period !== 'All') out = out.filter(r => r.period === period);
    if (actionFilter !== 'All') out = out.filter(r => r.predictedAction === actionFilter);
    if (closestFilter !== 'All') { const want = { Min: 0, Avg: 1, Max: 2 }[closestFilter]; out = out.filter(r => r.closest === want); }
    if (exactItem) out = out.filter(r => r.itemCode === exactItem);
    else if (search.trim()) { const s = search.trim().toLowerCase(); out = out.filter(r => (((r.description || '') + ' ' + (r.itemCode || '')).toLowerCase().includes(s))); }
    return out;
  }, [rows, hvOnly, period, actionFilter, closestFilter, search, exactItem]);

  // Where do the actuals land? Mirrors Line Items' ✓/✗ direction summary.
  const closeStats = React.useMemo(() => {
    const s = { min: 0, avg: 0, max: 0 };
    filtered.forEach(r => { if (r.closest === 0) s.min++; else if (r.closest === 1) s.avg++; else if (r.closest === 2) s.max++; });
    return s;
  }, [filtered]);

  React.useEffect(() => { setTablePage(0); }, [hvOnly, period, actionFilter, closestFilter, search, exactItem, sortCol, sortDir]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      if (va == null) va = -Infinity; if (vb == null) vb = -Infinity;
      const primary = sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
      if (primary !== 0) return primary;
      // Same value → newest period first, then biggest predicted cost.
      const p = String(b.period || '').localeCompare(String(a.period || ''));
      if (p !== 0) return p;
      return (b.predValueAvg || 0) - (a.predValueAvg || 0);
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const cols = [
    { col: 'period',              label: 'Period',        width: '7%',  align: 'left',  sortable: true },
    { col: 'description',         label: 'Item',          width: '23%', align: 'left',  sortable: true },
    { col: 'predictedClosingBal', label: 'Pred. Bal',     width: '8%',  align: 'right', sortable: true },
    { col: 'actualClosingBal',    label: 'Actual Bal',    width: '8%',  align: 'right', sortable: true },
    { col: 'predValueLow',        label: 'Pred Cost Min', width: '10%', align: 'right', sortable: true, cur: true },
    { col: 'predValueAvg',        label: 'Pred Cost Avg', width: '10%', align: 'right', sortable: true, cur: true },
    { col: 'predValueHigh',       label: 'Pred Cost Max', width: '10%', align: 'right', sortable: true, cur: true },
    { col: 'actualCost',          label: 'Actual Cost',   width: '10%', align: 'right', sortable: true, cur: true },
    { col: 'costDiff',            label: 'Cost Δ',        width: '10%', align: 'right', sortable: true, cur: true },
  ];

  const thStyle = (h) => ({
    padding: '9px 10px', textAlign: h.align, fontSize: 10, fontWeight: 600,
    color: sortCol === h.col ? 'var(--accent)' : 'var(--text-2)',
    cursor: h.sortable ? 'pointer' : 'default', userSelect: 'none',
    textTransform: 'uppercase', letterSpacing: '.05em',
    borderBottom: '2px solid var(--border)', background: '#FAFBFC',
    whiteSpace: 'normal', lineHeight: 1.2, verticalAlign: 'bottom',
    position: 'sticky', top: 0, zIndex: 1,
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, gap: 10 }}>
      {/* Controls — same toolbar style as Line Items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <SearchBox value={search}
          onType={t => { setSearch(t); setExactItem(null); }}
          onPick={o => { setSearch(o.label); setExactItem(o.code); }}
          onClear={() => { setSearch(''); setExactItem(null); }}
          options={options} placeholder="Search item…" width="0 0 240px" />
        {periods.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', borderRadius: 8, padding: '2px 4px 2px 2px' }}>
            <button onClick={() => setPeriod('All')} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)',
              background: period === 'All' ? '#fff' : 'transparent',
              color: period === 'All' ? 'var(--accent)' : 'var(--text-2)',
              boxShadow: period === 'All' ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
              whiteSpace: 'nowrap',
            }}>All periods</button>
            <PeriodSelector
              value={period === 'All' ? periods[periods.length - 1] : period}
              onChange={(p) => setPeriod(p)}
              options={periods}
            />
          </div>
        )}
        {/* Action filter — same as Line Items */}
        <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 8, padding: 2, gap: 2 }}>
          {['All', 'Deliver', 'Return', 'No Change'].map(a => (
            <button key={a} onClick={() => setActionFilter(a)} style={{
              padding: '4px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)',
              background: actionFilter === a ? '#fff' : 'transparent',
              color: actionFilter === a ? (a === 'All' ? 'var(--text)' : a === 'Deliver' ? '#059669' : a === 'Return' ? '#DC2626' : '#D97706') : 'var(--text-2)',
              boxShadow: actionFilter === a ? '0 1px 3px rgba(0,0,0,.12)' : 'none', whiteSpace: 'nowrap',
            }}>{a}</button>
          ))}
        </div>
        {/* Closest-cost filter — Costing's version of Match/Mismatch: which
            predicted cost the actual landed nearest (pairs with the highlight). */}
        <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 8, padding: 2, gap: 2 }}
          title="Rows where the actual cost landed closest to the min / avg / max predicted cost">
          {['All', 'Min', 'Avg', 'Max'].map(c => (
            <button key={c} onClick={() => setClosestFilter(c)} style={{
              padding: '4px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)',
              background: closestFilter === c ? '#fff' : 'transparent',
              color: closestFilter === c ? (c === 'All' ? 'var(--text)' : '#047857') : 'var(--text-2)',
              boxShadow: closestFilter === c ? '0 1px 3px rgba(0,0,0,.12)' : 'none', whiteSpace: 'nowrap',
            }}>{c === 'All' ? 'All' : '≈ ' + c}</button>
          ))}
        </div>
        {/* HV Only — same control as Line Items */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: hvOnly ? 'var(--accent)' : 'var(--text-3)', padding: '5px 10px', border: '1px solid', borderColor: hvOnly ? 'var(--accent)' : 'var(--border)', borderRadius: 6, background: hvOnly ? 'rgba(79,70,229,.06)' : '#fff' }}>
          <input type="checkbox" checked={hvOnly} onChange={e => setHvOnly(e.target.checked)} style={{ accentColor: 'var(--accent)', margin: 0 }} />
          HV Only
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-2)' }}>
          {(closeStats.min + closeStats.avg + closeStats.max) > 0 && (
            <span>closest: <b style={{ color: 'var(--text)' }}>{closeStats.min}</b> min · <b style={{ color: 'var(--text)' }}>{closeStats.avg}</b> avg · <b style={{ color: 'var(--text)' }}>{closeStats.max}</b> max</span>
          )}
          <span>{sorted.length.toLocaleString('en-US')} of {rows.length.toLocaleString('en-US')} rows</span>
          {/* Same ⓘ pattern as the other pages — the explanation lives in a
              popover instead of a permanent line of text. */}
          <button onClick={() => setInfoOpen(o => !o)} title="What is this?" aria-label="What is this?"
            style={{ background: infoOpen ? 'var(--accent-surface)' : 'none', border: '1px solid ' + (infoOpen ? 'var(--accent-border)' : 'var(--border)'), borderRadius: 6, padding: '3px 5px', cursor: 'pointer', color: infoOpen ? 'var(--accent)' : 'var(--text-2)', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'all .12s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { if (!infoOpen) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; } }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </button>
        </div>
      </div>
      {infoOpen && (
        <div style={{ background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', borderRadius: 9, padding: '10px 12px', marginTop: -4, fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
          <b>Actual Cost</b> = actual balance × avg rate. <b>Cost Δ</b> = Actual Cost − Pred Cost Avg. The <span style={{ background: 'rgba(5,150,105,.13)', color: '#047857', fontWeight: 700, padding: '1px 6px', borderRadius: 5 }}>green highlight</span> marks the predicted cost the actual landed closest to — filter those with ≈ Min / ≈ Avg / ≈ Max. Costs exist for High-Value items only, so <b>HV Only</b> is on by default; untick it to list the remaining items (their cost cells stay blank). Future months have no actuals yet, so those columns show “—”.
        </div>
      )}

      {/* Table card */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: '#fff', minHeight: 0 }}>
        <div className="h-scroller" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <table style={{ width: '100%', minWidth: cols.length * 96, borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
            <colgroup>{cols.map(c => <col key={c.col} style={{ width: c.width }} />)}</colgroup>
            <thead>
              <tr>
                {cols.map(h => (
                  <th key={h.col} onClick={() => h.sortable && handleSort(h.col)} style={thStyle(h)}>
                    {h.label}{h.cur && <span style={{ whiteSpace: 'nowrap' }}> (<DirhamSign s="1em" style={{ marginRight: 0, verticalAlign: '-0.12em' }} />)</span>}{h.sortable && (sortCol === h.col
                      ? <span style={{ fontSize: 12, marginLeft: 3, color: 'var(--accent)' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                      : <span style={{ fontSize: 9, marginLeft: 3, color: 'var(--text-3)', opacity: .6 }}>↕</span>)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => {
                // Precomputed on the row (rows memo): which predicted cost the
                // actual landed closest to — that cell gets the green highlight.
                const closest = row.closest;
                return (
                <tr key={(row.itemCode || '') + row.period + i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{fmtP(row.period)}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      {row.isHV && <span style={{ color: 'var(--accent)', fontSize: 10, flexShrink: 0 }}>★</span>}
                      <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.description}>{row.description}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 1 }}>{row.itemCode}</div>
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>{fmtBal(row.predictedClosingBal)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)' }}>{fmtBal(row.actualClosingBal)}</td>
                  {[row.predValueLow, row.predValueAvg, row.predValueHigh, row.actualCost].map((v, k) => (
                    <td key={'c' + k} style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: k === 1 || k === 3 ? 700 : 600, color: v != null ? 'var(--text-2)' : 'var(--text-3)' }}
                      title={v == null ? '' : fmtNum0(v) + ' ' + CURRENCY + (k === closest ? ' · closest to actual' : '')}>
                      {v == null ? '—' : (k === closest
                        ? <span style={{ background: 'rgba(5,150,105,.13)', color: '#047857', fontWeight: 700, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap' }}>{fmtNum0(v)}</span>
                        : fmtNum0(v))}
                    </td>
                  ))}
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: row.costDiff == null ? 'var(--text-3)' : row.costDiff < 0 ? '#DC2626' : '#059669' }}>
                    {row.costDiff == null ? '—' : (row.costDiff > 0 ? '+' : '') + fmtNum0(row.costDiff)}
                  </td>
                </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr><td colSpan={cols.length} style={{ padding: 36, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No costed rows match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination footer — same centered numbered style as Line Items */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderTop: '1px solid var(--border)', background: '#FAFBFC', flexShrink: 0, gap: 8 }}>
          <div style={{ flex: 1, fontSize: 11, color: 'var(--text-3)' }}>
            {sorted.length === 0 ? 'No results' : `${tablePage * PAGE_SIZE + 1}–${Math.min((tablePage + 1) * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <PgBtn label="←" disabled={tablePage === 0} onClick={() => setTablePage(p => p - 1)} />
            {(() => { const btns = []; const start = Math.max(0, Math.min(tablePage - 2, pageCount - 5)); const end = Math.min(pageCount, start + 5); for (let i = start; i < end; i++) btns.push(<PgBtn key={i} label={i + 1} active={i === tablePage} onClick={() => setTablePage(i)} />); return btns; })()}
            <PgBtn label="→" disabled={tablePage >= pageCount - 1} onClick={() => setTablePage(p => p + 1)} />
          </div>
          <div style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CostingPage });
