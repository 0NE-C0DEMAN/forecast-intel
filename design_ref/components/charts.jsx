/* Charts v2 — comprehensive, multi-period ready */

/* ===== DONUT ===== */
function ActionDonut({ data }) {
  const deliver = data.filter(d => d.predictedAction === 'Deliver').length;
  const ret = data.filter(d => d.predictedAction === 'Return').length;
  const nc = data.filter(d => d.predictedAction === 'No Change').length;
  const total = data.length || 1;
  const [hov, setHov] = React.useState(null);
  const segs = [
    { label: 'Deliver', count: deliver, color: '#059669', pct: deliver / total },
    { label: 'Return', count: ret, color: '#DC2626', pct: ret / total },
    { label: 'No Change', count: nc, color: '#D97706', pct: nc / total },
  ];
  const r = 56, cx = 72, cy = 72, sw = 17, circ = 2 * Math.PI * r;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
      <svg width={144} height={144} viewBox="0 0 144 144" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
        {(() => { let acc = 0; return segs.map((s, i) => { const start = acc; acc += s.pct; if (s.pct < .005) return null; const len = s.pct * circ - 2; return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={hov === i ? sw + 5 : sw} strokeLinecap="round" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-(start * circ)} style={{ transition: 'stroke-width .2s, opacity .2s', cursor: 'pointer', opacity: hov != null && hov !== i ? .65 : 1, transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />; }); })()}
        <text x={cx} y={cy - 1} textAnchor="middle" dominantBaseline="central" fill="var(--text)" fontSize="24" fontWeight="800" fontFamily="var(--mono)">{total}</text>
        <text x={cx} y={cy + 15} textAnchor="middle" fill="var(--text-3)" fontSize="9">items</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: hov != null && hov !== i ? .65 : 1, transition: 'opacity .15s', cursor: 'pointer' }}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: s.color }}></div>
            <div><div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)' }}>{s.count} <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>({Math.round(s.pct * 100)}%)</span></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== TOP N HORIZONTAL BARS ===== */
function TopItemsBar({ data, action, maxItems = 15, color }) {
  const items = data.filter(d => d.predictedAction === action).sort((a, b) => (b.quantity || 0) - (a.quantity || 0)).slice(0, maxItems);
  const maxQ = items.length ? items[0].quantity || 1 : 1;
  const [hIdx, setHIdx] = React.useState(null);
  if (!items.length) return <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>No {action.toLowerCase()} items</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => (
        <div key={item.itemCode + i} style={{ display: 'flex', alignItems: 'center', gap: 0, opacity: hIdx != null && hIdx !== i ? .65 : 1, transition: 'opacity .12s', height: 26, cursor: 'default' }}
          onMouseEnter={() => setHIdx(i)} onMouseLeave={() => setHIdx(null)}>
          <div style={{ width: 130, fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 450, paddingRight: 8, textAlign: 'right', flexShrink: 0 }} title={item.description}>{item.description}</div>
          <div style={{ flex: 1, height: 18, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${(item.quantity || 0) / maxQ * 100}%`, background: color, transition: 'width .4s ease' }}></div>
          </div>
          <div style={{ width: 54, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)', textAlign: 'right', fontWeight: 600, paddingLeft: 6, flexShrink: 0 }}>{Math.round(item.quantity || 0).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

/* ===== HV vs STANDARD STACKED BAR ===== */
function HVBreakdown({ data }) {
  const groups = [{ label: 'High Value', items: data.filter(d => d.isHV) }, { label: 'Standard', items: data.filter(d => !d.isHV) }];
  const actions = ['Deliver', 'No Change', 'Return'];
  const colors = { Deliver: '#059669', 'No Change': '#D97706', Return: '#DC2626' };
  const maxStack = Math.max(...groups.map(g => g.items.length), 1);
  const barW = 72, chartH = 130, padL = 44, padT = 8, padB = 28;
  const svgW = padL + groups.length * (barW + 40) + 20, svgH = padT + chartH + padB;

  return (
    <div>
      <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: 'visible' }}>
        {[0, .5, 1].map((p, i) => { const y = padT + chartH - chartH * p; return <g key={i}><line x1={padL - 4} y1={y} x2={svgW - 10} y2={y} stroke="#F3F4F6" /><text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize="9" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(maxStack * p)}</text></g>; })}
        {groups.map((g, gi) => {
          const counts = actions.map(a => g.items.filter(d => d.predictedAction === a).length);
          let y = padT + chartH;
          const x = padL + 10 + gi * (barW + 50);
          return (
            <g key={gi}>
              {counts.map((c, ci) => { const h = (c / maxStack) * chartH; y -= h; return <g key={ci}><rect x={x} y={y} width={barW} height={Math.max(h, 0)} rx={ci === 2 ? 5 : 0} fill={colors[actions[ci]]} opacity={.8} />{h > 14 && <text x={x + barW / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="var(--mono)">{c}</text>}</g>; })}
              <text x={x + barW / 2} y={padT + chartH + 16} textAnchor="middle" fontSize="11" fill="var(--text-2)" fontWeight="500">{g.label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 2 }}>
        {actions.map(a => <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: colors[a] }}></div>{a}</div>)}
      </div>
    </div>
  );
}

/* ===== CLOSING BALANCE PORTFOLIO ===== */
function ClosingBalancePortfolio({ data }) {
  const prev = data.reduce((s, d) => s + (d.prevClosingBal || 0), 0);
  const pred = data.reduce((s, d) => s + (d.predictedClosingBal || 0), 0);
  const max = Math.max(prev, pred, 1);
  const fmtK = v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? Math.round(v/1e3)+'K' : Math.round(v);
  const w = 420, h = 110;
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>Aggregate previous vs predicted closing balance for all filtered items.</div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <text x={8} y={14} fontSize="10" fill="var(--text-3)" fontWeight="500">Previous Closing</text>
        <rect x={8} y={20} width={(prev/max)*(w-100)} height={32} rx={6} fill="#D1D5DB" />
        <text x={(prev/max)*(w-100)+16} y={42} fontSize="14" fontWeight="700" fill="var(--text-2)" fontFamily="var(--mono)">{fmtK(prev)}</text>
        <text x={8} y={72} fontSize="10" fill="var(--text-3)" fontWeight="500">Predicted Closing</text>
        <rect x={8} y={78} width={(pred/max)*(w-100)} height={32} rx={6} fill="var(--accent)" opacity=".75" />
        <text x={(pred/max)*(w-100)+16} y={100} fontSize="14" fontWeight="700" fill="var(--accent)" fontFamily="var(--mono)">{fmtK(pred)}</text>
      </svg>
    </div>
  );
}

/* ===== JAN VS FEB COMPARISON ===== */
function ComparisonChart({ janData, febData }) {
  const cats = ['Deliver', 'Return', 'No Change'];
  const jc = cats.map(c => janData.filter(d => d.predictedAction === c).length);
  const fc = cats.map(c => febData.filter(d => d.predictedAction === c).length);
  const max = Math.max(...jc, ...fc, 1);
  const colors = ['#059669', '#DC2626', '#D97706'];
  const bW = 32, gap = 6, gGap = 50, cH = 150, pL = 40, pT = 20, pB = 30;
  const tW = pL + cats.length * (bW * 2 + gap) + (cats.length - 1) * gGap + 30;
  const sH = cH + pT + pB;
  const [hg, setHg] = React.useState(null);
  return (
    <svg width="100%" height={sH} viewBox={`0 0 ${tW} ${sH}`} style={{ overflow: 'visible' }}>
      {[0,.25,.5,.75,1].map((p,i) => { const y = pT+cH-cH*p; return <g key={i}><line x1={pL} y1={y} x2={tW-10} y2={y} stroke="#F3F4F6" /><text x={pL-6} y={y+3.5} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(max*p)}</text></g>; })}
      {cats.map((c,ci) => { const x0=pL+14+ci*(bW*2+gap+gGap); const jh=Math.max(jc[ci]/max*cH,3); const fh=Math.max(fc[ci]/max*cH,3); const dim=hg!=null&&hg!==ci; return <g key={ci} style={{opacity:dim?.65:1,transition:'opacity .15s',cursor:'pointer'}} onMouseEnter={()=>setHg(ci)} onMouseLeave={()=>setHg(null)}><rect x={x0} y={pT+cH-jh} width={bW} height={jh} rx={5} fill={colors[ci]} opacity={.35}/><rect x={x0+bW+gap} y={pT+cH-fh} width={bW} height={fh} rx={5} fill={colors[ci]} opacity={.85}/><text x={x0+bW/2} y={pT+cH-jh-6} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-2)" fontFamily="var(--mono)">{jc[ci]}</text><text x={x0+bW+gap+bW/2} y={pT+cH-fh-6} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{fc[ci]}</text><text x={x0+bW+gap/2} y={pT+cH+18} textAnchor="middle" fontSize="11" fill="var(--text-2)" fontWeight="500">{c}</text></g>; })}
      <rect x={tW-100} y={4} width={10} height={10} rx={3} fill="var(--text-3)" opacity={.35}/><text x={tW-86} y={12.5} fontSize="10" fill="var(--text-3)">Jan</text>
      <rect x={tW-54} y={4} width={10} height={10} rx={3} fill="var(--text-2)" opacity={.85}/><text x={tW-40} y={12.5} fontSize="10" fill="var(--text-3)">Feb</text>
    </svg>
  );
}

/* ===== QUANTITY DISTRIBUTION HISTOGRAM ===== */
function QuantityHistogram({ data }) {
  const buckets = [0, 10, 50, 100, 500, 1000, 5000, Infinity];
  const labels = ['0–10', '10–50', '50–100', '100–500', '500–1K', '1K–5K', '5K+'];
  const qtys = data.map(d => d.quantity || 0).filter(q => q > 0);
  const counts = labels.map((_, i) => qtys.filter(q => q > buckets[i] && q <= buckets[i + 1]).length);
  const max = Math.max(...counts, 1);
  const bW = 56, cH = 240, pL = 44, pT = 14, pB = 44, gap = 14;
  const tW = pL + labels.length * (bW + gap) + 20;
  const sH = pT + cH + pB;
  const [hb, setHb] = React.useState(null);
  // Color gradient from light to saturated
  const barColor = (i) => `oklch(0.65 0.18 ${160 + i * 28})`;

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Number of items by predicted movement quantity bucket.</div>
      <svg width="100%" height={sH} viewBox={`0 0 ${tW} ${sH}`} style={{ overflow: 'visible' }}>
        {[0,.25,.5,.75,1].map((p,i) => { const y=pT+cH-cH*p; return <g key={i}><line x1={pL} y1={y} x2={tW-10} y2={y} stroke="#F3F4F6"/>{p>0&&<text x={pL-6} y={y+3.5} textAnchor="end" fontSize="9" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(max*p)}</text>}</g>; })}
        {counts.map((c, i) => {
          const x = pL + 4 + i * (bW + gap);
          const h = Math.max((c / max) * cH, 2);
          const dim = hb != null && hb !== i;
          return (
            <g key={i} style={{ opacity: dim ? .65 : 1, transition: 'opacity .15s', cursor: 'pointer' }}
              onMouseEnter={() => setHb(i)} onMouseLeave={() => setHb(null)}>
              <rect x={x} y={pT + cH - h} width={bW} height={h} rx={4} fill={barColor(i)} />
              {c > 0 && <text x={x + bW / 2} y={pT + cH - h - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{c}</text>}
              <text x={x + bW / 2} y={pT + cH + 14} textAnchor="middle" fontSize="9" fill="var(--text-3)">{labels[i]}</text>
            </g>
          );
        })}
        <text x={tW / 2} y={pT + cH + 32} textAnchor="middle" fontSize="10" fill="var(--text-3)">Quantity Range (units)</text>
      </svg>
    </div>
  );
}

/* ===== NET INVENTORY WATERFALL ===== */
function NetInventoryWaterfall({ periodGroups }) {
  // periodGroups: [{period, data}] — works for any number of periods
  const bars = periodGroups.map(pg => {
    const del = pg.data.filter(d => d.predictedAction === 'Deliver').reduce((s, d) => s + (d.quantity || 0), 0);
    const ret = pg.data.filter(d => d.predictedAction === 'Return').reduce((s, d) => s + (d.quantity || 0), 0);
    const net = del - ret;
    return { period: pg.period, deliver: del, return: ret, net };
  });
  const maxVal = Math.max(...bars.flatMap(b => [b.deliver, b.return, Math.abs(b.net)]), 1);
  const fmtK = v => v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v);
  const bW = 28, cH = 130, pL = 44, pT = 16, pB = 32, groupW = 120;
  const tW = pL + bars.length * groupW + 40;
  const sH = pT + cH + pB;

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Net inventory movement per period. Green = deliveries, Red = returns, Blue = net change.</div>
      <svg width="100%" height={sH} viewBox={`0 0 ${tW} ${sH}`} style={{ overflow: 'visible' }}>
        <line x1={pL} y1={pT + cH} x2={tW - 10} y2={pT + cH} stroke="#E5E7EB" />
        {bars.map((b, i) => {
          const gx = pL + 10 + i * groupW;
          const dh = (b.deliver / maxVal) * cH * .85;
          const rh = (b.return / maxVal) * cH * .85;
          const nh = (Math.abs(b.net) / maxVal) * cH * .85;
          return (
            <g key={b.period}>
              <rect x={gx} y={pT + cH - dh} width={bW} height={dh} rx={4} fill="#059669" opacity={.75} />
              <text x={gx + bW / 2} y={pT + cH - dh - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#059669" fontFamily="var(--mono)">{fmtK(b.deliver)}</text>
              <rect x={gx + bW + 4} y={pT + cH - rh} width={bW} height={rh} rx={4} fill="#DC2626" opacity={.75} />
              <text x={gx + bW + 4 + bW / 2} y={pT + cH - rh - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#DC2626" fontFamily="var(--mono)">{fmtK(b.return)}</text>
              <rect x={gx + (bW + 4) * 2} y={pT + cH - nh} width={bW} height={nh} rx={4} fill={b.net >= 0 ? 'var(--accent)' : '#7C3AED'} opacity={.75} />
              <text x={gx + (bW + 4) * 2 + bW / 2} y={pT + cH - nh - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill={b.net >= 0 ? 'var(--accent)' : '#7C3AED'} fontFamily="var(--mono)">{b.net >= 0 ? '+' : ''}{fmtK(b.net)}</text>
              <text x={gx + (bW + 4) * 1.5} y={pT + cH + 16} textAnchor="middle" fontSize="11" fill="var(--text-2)" fontWeight="500">{b.period}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: '#059669' }}></div>Deliver</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: '#DC2626' }}></div>Return</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }}></div>Net Change</div>
      </div>
    </div>
  );
}

/* ===== ACTION FLOW BETWEEN PERIODS ===== */
function ActionFlowSankey({ janData, febData }) {
  const janMap = {};
  janData.forEach(d => { janMap[d.itemCode] = d.predictedAction; });
  const actions = ['Deliver', 'Return', 'No Change'];
  const colors = { Deliver: '#059669', Return: '#DC2626', 'No Change': '#D97706' };
  // Build flow matrix
  const flows = [];
  actions.forEach(from => {
    actions.forEach(to => {
      const count = febData.filter(d => janMap[d.itemCode] === from && d.predictedAction === to).length;
      if (count > 0) flows.push({ from, to, count });
    });
  });
  const maxFlow = Math.max(...flows.map(f => f.count), 1);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>How item actions shifted between Jan and Feb. {flows.reduce((s, f) => f.from !== f.to ? s + f.count : s, 0)} items changed direction.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {flows.map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 16px 1fr 80px', alignItems: 'center', gap: 8, height: 26 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: colors[f.from], textAlign: 'right' }}>{f.from}</span>
            <div style={{ height: 14, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${f.count / maxFlow * 100}%`, background: colors[f.from], opacity: .5, transition: 'width .4s' }}></div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>→</span>
            <div style={{ height: 14, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden', direction: 'rtl' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${f.count / maxFlow * 100}%`, background: colors[f.to], opacity: .5, transition: 'width .4s' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: colors[f.to] }}>{f.to}</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-3)', fontWeight: 600 }}>{f.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== BALANCE SCATTER ===== */
function BalanceScatter({ data }) {
  const items = data.filter(d => d.prevClosingBal != null && d.predictedClosingBal != null && (d.prevClosingBal > 0 || d.predictedClosingBal > 0));
  const maxVal = Math.max(...items.map(d => Math.max(d.prevClosingBal, d.predictedClosingBal)), 100);
  const w = 760, h = 360, pad = 50;
  const [hd, setHd] = React.useState(null);
  const ac = (a) => a === 'Deliver' ? '#059669' : a === 'Return' ? '#DC2626' : '#D97706';
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Each dot = one item. Above diagonal = balance increase (deliver). Below = decrease (return).</div>
      <svg width="100%" height={h + 20} viewBox={`0 0 ${w + 20} ${h + 20}`}>
        <line x1={pad} y1={10} x2={pad} y2={h - 4} stroke="#E5E7EB" /><line x1={pad} y1={h - 4} x2={w + 10} y2={h - 4} stroke="#E5E7EB" />
        <line x1={pad} y1={h - 4} x2={w - 10} y2={14} stroke="#E5E7EB" strokeDasharray="4,4" />
        <text x={w / 2 + pad / 2} y={h + 16} textAnchor="middle" fontSize="10" fill="var(--text-3)">Previous Balance</text>
        <text x={14} y={h / 2} textAnchor="middle" fontSize="10" fill="var(--text-3)" transform={`rotate(-90,14,${h / 2})`}>Predicted</text>
        {items.slice(0, 200).map((it, i) => {
          const x = pad + (it.prevClosingBal / maxVal) * (w - pad - 20);
          const y = h - 4 - (it.predictedClosingBal / maxVal) * (h - 18);
          return <circle key={i} cx={x} cy={y} r={hd === i ? 6 : it.isHV ? 4.5 : 3} fill={ac(it.predictedAction)} opacity={hd === i ? 1 : .4} style={{ transition: 'r .12s', cursor: 'pointer' }} onMouseEnter={() => setHd(i)} onMouseLeave={() => setHd(null)} />;
        })}
      </svg>
      {hd != null && items[hd] && <div style={{ position: 'absolute', top: 8, right: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,.08)', maxWidth: 200, zIndex: 5 }}>
        <div style={{ fontWeight: 700, marginBottom: 3 }}>{items[hd].description}</div>
        <div style={{ color: 'var(--text-3)' }}>Prev: {Math.round(items[hd].prevClosingBal).toLocaleString()} → Pred: {Math.round(items[hd].predictedClosingBal).toLocaleString()}</div>
      </div>}
    </div>
  );
}

/* ===== MODEL ACCURACY TABLE ===== */
function ModelAccuracyTable({ periodGroups }) {
  const thS = { padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '2px solid var(--border)', background: '#FAFBFC' };
  const tdS = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #F3F4F6' };
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>MAPE values from the workbook (N/A rows = future mode, no actuals).</div>
      <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={thS}>Period</th><th style={thS}>Model</th><th style={thS}>MAPE All (%)</th><th style={thS}>MAPE HV (%)</th><th style={{ ...thS, textAlign: 'right' }}>Predicted</th><th style={{ ...thS, textAlign: 'right' }}>Deliver</th><th style={{ ...thS, textAlign: 'right' }}>Return</th><th style={thS}>Tier</th></tr></thead>
          <tbody>
            {periodGroups.map(pg => (
              <tr key={pg.period}>
                <td style={{ ...tdS, fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 12 }}>{pg.period}</td>
                <td style={tdS}>Monthly</td><td style={{ ...tdS, color: 'var(--text-3)' }}>N/A</td><td style={{ ...tdS, color: 'var(--text-3)' }}>N/A</td>
                <td style={{ ...tdS, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{pg.data.length}</td>
                <td style={{ ...tdS, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: '#059669' }}>{pg.data.filter(d => d.predictedAction === 'Deliver').length}</td>
                <td style={{ ...tdS, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: '#DC2626' }}>{pg.data.filter(d => d.predictedAction === 'Return').length}</td>
                <td style={tdS}>Inactive</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== EXPLORER-SPECIFIC: Filtered Stats Mini Charts ===== */
function FilteredActionBreakdown({ data }) {
  const actions = ['Deliver', 'Return', 'No Change'];
  const colors = { Deliver: '#059669', Return: '#DC2626', 'No Change': '#D97706' };
  const total = data.length || 1;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {actions.map(a => {
        const c = data.filter(d => d.predictedAction === a).length;
        const pct = c / total;
        return (
          <div key={a} style={{ flex: 1, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: colors[a], textTransform: 'uppercase', letterSpacing: '.04em' }}>{a}</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{Math.round(pct * 100)}%</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', marginBottom: 6 }}>{c}</div>
            <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${pct * 100}%`, background: colors[a], transition: 'width .3s' }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FilteredQuantityDistribution({ data }) {
  const sorted = [...data].sort((a, b) => (b.quantity || 0) - (a.quantity || 0)).slice(0, 8);
  const max = sorted.length ? sorted[0].quantity || 1 : 1;
  const ac = (a) => a === 'Deliver' ? '#059669' : a === 'Return' ? '#DC2626' : '#D97706';
  if (!sorted.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Top items in current selection by quantity</div>
      {sorted.map((item, i) => (
        <div key={item.itemCode + item.period + i} style={{ display: 'flex', alignItems: 'center', gap: 0, height: 24 }}>
          <div style={{ width: 120, fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8, textAlign: 'right', flexShrink: 0 }} title={item.description}>{item.description}</div>
          <div style={{ flex: 1, height: 16, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${(item.quantity || 0) / max * 100}%`, background: ac(item.predictedAction) }}></div>
          </div>
          <div style={{ width: 50, fontSize: 11, fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, paddingLeft: 6, flexShrink: 0 }}>{Math.round(item.quantity || 0).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

/* ===== ACTION COUNT BARS — grouped bars across all periods ===== */
function ActionCountBars({ periodGroups }) {
  const actions = ['Deliver', 'Return', 'No Change'];
  const colors = { Deliver: '#059669', Return: '#DC2626', 'No Change': '#D97706' };
  const data = periodGroups.map(pg => ({
    period: pg.period,
    counts: actions.map(a => pg.data.filter(d => d.predictedAction === a).length),
  }));
  const max = Math.max(...data.flatMap(d => d.counts), 1);
  const fmt = p => { const [y, m] = p.split('-'); const names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${names[parseInt(m)]} ${y.slice(-2)}`; };
  const periodCount = data.length;
  const groupW = Math.max(140, Math.min(220, 720 / Math.max(periodCount, 1)));
  const gapBetween = 28;
  const barW = (groupW - 12) / 3;
  const cH = 240, pL = 56, pT = 18, pB = 44;
  const tW = pL + periodCount * (groupW + gapBetween) + 16;
  const sH = pT + cH + pB;
  const [hg, setHg] = React.useState(null);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Item count per action across {periodCount} period{periodCount === 1 ? '' : 's'}.</div>
      <svg width="100%" height={sH} viewBox={`0 0 ${tW} ${sH}`} style={{ overflow: 'visible' }}>
        {[0,.25,.5,.75,1].map((p,i) => { const y = pT + cH - cH * p; return <g key={i}><line x1={pL} y1={y} x2={tW-12} y2={y} stroke="#F3F4F6"/><text x={pL-8} y={y+3.5} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(max*p)}</text></g>; })}
        {data.map((row, gi) => {
          const x0 = pL + 6 + gi * (groupW + gapBetween);
          const dim = hg != null && hg !== gi;
          return (
            <g key={row.period} style={{ opacity: dim ? .65 : 1, transition: 'opacity .15s', cursor: 'pointer' }}
              onMouseEnter={() => setHg(gi)} onMouseLeave={() => setHg(null)}>
              {row.counts.map((c, ci) => {
                const h = (c / max) * cH;
                const x = x0 + ci * (barW + 4);
                return (
                  <g key={ci}>
                    <rect x={x} y={pT + cH - h} width={barW} height={Math.max(h, 2)} rx={4} fill={colors[actions[ci]]} opacity={.85} />
                    {h > 18 && <text x={x + barW/2} y={pT + cH - h - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={colors[actions[ci]]} fontFamily="var(--mono)">{c}</text>}
                  </g>
                );
              })}
              <text x={x0 + groupW/2 - 6} y={pT + cH + 18} textAnchor="middle" fontSize="11" fill="var(--text-2)" fontWeight="500" fontFamily="var(--mono)">{fmt(row.period)}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 6 }}>
        {actions.map(a => <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: colors[a], opacity: .85 }}></div>{a}</div>)}
      </div>
    </div>
  );
}

/* ===== TOP HIGH-VELOCITY ITEMS — most-moved items across all periods ===== */
function HighVelocityItems({ allData, periodGroups }) {
  const rows = allData || (periodGroups ? periodGroups.flatMap(pg => pg.data) : []);
  const byItem = {};
  rows.forEach(d => {
    if (!d.itemCode || d.quantity == null) return;
    if (!byItem[d.itemCode]) byItem[d.itemCode] = { code: d.itemCode, desc: d.description, isHV: d.isHV, totalQty: 0, deliverQty: 0, returnQty: 0, periods: 0 };
    byItem[d.itemCode].totalQty += d.quantity || 0;
    byItem[d.itemCode].periods += 1;
    if (d.predictedAction === 'Deliver') byItem[d.itemCode].deliverQty += d.quantity || 0;
    if (d.predictedAction === 'Return') byItem[d.itemCode].returnQty += d.quantity || 0;
  });
  const items = Object.values(byItem).sort((a, b) => b.totalQty - a.totalQty).slice(0, 12);
  if (!items.length) return <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>No items with movement</div>;
  const maxTotal = items[0].totalQty || 1;
  const fmtK = v => v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v);
  const [h, setH] = React.useState(null);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>Top items by cumulative movement quantity across all periods. Bar split shows deliver vs return contribution.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it, i) => {
          const delPct = (it.deliverQty / it.totalQty) * 100;
          const retPct = (it.returnQty / it.totalQty) * 100;
          const totalPct = (it.totalQty / maxTotal) * 100;
          return (
            <div key={it.code} onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)}
              style={{ display: 'grid', gridTemplateColumns: '180px 1fr 80px', alignItems: 'center', gap: 12, height: 26, opacity: h != null && h !== i ? .65 : 1, transition: 'opacity .12s', cursor: 'default' }}
              title={`${it.desc} · ${it.periods} period${it.periods === 1 ? '' : 's'}`}>
              <div style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                {it.isHV && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-surface)', padding: '1px 5px', borderRadius: 4 }}>HV</span>}
                <span>{it.desc}</span>
              </div>
              <div style={{ display: 'flex', height: 16, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden', position: 'relative', width: `${totalPct}%` }}>
                <div style={{ width: `${(it.deliverQty / it.totalQty) * 100}%`, background: '#059669', opacity: .85 }}></div>
                <div style={{ width: `${(it.returnQty / it.totalQty) * 100}%`, background: '#DC2626', opacity: .85 }}></div>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{fmtK(it.totalQty)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#059669', opacity: .85 }}></span>Deliver share</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#DC2626', opacity: .85 }}></span>Return share</span>
      </div>
    </div>
  );
}

/* ===== HV vs STANDARD MOVEMENT BY PERIOD ===== */
function HVMovementByPeriod({ periodGroups }) {
  const fmt = p => { const [y, m] = p.split('-'); const names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${names[parseInt(m)]} ${y.slice(-2)}`; };
  const data = periodGroups.map(pg => {
    const hv = pg.data.filter(d => d.isHV);
    const std = pg.data.filter(d => !d.isHV);
    return {
      period: pg.period,
      hvDel: hv.filter(d => d.predictedAction === 'Deliver').length,
      hvRet: hv.filter(d => d.predictedAction === 'Return').length,
      stdDel: std.filter(d => d.predictedAction === 'Deliver').length,
      stdRet: std.filter(d => d.predictedAction === 'Return').length,
    };
  });
  const max = Math.max(...data.flatMap(d => [d.hvDel + d.stdDel, d.hvRet + d.stdRet]), 1);
  const periodCount = data.length;
  const groupW = Math.max(120, Math.min(180, 640 / Math.max(periodCount, 1)));
  const gapBetween = 24;
  const barW = (groupW - 8) / 2;
  const cH = 200, pL = 56, pT = 14, pB = 44;
  const tW = pL + periodCount * (groupW + gapBetween) + 16;
  const sH = pT + cH + pB;

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Deliver and Return counts per period, stacked by HV (dark) vs Standard (light).</div>
      <svg width="100%" height={sH} viewBox={`0 0 ${tW} ${sH}`} style={{ overflow: 'visible' }}>
        {[0,.25,.5,.75,1].map((p,i) => { const y = pT + cH - cH * p; return <g key={i}><line x1={pL} y1={y} x2={tW-12} y2={y} stroke="#F3F4F6"/><text x={pL-8} y={y+3.5} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(max*p)}</text></g>; })}
        {data.map((row, gi) => {
          const x0 = pL + 6 + gi * (groupW + gapBetween);
          // Deliver bar (left) — stacked: HV (dark) on bottom, Standard (light) on top
          const delTotal = row.hvDel + row.stdDel;
          const delH = (delTotal / max) * cH;
          const delHvH = (row.hvDel / max) * cH;
          const delStdH = (row.stdDel / max) * cH;
          // Return bar (right) — stacked
          const retTotal = row.hvRet + row.stdRet;
          const retH = (retTotal / max) * cH;
          const retHvH = (row.hvRet / max) * cH;
          const retStdH = (row.stdRet / max) * cH;
          const xDel = x0;
          const xRet = x0 + barW + 8;
          return (
            <g key={row.period}>
              {/* Deliver group */}
              <rect x={xDel} y={pT + cH - delHvH - delStdH} width={barW} height={delStdH} rx={3} fill="#34D399" opacity={.85} />
              <rect x={xDel} y={pT + cH - delHvH} width={barW} height={delHvH} fill="#047857" opacity={.95} />
              {delTotal > 0 && delH > 14 && <text x={xDel + barW/2} y={pT + cH - delH - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#047857" fontFamily="var(--mono)">{delTotal}</text>}
              {/* Return group */}
              <rect x={xRet} y={pT + cH - retHvH - retStdH} width={barW} height={retStdH} rx={3} fill="#FCA5A5" opacity={.85} />
              <rect x={xRet} y={pT + cH - retHvH} width={barW} height={retHvH} fill="#B91C1C" opacity={.95} />
              {retTotal > 0 && retH > 14 && <text x={xRet + barW/2} y={pT + cH - retH - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#B91C1C" fontFamily="var(--mono)">{retTotal}</text>}
              <text x={x0 + (groupW - 8)/2} y={pT + cH + 18} textAnchor="middle" fontSize="11" fill="var(--text-2)" fontWeight="500" fontFamily="var(--mono)">{fmt(row.period)}</text>
              <text x={xDel + barW/2} y={pT + cH + 32} textAnchor="middle" fontSize="9" fill="#059669">Del</text>
              <text x={xRet + barW/2} y={pT + cH + 32} textAnchor="middle" fontSize="9" fill="#DC2626">Ret</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4, fontSize: 11, color: 'var(--text-2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#047857' }}></span>Deliver · HV</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#34D399' }}></span>Deliver · Standard</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#B91C1C' }}></span>Return · HV</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#FCA5A5' }}></span>Return · Standard</span>
      </div>
    </div>
  );
}

/* ===== SIGNED DIFFERENCE HISTOGRAM (butterfly) ===== */
function DifferenceHistogram({ data }) {
  // Buckets by absolute magnitude; counts are split into Return (negative) and Deliver (positive)
  const buckets = [
    { label: '0–10', min: 0, max: 10 },
    { label: '10–50', min: 10, max: 50 },
    { label: '50–100', min: 50, max: 100 },
    { label: '100–500', min: 100, max: 500 },
    { label: '500–1K', min: 500, max: 1000 },
    { label: '1K–5K', min: 1000, max: 5000 },
    { label: '5K+', min: 5000, max: Infinity },
  ];
  const buckets_data = buckets.map(b => {
    let ret = 0, del = 0;
    data.forEach(d => {
      const diff = d.difference;
      if (diff == null) return;
      const mag = Math.abs(diff);
      if (mag <= b.min || mag > b.max) return;
      if (diff < 0) ret++;
      else if (diff > 0) del++;
    });
    return { label: b.label, ret, del };
  });
  const max = Math.max(...buckets_data.flatMap(b => [b.ret, b.del]), 1);
  const noChangeCount = data.filter(d => d.predictedAction === 'No Change').length;
  const totalDel = data.filter(d => d.predictedAction === 'Deliver').length;
  const totalRet = data.filter(d => d.predictedAction === 'Return').length;
  const bW = 44, cH = 200, pL = 56, pT = 14, pB = 38, gap = 16;
  const tW = pL + buckets.length * (bW + gap) + 24;
  const sH = pT + cH + pB;
  const [hb, setHb] = React.useState(null);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Items grouped by magnitude of change. <span style={{ color: '#059669', fontWeight: 600 }}>{totalDel}</span> deliver / <span style={{ color: '#DC2626', fontWeight: 600 }}>{totalRet}</span> return / <span style={{ color: '#D97706', fontWeight: 600 }}>{noChangeCount}</span> hold.</div>
      <svg width="100%" height={sH} viewBox={`0 0 ${tW} ${sH}`} style={{ overflow: 'visible' }}>
        {[0,.25,.5,.75,1].map((p,i) => { const y=pT+cH-cH*p; return <g key={i}><line x1={pL} y1={y} x2={tW-12} y2={y} stroke="#F3F4F6"/>{p>0&&<text x={pL-6} y={y+3.5} textAnchor="end" fontSize="9" fill="var(--text-3)" fontFamily="var(--mono)">{Math.round(max*p)}</text>}</g>; })}
        {buckets_data.map((b, i) => {
          const cx = pL + 4 + i * (bW + gap);
          const dh = (b.del / max) * cH;
          const rh = (b.ret / max) * cH;
          const dim = hb != null && hb !== i;
          const halfW = bW / 2 - 1;
          return (
            <g key={i} style={{ opacity: dim ? .65 : 1, transition: 'opacity .15s', cursor: 'pointer' }}
              onMouseEnter={() => setHb(i)} onMouseLeave={() => setHb(null)}>
              {/* Deliver bar (left half) */}
              <rect x={cx} y={pT + cH - dh} width={halfW} height={dh} rx={3} fill="#059669" opacity={.85} />
              {b.del > 0 && dh > 14 && <text x={cx + halfW/2} y={pT + cH - dh - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#059669" fontFamily="var(--mono)">{b.del}</text>}
              {/* Return bar (right half) */}
              <rect x={cx + halfW + 2} y={pT + cH - rh} width={halfW} height={rh} rx={3} fill="#DC2626" opacity={.85} />
              {b.ret > 0 && rh > 14 && <text x={cx + halfW + 2 + halfW/2} y={pT + cH - rh - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#DC2626" fontFamily="var(--mono)">{b.ret}</text>}
              <text x={cx + bW/2} y={pT + cH + 14} textAnchor="middle" fontSize="9" fill="var(--text-3)">{b.label}</text>
            </g>
          );
        })}
        <text x={tW / 2} y={pT + cH + 32} textAnchor="middle" fontSize="10" fill="var(--text-3)">Magnitude bucket · |Predicted − Previous|</text>
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#059669', opacity: .85 }}></span>Deliver</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#DC2626', opacity: .85 }}></span>Return</span>
      </div>
    </div>
  );
}

/* ===== ACTION × MAGNITUDE HEATMAP ===== */
function ActionMagnitudeHeatmap({ data }) {
  const buckets = [
    { label: '0–10', min: 0, max: 10 },
    { label: '10–50', min: 10, max: 50 },
    { label: '50–100', min: 50, max: 100 },
    { label: '100–500', min: 100, max: 500 },
    { label: '500–1K', min: 500, max: 1000 },
    { label: '1K–5K', min: 1000, max: 5000 },
    { label: '5K+', min: 5000, max: Infinity },
  ];
  const actions = ['Deliver', 'Return', 'No Change'];
  const colors = { Deliver: [5, 150, 105], Return: [220, 38, 38], 'No Change': [217, 119, 6] };
  const matrix = actions.map(a => buckets.map(b => data.filter(d => d.predictedAction === a && (d.quantity || 0) > b.min && (d.quantity || 0) <= b.max).length));
  const maxCell = Math.max(...matrix.flat(), 1);
  const cellW = 78, cellH = 44, pL = 84, pT = 26;
  const tW = pL + buckets.length * cellW + 20;
  const tH = pT + actions.length * cellH + 8;
  const [hover, setHover] = React.useState(null);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>Counts of items by predicted action × quantity magnitude. Darker = more items in cell.</div>
      <svg width="100%" height={tH} viewBox={`0 0 ${tW} ${tH}`} style={{ overflow: 'visible' }}>
        {/* Column headers */}
        {buckets.map((b, i) => (
          <text key={i} x={pL + i * cellW + cellW / 2} y={pT - 8} textAnchor="middle" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">{b.label}</text>
        ))}
        {/* Row labels + cells */}
        {actions.map((a, ai) => {
          const [r, g, bl] = colors[a];
          return (
            <g key={a}>
              <text x={pL - 10} y={pT + ai * cellH + cellH / 2 + 4} textAnchor="end" fontSize="11" fontWeight="600" fill={`rgb(${r},${g},${bl})`}>{a}</text>
              {matrix[ai].map((c, ci) => {
                const intensity = c / maxCell;
                const alpha = c === 0 ? 0 : 0.12 + intensity * 0.78;
                const isHover = hover && hover.r === ai && hover.c === ci;
                return (
                  <g key={ci} style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ r: ai, c: ci })} onMouseLeave={() => setHover(null)}>
                    <rect x={pL + ci * cellW + 2} y={pT + ai * cellH + 2} width={cellW - 4} height={cellH - 4} rx={6}
                      fill={c === 0 ? '#F3F4F6' : `rgba(${r},${g},${bl},${alpha})`}
                      stroke={isHover ? `rgb(${r},${g},${bl})` : 'transparent'} strokeWidth={isHover ? 2 : 0} />
                    <text x={pL + ci * cellW + cellW / 2} y={pT + ai * cellH + cellH / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={alpha > 0.4 ? '#fff' : `rgb(${r},${g},${bl})`} fontFamily="var(--mono)">{c || ''}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

Object.assign(window, { ActionDonut, TopItemsBar, HVBreakdown, ClosingBalancePortfolio, ComparisonChart, QuantityHistogram, NetInventoryWaterfall, ActionFlowSankey, BalanceScatter, ModelAccuracyTable, FilteredActionBreakdown, FilteredQuantityDistribution, DifferenceHistogram, ActionMagnitudeHeatmap, ActionCountBars, HighVelocityItems, HVMovementByPeriod });
