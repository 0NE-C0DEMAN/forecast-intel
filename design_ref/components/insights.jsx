/* Insights & analytics derived purely from the data */

/* ===== 1. ABC PARETO ANALYSIS ===== */
function ABCPareto({ data }) {
  // Aggregate total movement quantity per item across the period
  const byItem = {};
  data.forEach(d => {
    const k = d.itemCode;
    if (!byItem[k]) byItem[k] = { itemCode: k, description: d.description, isHV: d.isHV, totalQty: 0 };
    byItem[k].totalQty += (d.quantity || 0);
  });
  const sorted = Object.values(byItem).filter(x => x.totalQty > 0).sort((a, b) => b.totalQty - a.totalQty);
  const totalQty = sorted.reduce((s, x) => s + x.totalQty, 0) || 1;
  // Build cumulative
  let cum = 0;
  const points = sorted.map((it, i) => {
    cum += it.totalQty;
    const cumPct = cum / totalQty;
    let cls = 'C';
    if (cumPct <= 0.8) cls = 'A';
    else if (cumPct <= 0.95) cls = 'B';
    return { ...it, rank: i + 1, qty: it.totalQty, cumQty: cum, cumPct, class: cls };
  });
  const aCount = points.filter(p => p.class === 'A').length;
  const bCount = points.filter(p => p.class === 'B').length;
  const cCount = points.filter(p => p.class === 'C').length;
  const aPct = ((aCount / points.length) * 100).toFixed(1);

  const w = 880, h = 200, padL = 50, padR = 50, padT = 14, padB = 32;
  const cW = w - padL - padR, cH = h - padT - padB;
  const xPos = (i) => padL + (points.length === 1 ? cW / 2 : (i / (points.length - 1)) * cW);
  const yLine = (p) => padT + cH - p * cH;
  const cumPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yLine(p.cumPct)}`).join(' ');
  const maxQty = points[0]?.qty || 1;
  const yBar = (q) => padT + cH - (q / maxQty) * cH;

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 11 }}>
        <ABCBadge label="A" pct="80% volume" count={aCount} pctOfItems={aPct} color="#059669" />
        <ABCBadge label="B" pct="80–95% volume" count={bCount} color="#D97706" />
        <ABCBadge label="C" pct="long tail" count={cCount} color="var(--text-3)" />
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {[0,.25,.5,.75,1].map((p,i) => { const yy = padT + cH - cH * p; return <g key={i}><line x1={padL} y1={yy} x2={w-padR} y2={yy} stroke="#F3F4F6" /><text x={padL-6} y={yy+3.5} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(p*100)}%</text></g>; })}
        {/* Bars */}
        {points.map((p, i) => { const x = xPos(i); const bw = Math.max(cW / points.length - 0.5, 0.5); return <rect key={i} x={x - bw/2} y={yBar(p.qty)} width={bw} height={padT + cH - yBar(p.qty)} fill={p.class === 'A' ? '#059669' : p.class === 'B' ? '#D97706' : '#9CA3AF'} opacity={.55} />; })}
        {/* Cumulative line */}
        <path d={cumPath} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {/* 80% reference line */}
        <line x1={padL} y1={yLine(0.8)} x2={w-padR} y2={yLine(0.8)} stroke="#059669" strokeDasharray="4,4" strokeWidth={1} />
        <text x={w-padR-2} y={yLine(0.8) - 4} textAnchor="end" fontSize="10" fill="#059669" fontWeight="600">80% line</text>
        {/* X axis */}
        <text x={padL} y={padT+cH+16} fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">#1</text>
        <text x={(padL+w-padR)/2} y={padT+cH+16} textAnchor="middle" fontSize="10" fill="var(--text-3)">{points.length} items ranked by total quantity</text>
        <text x={w-padR} y={padT+cH+16} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">#{points.length}</text>
      </svg>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <ABCColumn title="Class A · top contributors" items={points.filter(p => p.class === 'A').slice(0, 6)} color="#059669" totalQty={totalQty} />
        <ABCColumn title="Class B" items={points.filter(p => p.class === 'B').slice(0, 6)} color="#D97706" totalQty={totalQty} />
        <ABCColumn title="Class C · long tail" items={points.filter(p => p.class === 'C').slice(0, 6)} color="#9CA3AF" totalQty={totalQty} />
      </div>
    </div>
  );
}

function ABCBadge({ label, pct, count, pctOfItems, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 8, background: color + '15', border: '1px solid ' + color + '40' }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>{pct}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{count} items{pctOfItems && <span style={{ fontWeight: 500, color: 'var(--text-3)', fontSize: 10 }}> · {pctOfItems}%</span>}</div>
      </div>
    </div>
  );
}

function ABCColumn({ title, items, color, totalQty }) {
  return (
    <div style={{ background: '#FAFBFC', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{title}</div>
      {items.map((it, i) => (
        <div key={it.itemCode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < items.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
          <div style={{ flex: 1, fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.description}>{it.description}</div>
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color, fontWeight: 700 }}>{((it.qty/totalQty)*100).toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}

/* ===== 2. STOCK-OUT & EXCESS RISK WATCH ===== */
function RiskWatchlist({ data, allData, currentPeriod }) {
  // Build per-item series, sorted by period
  const byItem = {};
  allData.forEach(d => { if (!byItem[d.itemCode]) byItem[d.itemCode] = []; byItem[d.itemCode].push(d); });
  Object.values(byItem).forEach(arr => arr.sort((a, b) => a.period.localeCompare(b.period)));

  const stockOuts = [];
  const excess = [];
  const consecutive = []; // 3+ consecutive same action

  Object.entries(byItem).forEach(([code, series]) => {
    const last = series[series.length - 1];
    if (!last) return;
    // Stock-out risk: predicted closing <= 0 or trending strongly down
    if (last.predictedClosingBal != null && last.predictedClosingBal <= 0) {
      stockOuts.push({ ...last, severity: 'critical', reason: 'Projected balance ≤ 0' });
    } else if (series.length >= 3) {
      const recent = series.slice(-3);
      const trend = recent[2].predictedClosingBal - recent[0].predictedClosingBal;
      const avgQty = recent.reduce((s, x) => s + (x.quantity || 0), 0) / 3;
      if (trend < 0 && Math.abs(trend) > avgQty * 2 && last.predictedClosingBal < Math.abs(trend)) {
        stockOuts.push({ ...last, severity: 'warning', reason: `Falling fast (Δ${Math.round(trend)} in 3 mo)` });
      }
    }
    // Excess: balance growing for 4+ consecutive periods AND predominantly Return action
    if (series.length >= 4) {
      const last4 = series.slice(-4);
      const allGrowing = last4.every((d, i) => i === 0 || d.predictedClosingBal >= last4[i - 1].predictedClosingBal);
      const returnCount = last4.filter(d => d.predictedAction === 'Return').length;
      if (allGrowing && returnCount >= 2 && last.predictedClosingBal > (series[0]?.predictedClosingBal || 0) * 1.2) {
        const growth = ((last.predictedClosingBal - last4[0].predictedClosingBal) / Math.max(last4[0].predictedClosingBal, 1) * 100).toFixed(0);
        excess.push({ ...last, severity: 'warning', reason: `Balance up ${growth}% over 4 mo` });
      }
    }
    // Consecutive same action ≥ 4 periods
    if (series.length >= 4) {
      let count = 1, lastAction = series[series.length - 1].predictedAction;
      for (let i = series.length - 2; i >= 0; i--) {
        if (series[i].predictedAction === lastAction) count++; else break;
      }
      if (count >= 4 && lastAction !== 'No Change') {
        consecutive.push({ ...last, severity: 'info', reason: `${count} consecutive ${lastAction.toLowerCase()}s`, action: lastAction });
      }
    }
  });

  stockOuts.sort((a, b) => (a.severity === 'critical' ? -1 : 1));
  excess.sort((a, b) => (b.predictedClosingBal || 0) - (a.predictedClosingBal || 0));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      <RiskColumn title="Stock-out Risk" subtitle="Items projected to deplete" items={stockOuts.slice(0, 8)} color="#DC2626" icon="↓" emptyMsg="No stock-out risks detected" />
      <RiskColumn title="Excess Inventory" subtitle="Growing balances · candidates for return" items={excess.slice(0, 8)} color="#D97706" icon="↑" emptyMsg="No excess inventory flagged" />
      <RiskColumn title="Persistent Pattern" subtitle="Same action ≥ 4 months running" items={consecutive.slice(0, 8)} color="var(--accent)" icon="↻" emptyMsg="No persistent patterns" />
    </div>
  );
}

function RiskColumn({ title, subtitle, items, color, icon, emptyMsg }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: color + '15', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{items.length}</div>
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '14px 4px', textAlign: 'center' }}>{emptyMsg}</div>
        ) : items.map((item, i) => (
          <div key={item.itemCode + i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < items.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>{item.description}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{item.reason}</div>
            </div>
            {item.severity === 'critical' && <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: '#DC2626', color: '#fff' }}>!</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== 3. ACTION CALENDAR HEATMAP ===== */
function ActionCalendarHeatmap({ data }) {
  const periods = [...new Set(data.map(d => d.period))].sort();
  // Top 30 items by total quantity for legibility
  const byItem = {};
  data.forEach(d => { const k = d.itemCode; if (!byItem[k]) byItem[k] = { itemCode: k, description: d.description, isHV: d.isHV, totalQty: 0, byPeriod: {} }; byItem[k].totalQty += (d.quantity || 0); byItem[k].byPeriod[d.period] = d; });
  const items = Object.values(byItem).sort((a, b) => b.totalQty - a.totalQty).slice(0, 30);

  const ac = (a) => a === 'Deliver' ? '#059669' : a === 'Return' ? '#DC2626' : a === 'No Change' ? '#D97706' : '#F3F4F6';
  const fmt = p => p.split('-')[1];
  const yearOf = p => p.split('-')[0];
  const labelEvery = periods.length > 24 ? 3 : 1;
  const [hover, setHover] = React.useState(null);

  const colW = Math.max(14, Math.min(32, 800 / periods.length));
  const rowH = 18;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, fontSize: 11 }}>
        <span style={{ color: 'var(--text-3)' }}>Top {items.length} items × {periods.length} months · cell color = predicted action</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#059669' }}></span><span>Deliver</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#DC2626' }}></span><span>Return</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#D97706' }}></span><span>No Change</span></div>
      </div>
      <div style={{ overflow: 'auto', maxHeight: 600, position: 'relative' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 1, fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 3, padding: 0 }}></th>
              {periods.map((p, i) => i % labelEvery === 0 ? (
                <th key={p} style={{ width: colW * labelEvery, fontWeight: 600, fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--mono)', padding: '4px 0', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }} colSpan={labelEvery}>
                  {fmt(p)}{i === 0 || yearOf(p) !== yearOf(periods[i - 1]) ? <div style={{ fontSize: 8, color: 'var(--accent)', fontWeight: 700 }}>{yearOf(p)}</div> : null}
                </th>
              ) : null)}
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.itemCode}>
                <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, padding: '0 8px 0 0', fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: '1px solid var(--border)' }} title={it.description}>
                  {it.isHV && <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 3 }}>★</span>}
                  {it.description}
                </td>
                {periods.map(p => {
                  const cell = it.byPeriod[p];
                  const action = cell?.predictedAction;
                  const isHover = hover && hover.code === it.itemCode && hover.period === p;
                  return (
                    <td key={p} style={{ width: colW, height: rowH, background: ac(action), opacity: action ? (isHover ? 1 : 0.85) : 0.3, cursor: 'pointer', transition: 'opacity .12s', borderRadius: 2 }}
                      onMouseEnter={() => setHover({ code: it.itemCode, period: p, item: it, cell })} onMouseLeave={() => setHover(null)} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {hover && hover.cell && (
          <div style={{ position: 'fixed', pointerEvents: 'none', background: '#111827', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 11, zIndex: 1000, transform: 'translate(20px, 20px)', boxShadow: '0 4px 12px rgba(0,0,0,.2)', left: 0, top: 0 }} ref={el => { if (!el) return; const move = (e) => { el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px'; }; document.addEventListener('mousemove', move, { once: true }); }}>
            <div style={{ fontWeight: 700 }}>{hover.item.description}</div>
            <div style={{ color: '#9CA3AF', fontFamily: 'var(--mono)' }}>{hover.period} · {hover.cell.predictedAction} · qty {hover.cell.quantity}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== 4. YEAR-OVER-YEAR COMPARISON ===== */
function YearOverYearComparison({ allData }) {
  const periods = [...new Set(allData.map(d => d.period))].sort();
  const years = [...new Set(periods.map(p => p.split('-')[0]))].sort();
  if (years.length < 2) return <div style={{ fontSize: 12, color: 'var(--text-3)', padding: 24, textAlign: 'center' }}>Year-over-year requires data spanning ≥2 calendar years.</div>;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Per year: array of 12 monthly net qty (deliver - return)
  const series = years.map(y => {
    return {
      year: y,
      months: months.map((_, mIdx) => {
        const period = `${y}-${String(mIdx + 1).padStart(2, '0')}`;
        const rows = allData.filter(d => d.period === period);
        const del = rows.filter(d => d.predictedAction === 'Deliver').reduce((s, d) => s + (d.quantity || 0), 0);
        const ret = rows.filter(d => d.predictedAction === 'Return').reduce((s, d) => s + (d.quantity || 0), 0);
        return { deliver: del, return: ret, net: del - ret, total: del + ret, hasData: rows.length > 0 };
      })
    };
  });

  const allValues = series.flatMap(s => s.months.flatMap(m => [m.deliver, m.return]));
  const max = Math.max(...allValues, 1);
  const fmtK = v => v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v);

  const w = 880, h = 240, padL = 50, padR = 16, padT = 16, padB = 30;
  const cW = w - padL - padR, cH = h - padT - padB;
  const x = (i) => padL + ((i + 0.5) / 12) * cW;
  const y = (v) => padT + cH - (v / max) * cH;

  // Color per year, latest year accented
  const yearColor = (idx) => {
    const opacities = [0.3, 0.55, 1];
    const opacity = opacities[Math.max(0, opacities.length - series.length + idx)] || 1;
    return { stroke: 'var(--accent)', opacity };
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 11 }}>
        {series.map((s, i) => { const c = yearColor(i); return <span key={s.year} style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, color: 'var(--text-2)' }}><span style={{ width: 14, height: 3, background: c.stroke, opacity: c.opacity }}></span>{s.year}</span>; })}
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {[0,.25,.5,.75,1].map((p,i) => { const yy = padT + cH - cH * p; return <g key={i}><line x1={padL} y1={yy} x2={w-padR} y2={yy} stroke="#F3F4F6" /><text x={padL-6} y={yy+3.5} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">{fmtK(max*p)}</text></g>; })}
        {series.map((s, sIdx) => {
          const c = yearColor(sIdx);
          const path = s.months.map((m, i) => m.hasData ? `${i === 0 || !s.months[i-1].hasData ? 'M' : 'L'} ${x(i)} ${y(m.deliver)}` : '').filter(Boolean).join(' ');
          return <g key={s.year}>
            <path d={path} fill="none" stroke={c.stroke} strokeWidth={2} opacity={c.opacity} strokeLinejoin="round" />
            {s.months.map((m, i) => m.hasData && <circle key={i} cx={x(i)} cy={y(m.deliver)} r={3} fill={c.stroke} opacity={c.opacity} />)}
          </g>;
        })}
        {months.map((m, i) => <text key={m} x={x(i)} y={padT+cH+16} textAnchor="middle" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">{m}</text>)}
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Deliver volume by month, layered across years.</div>

      {/* MoM table for current year */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>YoY Net Change Table</div>
        <div style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#FAFBFC' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Year</th>
                {months.map(m => <th key={m} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{m}</th>)}
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {series.map(s => {
                const total = s.months.reduce((sum, m) => sum + m.net, 0);
                return (
                  <tr key={s.year} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{s.year}</td>
                    {s.months.map((m, i) => (
                      <td key={i} style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: !m.hasData ? 'var(--text-3)' : m.net > 0 ? '#059669' : m.net < 0 ? '#DC2626' : 'var(--text-3)', fontWeight: 600 }}>
                        {!m.hasData ? '—' : (m.net > 0 ? '+' : '') + fmtK(m.net)}
                      </td>
                    ))}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: total > 0 ? '#059669' : total < 0 ? '#DC2626' : 'var(--text-3)' }}>{total > 0 ? '+' : ''}{fmtK(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== 5. AUTO-INSIGHTS PANEL ===== */
function AutoInsights({ allData, currentPeriod }) {
  const periods = [...new Set(allData.map(d => d.period))].sort();
  const insights = [];

  // Insight 1: Net inventory direction
  const curr = allData.filter(d => d.period === currentPeriod);
  const delQ = curr.filter(d => d.predictedAction === 'Deliver').reduce((s, d) => s + (d.quantity || 0), 0);
  const retQ = curr.filter(d => d.predictedAction === 'Return').reduce((s, d) => s + (d.quantity || 0), 0);
  const net = delQ - retQ;
  insights.push({
    severity: net >= 0 ? 'positive' : 'negative', icon: net >= 0 ? '↑' : '↓',
    title: `Net inventory ${net >= 0 ? 'expanding' : 'contracting'} this period`,
    body: `${(Math.abs(net) >= 1000 ? (Math.abs(net) / 1000).toFixed(1) + 'K' : Math.abs(net))} units net ${net >= 0 ? 'inflow' : 'outflow'} (${(delQ/1000).toFixed(1)}K deliver vs ${(retQ/1000).toFixed(1)}K return).`,
  });

  // Insight 2: HV concentration
  const hv = curr.filter(d => d.isHV);
  const hvDeliver = hv.filter(d => d.predictedAction === 'Deliver').length;
  if (hv.length > 0) {
    const pct = Math.round((hvDeliver / hv.length) * 100);
    insights.push({
      severity: 'info', icon: '★',
      title: `${pct}% of HV items flagged for delivery`,
      body: `${hvDeliver} of ${hv.length} high-value SKUs need to ship out this period.`,
    });
  }

  // Insight 3: Persistent action pattern
  const byItem = {};
  allData.forEach(d => { if (!byItem[d.itemCode]) byItem[d.itemCode] = []; byItem[d.itemCode].push(d); });
  Object.values(byItem).forEach(arr => arr.sort((a, b) => a.period.localeCompare(b.period)));
  let persistentReturn = 0, persistentDeliver = 0;
  const minStreak = Math.min(6, periods.length);
  Object.values(byItem).forEach(series => {
    if (series.length < minStreak) return;
    const last = series.slice(-minStreak);
    if (last.every(d => d.predictedAction === 'Return')) persistentReturn++;
    if (last.every(d => d.predictedAction === 'Deliver')) persistentDeliver++;
  });
  if ((persistentReturn + persistentDeliver) > 0) {
    insights.push({
      severity: 'warning', icon: '↻',
      title: `Persistent patterns: ${persistentReturn + persistentDeliver} items locked in one direction`,
      body: `${persistentReturn} returning and ${persistentDeliver} delivering for ${minStreak}+ consecutive months — may signal mis-allocated stock.`,
    });
  }

  // Insight 4: Stock-out risk
  const zeroBal = curr.filter(d => d.predictedClosingBal != null && d.predictedClosingBal <= 0).length;
  if (zeroBal > 0) {
    insights.push({
      severity: 'critical', icon: '!',
      title: `${zeroBal} item${zeroBal === 1 ? '' : 's'} projected to deplete`,
      body: `Predicted closing balance ≤ 0 — these need urgent replenishment.`,
    });
  }

  // Insight 5: Volatility
  const volatile = [];
  Object.entries(byItem).forEach(([code, series]) => {
    if (series.length < 4) return;
    const actions = series.slice(-6).map(d => d.predictedAction);
    const flips = actions.reduce((s, a, i) => s + (i > 0 && a !== actions[i-1] ? 1 : 0), 0);
    if (flips >= 4) volatile.push({ code, description: series[0].description });
  });
  if (volatile.length > 0) {
    insights.push({
      severity: 'info', icon: '⇌',
      title: `${volatile.length} highly volatile items detected`,
      body: `Items flipping between deliver/return ≥ 4 times in 6 months: ${volatile.slice(0, 3).map(v => v.description).join(', ')}${volatile.length > 3 ? '…' : ''}.`,
    });
  }

  // Insight 6: Concentration
  const totalQ = curr.reduce((s, d) => s + (d.quantity || 0), 0);
  if (totalQ > 0) {
    const sortedQ = [...curr].sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    let cum = 0, count = 0;
    for (const item of sortedQ) { cum += (item.quantity || 0); count++; if (cum / totalQ >= 0.8) break; }
    const pct = ((count / curr.length) * 100).toFixed(0);
    insights.push({
      severity: 'info', icon: '◐',
      title: `${pct}% of items drive 80% of movement this period`,
      body: `Concentration is ${pct < 20 ? 'high — focus operations on this short list' : pct < 40 ? 'moderate' : 'low — movement is spread thin'}.`,
    });
  }

  const sevColor = { positive: '#059669', negative: '#DC2626', warning: '#D97706', critical: '#DC2626', info: 'var(--accent)' };
  const sevBg = { positive: 'rgba(5,150,105,.08)', negative: 'rgba(220,38,38,.07)', warning: 'rgba(217,119,6,.08)', critical: 'rgba(220,38,38,.1)', info: 'rgba(79,70,229,.06)' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {insights.map((ins, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: sevBg[ins.severity], border: `1px solid ${sevColor[ins.severity]}25`, borderRadius: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: sevColor[ins.severity], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{ins.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{ins.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{ins.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ABCPareto, RiskWatchlist, ActionCalendarHeatmap, YearOverYearComparison, AutoInsights });
