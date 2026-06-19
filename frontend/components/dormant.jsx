/* ============================================================
   Dormant Items — products that have sat inactive for a year or more.

   Sonu asked for two views:
     1. Items with ZERO transactions for 12+ consecutive months
        (no Deliver and no Return — they just sat).
     2. Items whose COUNT (closing balance) stayed constant for 12+
        consecutive months (the on-hand number never moved).

   Both are computed from ACTUAL movements over the available history
   (Backtest months that have actuals); predicted/Future months are
   ignored, since dormancy is a fact about the observed past.
   ============================================================ */
function DormantItemsPage({ allData }) {
  const MIN = 12; // "1 year"

  const ns = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtShort = p => { if (!p) return ''; const [y, m] = p.split('-'); return `${ns[+m]} '${y.slice(2)}`; };
  const ymConsec = (a, b) => { const A = (+a.slice(0, 4)) * 12 + (+a.slice(5, 7)); const B = (+b.slice(0, 4)) * 12 + (+b.slice(5, 7)); return B - A === 1; };
  const fmtNum = v => v == null ? '—' : (Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v).toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 }));

  // Latest / earliest month that actually has actuals (the observed window).
  const meta = React.useMemo(() => {
    let latest = null, earliest = null;
    (allData || []).forEach(d => {
      if (d.actualClosingBal == null) return;
      if (!latest || d.period > latest) latest = d.period;
      if (!earliest || d.period < earliest) earliest = d.period;
    });
    return { latestActual: latest, firstActual: earliest };
  }, [allData]);

  // Per-item streak computation. One pass per item over its sorted history.
  const { zeroTxn, constCount } = React.useMemo(() => {
    const byItem = {};
    (allData || []).forEach(d => { (byItem[d.itemCode] = byItem[d.itemCode] || []).push(d); });
    const zero = [], cons = [];
    for (const code in byItem) {
      const rows = byItem[code].slice().sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
      const first = rows[0];

      // (1) zero transactions = actual action "No Change", consecutive months.
      let zBest = 0, zStart = null, zEnd = null, zCur = 0, zCurStart = null, zPrev = null;
      // (2) constant closing balance, consecutive months.
      let cBest = 0, cStart = null, cEnd = null, cVal = null, cCur = 0, cCurStart = null, cCurVal = null, cPrev = null, cPrevVal = null;

      for (const r of rows) {
        const p = r.period;
        const noChange = r.actualAction === 'No Change';
        if (noChange && (zPrev === null || ymConsec(zPrev, p))) { if (zCur === 0) zCurStart = p; zCur++; }
        else if (noChange) { zCur = 1; zCurStart = p; }
        else { zCur = 0; zCurStart = null; }
        if (zCur > zBest) { zBest = zCur; zStart = zCurStart; zEnd = p; }
        zPrev = p;

        const v = r.actualClosingBal;
        if (v == null) { cCur = 0; cPrev = p; cPrevVal = null; }
        else {
          if (cPrevVal != null && cPrev != null && ymConsec(cPrev, p) && Math.abs(v - cPrevVal) < 0.5) cCur++;
          else { cCur = 1; cCurStart = p; cCurVal = v; }
          if (cCur > cBest) { cBest = cCur; cStart = cCurStart; cEnd = p; cVal = cCurVal; }
          cPrev = p; cPrevVal = v;
        }
      }

      const base = { code, desc: first.description || code, isHV: !!first.isHV };
      if (zBest >= MIN) zero.push({ ...base, months: zBest, start: zStart, end: zEnd, ongoing: zEnd === meta.latestActual });
      if (cBest >= MIN) cons.push({ ...base, months: cBest, start: cStart, end: cEnd, value: cVal, ongoing: cEnd === meta.latestActual });
    }
    const bySize = (a, b) => b.months - a.months || (a.desc || '').localeCompare(b.desc || '');
    zero.sort(bySize); cons.sort(bySize);
    return { zeroTxn: zero, constCount: cons };
  }, [allData, meta.latestActual]);

  const [q1, setQ1] = React.useState('');
  const [q2, setQ2] = React.useState('');
  const filt = (arr, q) => { const s = q.trim().toLowerCase(); return s ? arr.filter(x => (x.desc + ' ' + x.code).toLowerCase().includes(s)) : arr; };

  // Item drill-down: reuse the same forecast card as New Items / Action Flow.
  const [itemSel, setItemSel] = React.useState(null);
  const itemDetail = React.useMemo(() => {
    if (!itemSel) return null;
    const rows = (allData || []).filter(d => d.itemCode === itemSel).sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
    if (!rows.length) return null;
    return { itemCode: itemSel, description: rows[0].description || itemSel, isHV: rows[0].isHV, periods: rows };
  }, [itemSel, allData]);

  if (!meta.latestActual) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 14, lineHeight: 1.6 }}>No actual history yet — dormancy is measured from observed movements, which appear once a month has actuals.</div>;
  }

  const windowLabel = `${fmtShort(meta.firstActual)} → ${fmtShort(meta.latestActual)}`;

  // Plain functions (called inline, NOT mounted as <Component/>) so the filter
  // inputs keep focus across the re-render each keystroke triggers.
  const row = (it, showValue) => (
    <button key={it.code} onClick={() => setItemSel(it.code)} title="View item history"
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #F3F4F6', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {it.isHV && <span style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0 }}>★</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.desc}>{it.desc}</div>
        <div style={{ fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--text-3)', marginTop: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>{it.code}</span>
          {showValue && <span>held {fmtNum(it.value)}</span>}
          <span>{fmtShort(it.start)} → {fmtShort(it.end)}</span>
        </div>
      </div>
      {it.ongoing
        ? <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, color: '#B45309', background: 'rgba(217,119,6,.12)', padding: '2px 7px', borderRadius: 10, letterSpacing: '.02em' }}>STILL IDLE</span>
        : <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 600, color: 'var(--text-3)', background: 'var(--surface-2,#F3F4F7)', padding: '2px 7px', borderRadius: 10 }}>ended</span>}
      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--accent)', minWidth: 42, textAlign: 'right' }}>{it.months} mo</span>
    </button>
  );

  const panel = (title, subtitle, items, total, q, setQ, showValue) => (
    <div style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{total}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.45 }}>{subtitle}</div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter items…"
          style={{ marginTop: 10, width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11.5, fontFamily: 'var(--font)', color: 'var(--text)', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="h-scroller">
        {items.length ? items.map(it => row(it, showValue))
          : <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No matching items.</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '14px 24px 0', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0, marginBottom: 6 }}>
        {[
          { label: 'No transactions ≥ 1yr', value: zeroTxn.length, sub: 'items idle 12+ months' },
          { label: 'Constant count ≥ 1yr', value: constCount.length, sub: 'balance unchanged 12+ months' },
          { label: 'Observed window', value: windowLabel, sub: 'actual movements' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', minWidth: 130 }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)', lineHeight: 1.1 }}>{c.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>{c.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.45, flexShrink: 0 }}>
        Dormancy is measured from <strong>actual</strong> movements over the observed window. “Still idle” means the streak runs up to the latest month with actuals. Click any item to see its full history.
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 14, overflow: 'hidden', paddingBottom: 14, minHeight: 0 }}>
        {panel("No transactions for 12+ months", "Zero deliveries or returns — the item just sat in place for a full year or more.", filt(zeroTxn, q1), zeroTxn.length, q1, setQ1, false)}
        {panel("Constant count for 12+ months", "On-hand closing balance never changed for a full year or more.", filt(constCount, q2), constCount.length, q2, setQ2, true)}
      </div>

      {itemDetail && (
        <div onClick={() => setItemSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} className="h-scroller" style={{ background: '#fff', borderRadius: 14, width: 'min(920px, 94vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.28)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{itemDetail.isHV && <span style={{ color: 'var(--accent)' }}>★ </span>}{itemDetail.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{itemDetail.itemCode} · {itemDetail.periods.length} month{itemDetail.periods.length === 1 ? '' : 's'} tracked</div>
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
window.DormantItemsPage = DormantItemsPage;
