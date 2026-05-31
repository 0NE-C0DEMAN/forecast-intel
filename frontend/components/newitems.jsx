/* ============================================================
   New Items — how the forecast roster grows over time.

   Sonu noticed the ITEMS count changes month to month. This page makes
   that explicit: a timeline of how many products are in the forecast each
   month, with green markers on the months where new SKUs were added. Click
   any month to see exactly which items came in (code, name, high-value),
   plus any that dropped out.
   ============================================================ */
function NewItemsPage({ allData }) {
  const periods = React.useMemo(() => [...new Set((allData || []).map(d => d.period))].sort(), [allData]);

  const fmtP = p => { if (!p) return ''; const [y, m] = p.split('-'); const ns = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${ns[parseInt(m)]} ${y}`; };
  const fmtShort = p => { if (!p) return ''; const [y, m] = p.split('-'); const ns = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${ns[parseInt(m)]} '${y.slice(2)}`; };

  // Per-period item map + what was added / removed vs the previous month.
  const series = React.useMemo(() => {
    const byP = {};
    (allData || []).forEach(d => { (byP[d.period] = byP[d.period] || {})[d.itemCode] = { code: d.itemCode, desc: d.description || d.itemCode, isHV: d.isHV }; });
    return periods.map((p, i) => {
      const cur = byP[p] || {};
      const prev = i > 0 ? (byP[periods[i - 1]] || {}) : null;
      const curCodes = Object.keys(cur);
      const added = prev ? curCodes.filter(c => !(c in prev)).map(c => cur[c]) : [];
      const removed = prev ? Object.keys(prev).filter(c => !(c in cur)).map(c => prev[c]) : [];
      added.sort((a, b) => (a.desc || '').localeCompare(b.desc || ''));
      removed.sort((a, b) => (a.desc || '').localeCompare(b.desc || ''));
      return { period: p, count: curCodes.length, added, removed, first: i === 0 };
    });
  }, [periods]);

  const [sel, setSel] = React.useState(null);
  React.useEffect(() => {
    if (!series.length) return;
    const lastAdd = [...series].reverse().find(s => s.added.length > 0);
    setSel(lastAdd ? lastAdd.period : series[series.length - 1].period);
  }, [series]);
  const selRow = series.find(s => s.period === sel) || null;

  // Item drill-down: clicking a new item opens its full forecast (same card as
  // the Action Flow / Item Forecasts pages). New items have short histories.
  const [itemSel, setItemSel] = React.useState(null);
  React.useEffect(() => { setItemSel(null); }, [sel]);
  const itemDetail = React.useMemo(() => {
    if (!itemSel) return null;
    const rows = (allData || []).filter(d => d.itemCode === itemSel).sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
    if (!rows.length) return null;
    return { itemCode: itemSel, description: rows[0].description || rows[0].itemCode, isHV: rows[0].isHV, periods: rows };
  }, [itemSel, allData]);

  if (periods.length < 2) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Need at least two months of data to show item changes.</div>;

  // Summary
  const latest = series[series.length - 1];
  const firstP = series[0];
  const latestYear = latest.period.split('-')[0];
  const addedThisYear = series.filter(s => s.period.startsWith(latestYear)).reduce((n, s) => n + s.added.length, 0);

  // Chart geometry — stepped area of the item count, markers at additions.
  const H = 250, padL = 44, padR = 14, padT = 24, padB = 38;
  const cH = H - padT - padB;
  const COL_NEW = '#059669';
  const maxC = Math.max(...series.map(s => s.count), 1);

  // Collapse flat stretches: keep only the first month, every month where the
  // count changed, and the latest month. The long unchanged runs in between are
  // drawn as a single straight segment labelled with their date range.
  const nodes = [];
  series.forEach((s, i) => { if (i === 0 || s.count !== series[i - 1].count) nodes.push({ ...s, idx: i }); });
  if (nodes.length && nodes[nodes.length - 1].idx !== series.length - 1) nodes.push({ ...series[series.length - 1], idx: series.length - 1 });

  const spacing = 116;
  const W = Math.max(padL + nodes.length * spacing + padR, 640);
  const nx = k => padL + (k + 0.5) * spacing;
  const ny = c => padT + cH - (c / maxC) * cH;

  let stepLine = nodes.length ? `M ${nx(0).toFixed(1)} ${ny(nodes[0].count).toFixed(1)}` : '';
  for (let k = 1; k < nodes.length; k++) stepLine += ` L ${nx(k).toFixed(1)} ${ny(nodes[k - 1].count).toFixed(1)} L ${nx(k).toFixed(1)} ${ny(nodes[k].count).toFixed(1)}`;
  const area = nodes.length ? stepLine + ` L ${nx(nodes.length - 1).toFixed(1)} ${(padT + cH).toFixed(1)} L ${nx(0).toFixed(1)} ${(padT + cH).toFixed(1)} Z` : '';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '14px 24px 0', minHeight: 0 }}>
      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0, marginBottom: 12 }}>
        {[
          { label: 'Items now', value: latest.count, sub: fmtP(latest.period) },
          { label: 'Added in ' + latestYear, value: '+' + addedThisYear, sub: 'new SKUs' },
          { label: 'Tracked since', value: fmtShort(firstP.period), sub: firstP.count + ' at start' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', minWidth: 120 }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)', lineHeight: 1.1 }}>{c.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>{c.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 14, overflow: 'hidden', paddingBottom: 14, minHeight: 0 }}>
        {/* Timeline */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Roster size by month</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 10 }}>How many products are in the forecast each month. Green dots mark months where new items were added — click any month to list them.</div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
              {/* gridlines */}
              {[0, 0.5, 1].map((g, i) => { const yy = padT + cH - g * cH; return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#F3F4F6" /><text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(maxC * g)}</text></g>; })}
              {/* compressed flat ranges — unchanged stretches shown as one straight segment */}
              {nodes.map((n, k) => {
                if (k === 0) return null;
                const gap = n.idx - nodes[k - 1].idx - 1;
                if (gap <= 0) return null;
                const midX = (nx(k - 1) + nx(k)) / 2;
                const yLvl = ny(nodes[k - 1].count);
                const from = fmtShort(series[nodes[k - 1].idx + 1].period);
                const to = fmtShort(series[n.idx - 1].period);
                return (
                  <g key={'gap' + k}>
                    <text x={midX} y={yLvl + 15} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--text-2)">{from} → {to}</text>
                    <text x={midX} y={yLvl + 26} textAnchor="middle" fontSize="8" fill="var(--text-3)">no change</text>
                  </g>
                );
              })}
              {/* step area + line */}
              <path d={area} fill="rgba(79,70,229,.07)" />
              <path d={stepLine} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
              {/* event nodes — start, every change month, latest */}
              {nodes.map((n, k) => {
                const hasAdd = n.added.length > 0;
                const isSel = n.period === sel;
                return (
                  <g key={n.period} style={{ cursor: 'pointer' }} onClick={() => setSel(n.period)}>
                    <rect x={nx(k) - spacing / 2} y={padT} width={spacing} height={cH} fill={isSel ? 'rgba(79,70,229,.06)' : 'transparent'} />
                    {hasAdd && <text x={nx(k)} y={ny(n.count) - 11} textAnchor="middle" fontSize="10" fontWeight="700" fill={COL_NEW} fontFamily="var(--mono)">+{n.added.length}</text>}
                    <circle cx={nx(k)} cy={ny(n.count)} r={isSel ? 5.5 : (hasAdd ? 4.5 : 3)} fill={hasAdd ? COL_NEW : 'var(--accent)'} stroke="#fff" strokeWidth={isSel ? 2 : 1} />
                    <text x={nx(k)} y={padT + cH + 16} textAnchor="middle" fontSize="9.5" fill={isSel ? 'var(--text)' : 'var(--text-2)'} fontWeight={isSel ? 700 : 500} fontFamily="var(--mono)">{fmtShort(n.period)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ width: 360, flexShrink: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{selRow ? fmtP(selRow.period) : ''}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
              {selRow ? (selRow.added.length > 0 ? `${selRow.added.length} new item${selRow.added.length === 1 ? '' : 's'} · ${selRow.count} total` : `No new items · ${selRow.count} total`) : ''}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="h-scroller">
            {selRow && selRow.added.length > 0 ? selRow.added.map((it, i) => (
              <button key={it.code + i} onClick={() => setItemSel(it.code)} title="View item forecast"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #F3F4F6', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {it.isHV && <span style={{ fontSize: 9, color: 'var(--accent)', flexShrink: 0 }}>★</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.desc}>{it.desc}</div>
                  <div style={{ fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--text-3)', marginTop: 1 }}>{it.code}{it.isHV ? ' · high value' : ''}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            )) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12, lineHeight: 1.5 }}>{selRow && selRow.first ? 'First month tracked — nothing earlier to compare against.' : 'No new items this month. The list carried over from the previous month.'}</div>
            )}
            {selRow && selRow.removed.length > 0 && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: '#FAFBFC' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{selRow.removed.length} dropped out</div>
                {selRow.removed.map((it, i) => <div key={it.code + i} style={{ fontSize: 11, color: 'var(--text-2)', padding: '2px 0' }}>{it.desc} <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 9.5 }}>{it.code}</span></div>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item drill-down: full forecast for the clicked new item */}
      {itemDetail && (
        <div onClick={() => setItemSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} className="h-scroller" style={{ background: '#fff', borderRadius: 14, width: 'min(920px, 94vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.28)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{itemDetail.isHV && <span style={{ color: 'var(--accent)' }}>★ </span>}{itemDetail.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{itemDetail.itemCode} · first appeared {fmtP(itemDetail.periods[0].period)} · {itemDetail.periods.length} month{itemDetail.periods.length === 1 ? '' : 's'}</div>
              </div>
              <button onClick={() => setItemSel(null)} title="Close" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-2)', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <ItemForecastCard item={itemDetail} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.NewItemsPage = NewItemsPage;
