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
  const [sortCol, setSortCol] = React.useState('period');
  const [sortDir, setSortDir] = React.useState('desc');
  const [tablePage, setTablePage] = React.useState(0);
  const PAGE_SIZE = 20;

  const fmtBal = (v) => v == null ? '—' : (Math.round(v) || 0).toLocaleString('en-US');
  const fmtP = (p) => { const m = String(p || '').match(/^(\d{4})-(\d{2})$/); if (!m) return p || '—'; const ns = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${ns[parseInt(m[2])]} '${m[1].slice(2)}`; };

  // Only costed rows (HV items) + the two derived columns.
  const rows = React.useMemo(() => (allData || [])
    .filter(d => d.predValueAvg != null)
    .map(d => {
      const actualCost = (d.actualClosingBal != null && d.avgCost != null) ? d.actualClosingBal * d.avgCost : null;
      const costDiff = actualCost != null ? actualCost - d.predValueAvg : null;
      return { ...d, actualCost, costDiff };
    }), [allData]);

  const periods = React.useMemo(() => [...new Set(rows.map(r => r.period))].sort().reverse(), [rows]);
  const options = React.useMemo(() => {
    const seen = new Set(); const out = [];
    rows.forEach(r => { const k = r.itemCode || r.description; if (!seen.has(k)) { seen.add(k); out.push({ label: r.description || r.itemCode, sub: r.itemCode, code: r.itemCode, isHV: r.isHV }); } });
    return out.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  }, [rows]);

  const filtered = React.useMemo(() => {
    let out = rows;
    if (period !== 'All') out = out.filter(r => r.period === period);
    if (exactItem) out = out.filter(r => r.itemCode === exactItem);
    else if (search.trim()) { const s = search.trim().toLowerCase(); out = out.filter(r => (((r.description || '') + ' ' + (r.itemCode || '')).toLowerCase().includes(s))); }
    return out;
  }, [rows, period, search, exactItem]);

  React.useEffect(() => { setTablePage(0); }, [period, search, exactItem, sortCol, sortDir]);

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
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <SearchBox value={search}
          onType={t => { setSearch(t); setExactItem(null); }}
          onPick={o => { setSearch(o.label); setExactItem(o.code); }}
          onClear={() => { setSearch(''); setExactItem(null); }}
          options={options} placeholder="Search item…" width="0 0 260px" />
        <select value={period} onChange={e => setPeriod(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)', color: period === 'All' ? 'var(--text-2)' : 'var(--accent)', background: '#fff', outline: 'none', cursor: 'pointer' }}>
          <option value="All">All periods</option>
          {periods.map(p => <option key={p} value={p}>{fmtP(p)}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-2)' }}>{sorted.length.toLocaleString('en-US')} rows · High-Value items only</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, marginTop: -4 }}>
        Actual Cost = actual balance × avg rate · Cost Δ = Actual Cost − Pred Cost Avg. Future months have no actuals yet, so those show “—”.
      </div>

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
              {pageRows.map((row, i) => (
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
                      title={v != null ? fmtNum0(v) + ' ' + CURRENCY : ''}>
                      {v != null ? fmtNum0(v) : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: row.costDiff == null ? 'var(--text-3)' : row.costDiff < 0 ? '#DC2626' : '#059669' }}>
                    {row.costDiff == null ? '—' : (row.costDiff > 0 ? '+' : '') + fmtNum0(row.costDiff)}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={cols.length} style={{ padding: 36, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No costed rows match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {sorted.length === 0 ? '0' : `${tablePage * PAGE_SIZE + 1}–${Math.min((tablePage + 1) * PAGE_SIZE, sorted.length)}`} of {sorted.length.toLocaleString('en-US')}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button disabled={tablePage === 0} onClick={() => setTablePage(p => Math.max(0, p - 1))}
              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', color: tablePage === 0 ? 'var(--text-3)' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: tablePage === 0 ? 'default' : 'pointer', fontFamily: 'var(--font)' }}>‹ Prev</button>
            <span style={{ alignSelf: 'center', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>{tablePage + 1} / {pageCount}</span>
            <button disabled={tablePage >= pageCount - 1} onClick={() => setTablePage(p => Math.min(pageCount - 1, p + 1))}
              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', color: tablePage >= pageCount - 1 ? 'var(--text-3)' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: tablePage >= pageCount - 1 ? 'default' : 'pointer', fontFamily: 'var(--font)' }}>Next ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CostingPage });
