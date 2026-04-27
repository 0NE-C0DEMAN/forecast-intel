/* Item Explorer v2 — per-item rows, cohort tabs, period scope, rich detail panel */

function ItemExplorerPage({ allData, period }) {
  const [search, setSearch] = React.useState('');
  const [hvFilter, setHvFilter] = React.useState('All');
  const [cohort, setCohort] = React.useState('all');
  const [scope, setScope] = React.useState('all'); // 'all' | 'last12' | 'last6' | 'last3' | 'single'
  const [singlePeriod, setSinglePeriod] = React.useState(period);
  const [sortCol, setSortCol] = React.useState('totalQty');
  const [sortDir, setSortDir] = React.useState('desc');
  const [selectedCode, setSelectedCode] = React.useState(null);
  const [page, setPage] = React.useState(0);
  const PAGE_SIZE = 18;

  React.useEffect(() => { setSinglePeriod(period); }, [period]);
  React.useEffect(() => { setPage(0); }, [search, hvFilter, cohort, scope, singlePeriod, sortCol, sortDir]);

  const allPeriods = React.useMemo(() => [...new Set(allData.map(d => d.period))].sort(), [allData]);

  // Determine periods in scope
  const scopedPeriods = React.useMemo(() => {
    if (scope === 'all') return allPeriods;
    if (scope === 'last12') return allPeriods.slice(-12);
    if (scope === 'last6') return allPeriods.slice(-6);
    if (scope === 'last3') return allPeriods.slice(-3);
    if (scope === 'single') return [singlePeriod];
    return allPeriods;
  }, [scope, allPeriods, singlePeriod]);

  // Per-item aggregation: ALWAYS computed against full history for stable cohort assignment,
  // but stats use the scoped window
  const itemSummaries = React.useMemo(() => {
    const byItem = {};
    allData.forEach(d => {
      const k = d.itemCode;
      if (!byItem[k]) byItem[k] = { itemCode: k, description: d.description, isHV: d.isHV, all: [] };
      byItem[k].all.push(d);
    });
    Object.values(byItem).forEach(it => it.all.sort((a, b) => a.period.localeCompare(b.period)));

    return Object.values(byItem).map(it => {
      const inScope = it.all.filter(d => scopedPeriods.includes(d.period));
      const last = it.all[it.all.length - 1];
      // Cohort window: last 6 periods (or all if <6)
      const cWin = it.all.slice(-6);
      const acts = cWin.map(d => d.predictedAction);
      const flips = acts.reduce((s, a, i) => s + (i > 0 && a !== acts[i-1] ? 1 : 0), 0);
      const delPct = acts.filter(a => a === 'Deliver').length / Math.max(acts.length, 1);
      const retPct = acts.filter(a => a === 'Return').length / Math.max(acts.length, 1);
      const ncPct = acts.filter(a => a === 'No Change').length / Math.max(acts.length, 1);
      // Recent quantity activity
      const recentQty = it.all.slice(-3).reduce((s, d) => s + (d.quantity || 0), 0);
      // Determine cohort
      let cohortTag = 'mixed';
      if (last && last.predictedClosingBal != null && last.predictedClosingBal <= 0) cohortTag = 'atRisk';
      else if (recentQty === 0 && it.all.length >= 3) cohortTag = 'dormant';
      else if (delPct >= 0.8) cohortTag = 'alwaysDeliver';
      else if (retPct >= 0.8) cohortTag = 'alwaysReturn';
      else if (flips >= 4) cohortTag = 'volatile';
      else if (flips === 0 && ncPct >= 0.8) cohortTag = 'stable';
      else if (flips <= 1) cohortTag = 'stable';

      // Scoped stats
      const totalQty = inScope.reduce((s, d) => s + (d.quantity || 0), 0);
      const scopedActs = inScope.map(d => d.predictedAction);
      const scopedFlips = scopedActs.reduce((s, a, i) => s + (i > 0 && a !== scopedActs[i-1] ? 1 : 0), 0);
      // Streak: count of last consecutive same action in scope
      let streak = 0, streakAction = null;
      if (inScope.length > 0) {
        const lastA = inScope[inScope.length - 1].predictedAction;
        streakAction = lastA;
        for (let i = inScope.length - 1; i >= 0; i--) {
          if (inScope[i].predictedAction === lastA) streak++; else break;
        }
      }
      // Volatility: flips per period
      const volatility = inScope.length > 1 ? scopedFlips / (inScope.length - 1) : 0;
      // Predominant action
      const counts = { Deliver: 0, Return: 0, 'No Change': 0 };
      inScope.forEach(d => { if (counts[d.predictedAction] != null) counts[d.predictedAction]++; });
      const predominant = inScope.length > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : null;
      // ABC class based on totalQty across full history
      const fullTotal = it.all.reduce((s, d) => s + (d.quantity || 0), 0);

      return {
        itemCode: it.itemCode,
        description: it.description,
        isHV: it.isHV,
        cohort: cohortTag,
        latestAction: last?.predictedAction,
        latestBal: last?.predictedClosingBal,
        latestDiff: last?.difference,
        totalQty,
        streak,
        streakAction,
        volatility,
        predominant,
        scopedCount: inScope.length,
        fullTotal,
        all: it.all,
        inScope,
      };
    });
  }, [allData, scopedPeriods]);

  // ABC class assignment: computed once over full history
  const abcByCode = React.useMemo(() => {
    const sorted = [...itemSummaries].sort((a, b) => b.fullTotal - a.fullTotal);
    const total = sorted.reduce((s, x) => s + x.fullTotal, 0) || 1;
    let cum = 0; const map = {};
    sorted.forEach(it => { cum += it.fullTotal; const cumPct = cum / total; map[it.itemCode] = cumPct <= 0.8 ? 'A' : cumPct <= 0.95 ? 'B' : 'C'; });
    return map;
  }, [itemSummaries]);

  const filtered = React.useMemo(() => {
    let rows = itemSummaries;
    if (search) { const s = search.toLowerCase(); rows = rows.filter(d => d.description.toLowerCase().includes(s) || d.itemCode.toLowerCase().includes(s)); }
    if (hvFilter === 'HV') rows = rows.filter(d => d.isHV);
    else if (hvFilter === 'Standard') rows = rows.filter(d => !d.isHV);
    if (cohort !== 'all') rows = rows.filter(d => d.cohort === cohort);
    return rows;
  }, [itemSummaries, search, hvFilter, cohort]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      if (va == null) va = -Infinity; if (vb == null) vb = -Infinity;
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Cohort counts for tabs
  const cohortCounts = React.useMemo(() => {
    const c = { all: itemSummaries.length, alwaysDeliver: 0, alwaysReturn: 0, volatile: 0, stable: 0, atRisk: 0, dormant: 0, mixed: 0 };
    itemSummaries.forEach(it => { c[it.cohort]++; });
    return c;
  }, [itemSummaries]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const ac = (a) => a === 'Deliver' ? '#059669' : a === 'Return' ? '#DC2626' : '#D97706';
  const abg = (a) => a === 'Deliver' ? 'rgba(5,150,105,.08)' : a === 'Return' ? 'rgba(220,38,38,.07)' : 'rgba(217,119,6,.08)';
  const fmt = (v) => { if (v == null) return '—'; if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 }); return v; };

  const totalQty = filtered.reduce((s, d) => s + (d.totalQty || 0), 0);
  const hvCount = filtered.filter(d => d.isHV).length;

  const selectedItem = React.useMemo(() => sorted.find(it => it.itemCode === selectedCode) || itemSummaries.find(it => it.itemCode === selectedCode), [selectedCode, sorted, itemSummaries]);

  const cohorts = [
    { id: 'all', label: 'All Items', color: 'var(--text-2)' },
    { id: 'atRisk', label: 'At Risk', color: '#DC2626' },
    { id: 'volatile', label: 'Volatile', color: '#D97706' },
    { id: 'alwaysDeliver', label: 'Always Deliver', color: '#059669' },
    { id: 'alwaysReturn', label: 'Always Return', color: '#DC2626' },
    { id: 'stable', label: 'Stable', color: 'var(--accent)' },
    { id: 'dormant', label: 'Dormant', color: 'var(--text-3)' },
    { id: 'mixed', label: 'Mixed', color: 'var(--text-3)' },
  ];

  const thStyle = (col, align) => ({
    padding: '8px 10px', textAlign: align || 'left', fontSize: 10, fontWeight: 600,
    color: sortCol === col ? 'var(--accent)' : 'var(--text-3)',
    cursor: col ? 'pointer' : 'default', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '.05em',
    borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, background: '#FAFBFC',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '14px 24px 0' }}>
      {/* Top: search + KPIs */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: '0 0 320px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code or description…"
            style={{ width: '100%', padding: '8px 12px 8px 34px', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <svg style={{ position: 'absolute', left: 11, top: 9, color: 'var(--text-3)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <MiniStat label="Items" value={filtered.length} color="var(--accent)" />
          <MiniStat label="High Value" value={hvCount} color="var(--accent)" pct={Math.round(hvCount/Math.max(filtered.length,1)*100)} />
          <MiniStat label="Total Qty" value={Math.round(totalQty).toLocaleString()} color="var(--text-2)" />
          <MiniStat label="Periods in Scope" value={scopedPeriods.length} color="var(--text-2)" />
        </div>
      </div>

      {/* Cohort tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexShrink: 0, alignItems: 'center', overflowX: 'auto' }}>
        {cohorts.map(c => (
          <button key={c.id} onClick={() => setCohort(c.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7,
            border: '1px solid', borderColor: cohort === c.id ? c.color : 'var(--border)',
            background: cohort === c.id ? c.color + '12' : '#fff', color: cohort === c.id ? c.color : 'var(--text-2)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{c.label}<span style={{ fontSize: 10, fontFamily: 'var(--mono)', opacity: .7, fontWeight: 700 }}>{cohortCounts[c.id]}</span></button>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <FilterGroup label="Scope">
          <ScopePicker value={scope} onChange={setScope} singlePeriod={singlePeriod} onSinglePeriodChange={setSinglePeriod} allPeriods={allPeriods} totalPeriods={allPeriods.length} />
        </FilterGroup>
        <FilterGroup label="Type">{['All', 'HV', 'Standard'].map(o => (
          <button key={o} onClick={() => setHvFilter(o)} style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
            border: '1px solid', borderColor: hvFilter === o ? 'var(--accent)' : 'var(--border)',
            background: hvFilter === o ? 'rgba(79,70,229,.06)' : 'transparent',
            color: hvFilter === o ? 'var(--accent)' : 'var(--text-3)',
          }}>{o === 'HV' ? 'High Value' : o}</button>
        ))}</FilterGroup>
        {(cohort !== 'all' || hvFilter !== 'All' || search) && (
          <button onClick={() => { setCohort('all'); setHvFilter('All'); setSearch(''); }} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-3)', marginLeft: 'auto' }}>Clear filters</button>
        )}
      </div>

      {/* Body: table + side panel */}
      <div style={{ flex: 1, display: 'flex', gap: 12, overflow: 'hidden', paddingBottom: 14 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle('itemCode'), width: 70 }} onClick={() => handleSort('itemCode')}>Code</th>
                  <th style={{ ...thStyle('description'), minWidth: 160 }} onClick={() => handleSort('description')}>Description</th>
                  <th style={thStyle('cohort')} onClick={() => handleSort('cohort')}>Cohort</th>
                  <th style={thStyle()}>ABC</th>
                  <th style={thStyle('latestAction')} onClick={() => handleSort('latestAction')}>Latest</th>
                  <th style={{ ...thStyle('latestBal', 'right') }} onClick={() => handleSort('latestBal')}>Pred Bal</th>
                  <th style={thStyle()}>Streak</th>
                  <th style={{ ...thStyle('totalQty', 'right') }} onClick={() => handleSort('totalQty')}>Qty in Scope</th>
                  <th style={{ ...thStyle('volatility', 'right') }} onClick={() => handleSort('volatility')}>Volatility</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => {
                  const isSel = selectedCode === row.itemCode;
                  const cohortMeta = cohorts.find(c => c.id === row.cohort);
                  return (
                    <tr key={row.itemCode} onClick={() => setSelectedCode(isSel ? null : row.itemCode)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #F3F4F6', background: isSel ? 'rgba(79,70,229,.05)' : 'transparent' }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#FAFBFC'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(79,70,229,.05)' : 'transparent'; }}>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)' }}>{row.itemCode}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 450, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.isHV && <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 4 }}>★</span>}
                        {row.description}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: cohortMeta?.color, background: (cohortMeta?.color || '#888') + '14' }}>{cohortMeta?.label}</span>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        {(() => { const cls = abcByCode[row.itemCode]; const col = cls === 'A' ? '#059669' : cls === 'B' ? '#D97706' : '#9CA3AF'; return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: col, color: '#fff', fontSize: 10, fontWeight: 800 }}>{cls}</span>; })()}
                      </td>
                      <td style={{ padding: '7px 10px' }}>{row.latestAction ? <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, color: ac(row.latestAction), background: abg(row.latestAction) }}>{row.latestAction}</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: row.latestBal != null && row.latestBal <= 0 ? '#DC2626' : 'var(--text)' }}>{fmt(row.latestBal)}</td>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 11 }}>{row.streak > 1 ? <span style={{ color: ac(row.streakAction), fontWeight: 700 }}>{row.streak}×</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>{fmt(row.totalQty)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                        <VolatilityBar value={row.volatility} />
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No items match filters</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid var(--border)', background: '#FAFBFC' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {sorted.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length} items
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <SmallPgBtn label="←" disabled={page === 0} onClick={() => setPage(p => p - 1)} />
              {(() => { const btns = []; const start = Math.max(0, Math.min(page - 2, totalPages - 5)); const end = Math.min(totalPages, start + 5);
                for (let i = start; i < end; i++) btns.push(<SmallPgBtn key={i} label={i + 1} active={i === page} onClick={() => setPage(i)} />); return btns; })()}
              <SmallPgBtn label="→" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} />
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
          {selectedItem ? (
            <RichDetailPanel item={selectedItem} abc={abcByCode[selectedItem.itemCode]} onClose={() => setSelectedCode(null)} ac={ac} abg={abg} fmt={fmt} cohortMeta={cohorts.find(c => c.id === selectedItem.cohort)} />
          ) : (
            <CohortBreakdownPanel itemSummaries={filtered} cohorts={cohorts} cohortCounts={cohortCounts} onCohortClick={setCohort} ac={ac} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Rich Detail Panel ===== */
function RichDetailPanel({ item, abc, onClose, ac, abg, fmt, cohortMeta }) {
  const series = item.all;
  const max = Math.max(...series.flatMap(p => [p.prevClosingBal || 0, p.predictedClosingBal || 0]), 1);
  const w = 354, h = 110, padL = 4, padR = 4, padT = 8, padB = 22;
  const cW = w - padL - padR, cH = h - padT - padB;
  const x = (i) => padL + (series.length === 1 ? cW / 2 : (i / (series.length - 1)) * cW);
  const y = (v) => padT + cH - (v / max) * cH;
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.predictedClosingBal || 0)}`).join(' ');
  const area = path + ` L ${x(series.length - 1)} ${padT + cH} L ${x(0)} ${padT + cH} Z`;

  // Action ribbon
  const ribbonW = 354, ribbonH = 22;
  const cellW = ribbonW / series.length;

  // Summary stats
  const totalMoved = series.reduce((s, d) => s + (d.quantity || 0), 0);
  const acts = series.map(d => d.predictedAction);
  const flips = acts.reduce((s, a, i) => s + (i > 0 && a !== acts[i-1] ? 1 : 0), 0);
  // Longest streak
  let longestStreak = 1, longestAction = acts[0], cur = 1;
  for (let i = 1; i < acts.length; i++) {
    if (acts[i] === acts[i-1]) { cur++; if (cur > longestStreak) { longestStreak = cur; longestAction = acts[i]; } }
    else cur = 1;
  }
  const counts = { Deliver: 0, Return: 0, 'No Change': 0 };
  acts.forEach(a => { if (counts[a] != null) counts[a]++; });
  const predominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  const fmtPeriod = p => { const [y, m] = p.split('-'); const names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${names[parseInt(m)]} '${y.slice(2)}`; };

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{item.description}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{item.itemCode}</div>
        </div>
        <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', color: 'var(--text-3)', cursor: 'pointer', width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>×</button>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {item.isHV && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'rgba(79,70,229,.06)' }}>★ High Value</span>}
        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, color: cohortMeta?.color, background: (cohortMeta?.color || '#888') + '14' }}>{cohortMeta?.label}</span>
        {abc && (() => { const col = abc === 'A' ? '#059669' : abc === 'B' ? '#D97706' : '#9CA3AF'; return <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, color: col, background: col + '14' }}>Class {abc}</span>; })()}
      </div>

      {/* Trajectory */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--text-2)' }}>Closing Balance · {series.length} periods</div>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
          {[0,.25,.5,.75,1].map((p,i) => { const yy = padT + cH - cH * p; return <line key={i} x1={padL} y1={yy} x2={w-padR} y2={yy} stroke="#F3F4F6" />; })}
          <defs><linearGradient id={`grad-${item.itemCode}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".25" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
          <path d={area} fill={`url(#grad-${item.itemCode})`} />
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
          {series.map((p, i) => i === 0 || i === series.length - 1 || i % Math.max(Math.floor(series.length / 6), 1) === 0 ? (
            <g key={i}>
              <circle cx={x(i)} cy={y(p.predictedClosingBal || 0)} r={2} fill="var(--accent)" />
              <text x={x(i)} y={padT + cH + 14} textAnchor="middle" fontSize="8" fill="var(--text-3)" fontFamily="var(--mono)">{p.period.slice(2, 7)}</text>
            </g>
          ) : null)}
          <text x={padL + 2} y={padT + 8} fontSize="8" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(max).toLocaleString()}</text>
        </svg>
      </div>

      {/* Action ribbon */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--text-2)' }}>Action History · D=Deliver · R=Return · ·=No Change</div>
        <svg width="100%" height={ribbonH} viewBox={`0 0 ${ribbonW} ${ribbonH}`} style={{ display: 'block' }}>
          {series.map((p, i) => {
            const xp = i * cellW;
            const a = p.predictedAction;
            const letter = a === 'Deliver' ? 'D' : a === 'Return' ? 'R' : '·';
            return <g key={p.period}>
              <rect x={xp + 0.5} y={0} width={Math.max(cellW - 1, 1)} height={ribbonH} fill={ac(a)} opacity={a === 'No Change' ? .35 : .82} rx={1.5} />
              {cellW >= 14 && <text x={xp + cellW / 2} y={ribbonH / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{letter}</text>}
            </g>;
          })}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 3 }}>
          <span>{fmtPeriod(series[0].period)}</span>
          {series.length > 4 && <span>{fmtPeriod(series[Math.floor(series.length / 2)].period)}</span>}
          <span>{fmtPeriod(series[series.length - 1].period)}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
        <DetailStat label="Total Moved" value={Math.round(totalMoved).toLocaleString()} hint="all periods" />
        <DetailStat label="Action Flips" value={flips} hint={`in ${series.length} periods`} />
        <DetailStat label="Longest Streak" value={`${longestStreak}×`} hint={longestAction} hintColor={ac(longestAction)} />
        <DetailStat label="Predominant" value={predominant[0]} valueColor={ac(predominant[0])} hint={`${Math.round(predominant[1] / acts.length * 100)}% of time`} />
        <DetailStat label="First Activity" value={fmtPeriod(series[0].period)} hint="" />
        <DetailStat label="Latest Period" value={fmtPeriod(series[series.length - 1].period)} hint="" />
      </div>
    </div>
  );
}

function DetailStat({ label, value, valueColor, hint, hintColor }) {
  return (
    <div style={{ background: '#FAFBFC', borderRadius: 7, padding: '7px 10px' }}>
      <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--mono)', color: valueColor || 'var(--text)', marginTop: 1 }}>{value}</div>
      {hint && <div style={{ fontSize: 9, color: hintColor || 'var(--text-3)', fontWeight: 500, marginTop: 1 }}>{hint}</div>}
    </div>
  );
}

/* ===== Cohort Breakdown Panel (default side panel state) ===== */
function CohortBreakdownPanel({ itemSummaries, cohorts, cohortCounts, onCohortClick, ac }) {
  const total = itemSummaries.length || 1;
  const visibleCohorts = cohorts.filter(c => c.id !== 'all' && cohortCounts[c.id] > 0);
  const max = Math.max(...visibleCohorts.map(c => cohortCounts[c.id]), 1);

  // Top volatile, top at-risk
  const volatile = [...itemSummaries].filter(it => it.cohort === 'volatile').slice(0, 4);
  const atRisk = [...itemSummaries].filter(it => it.cohort === 'atRisk').slice(0, 4);

  return (
    <>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Behavior Cohorts</div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 10 }}>Computed from each item's last-6-periods action sequence.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleCohorts.map(c => {
            const cnt = cohortCounts[c.id];
            return (
              <button key={c.id} onClick={() => onCohortClick(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0 }}></div>
                <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{c.label}</div>
                <div style={{ flex: 1.5, height: 8, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${cnt / max * 100}%`, background: c.color, opacity: .85, borderRadius: 2 }}></div>
                </div>
                <div style={{ width: 38, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', textAlign: 'right' }}>{cnt}</div>
                <div style={{ width: 32, fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text-3)', textAlign: 'right' }}>{Math.round(cnt / total * 100)}%</div>
              </button>
            );
          })}
        </div>
      </div>

      {atRisk.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>⚠ Top At-Risk Items</div>
            <button onClick={() => onCohortClick('atRisk')} style={{ fontSize: 10, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>See all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {atRisk.map(it => (
              <div key={it.itemCode} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.description}>{it.description}</div>
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#DC2626', fontWeight: 700 }}>bal {it.latestBal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {volatile.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>⇌ Most Volatile</div>
            <button onClick={() => onCohortClick('volatile')} style={{ fontSize: 10, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>See all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {volatile.map(it => (
              <div key={it.itemCode} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.description}>{it.description}</div>
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#D97706', fontWeight: 700 }}>{Math.round(it.volatility * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: 'var(--accent)', lineHeight: 1.5 }}>
        <strong>Tip:</strong> Click a cohort or any row to dive in. Each item shows its full trajectory and action history.
      </div>
    </>
  );
}

/* ===== Scope Picker ===== */
function ScopePicker({ value, onChange, singlePeriod, onSinglePeriodChange, allPeriods, totalPeriods }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn);
  }, []);
  const fmt = p => { const [y, m] = p.split('-'); const names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${names[parseInt(m)]} ${y}`; };
  const labels = {
    all: `All ${totalPeriods} periods`,
    last12: 'Last 12 months',
    last6: 'Last 6 months',
    last3: 'Last 3 months',
    single: `Single: ${fmt(singlePeriod)}`,
  };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font)' }}>
        <span>{labels[value]}</span><span style={{ fontSize: 9, color: 'var(--text-3)' }}>▼</span>
      </button>
      {open && <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.08)', zIndex: 100, minWidth: 200, padding: 4 }}>
        {[
          { id: 'all', label: `All ${totalPeriods} periods` },
          { id: 'last12', label: 'Last 12 months' },
          { id: 'last6', label: 'Last 6 months' },
          { id: 'last3', label: 'Last 3 months' },
          { id: 'single', label: 'Single period…' },
        ].map(o => (
          <button key={o.id} onClick={() => { onChange(o.id); if (o.id !== 'single') setOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', background: value === o.id ? 'var(--accent-surface)' : 'transparent', color: value === o.id ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', fontSize: 11, fontWeight: value === o.id ? 700 : 500, fontFamily: 'var(--font)', borderRadius: 5 }}>{o.label}</button>
        ))}
        {value === 'single' && (
          <div style={{ padding: 6, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <select value={singlePeriod} onChange={e => onSinglePeriodChange(e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: 5, border: '1px solid var(--border)', background: '#fff', fontSize: 11, fontFamily: 'var(--font)' }}>
              {allPeriods.map(p => <option key={p} value={p}>{fmt(p)}</option>)}
            </select>
          </div>
        )}
      </div>}
    </div>
  );
}

/* ===== Volatility Bar (mini) ===== */
function VolatilityBar({ value }) {
  const pct = Math.min(value, 1);
  const color = pct < 0.2 ? '#059669' : pct < 0.5 ? '#D97706' : '#DC2626';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', width: '100%' }}>
      <div style={{ width: 50, height: 5, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 2 }}></div>
      </div>
      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-3)', minWidth: 22, textAlign: 'right' }}>{Math.round(pct * 100)}%</span>
    </div>
  );
}

/* ===== Reused components ===== */
function MiniStat({ label, value, color, pct }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        {pct != null && <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{pct}%</span>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--mono)', color }}>{value}</div>
    </div>
  );
}

function SmallPgBtn({ label, active, disabled, onClick }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      width: typeof label === 'number' ? 26 : 24, height: 24, borderRadius: 5, border: '1px solid',
      borderColor: active ? 'var(--accent)' : 'var(--border)',
      background: active ? 'var(--accent)' : '#fff',
      color: active ? '#fff' : disabled ? 'var(--text-3)' : 'var(--text-2)',
      fontSize: 10, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
      fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? .4 : 1,
    }}>{label}</button>
  );
}

function FilterGroup({ label, children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>{children}</div>;
}

Object.assign(window, { ItemExplorerPage });
