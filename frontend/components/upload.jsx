/* Upload Data page */

function UploadDataPage({ onOpenDataSource }) {
  const sourceLabel = (typeof window !== 'undefined' && window.__SOURCE_LABEL) || 'Bundled · Re_Forecast_2026_JanFeb_train24_25.xlsx';
  const job = (typeof window !== 'undefined' && window.__UPLOAD_JOB) || null;
  const hasJob = !!(job && job.job_id);
  const [mode, setMode] = React.useState('consolidate');

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Upload Data</h2>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Refresh the forecast with a new month. Switch between consolidating several company files (the server merges them) and uploading a single ready ledger.
        </div>
      </div>

      {/* A job in flight takes over the whole area; otherwise a toggle picks the
          upload mode (consolidate multiple company files vs a single file). */}
      {hasJob ? (
        <LedgerUpdateCard />
      ) : (
        <React.Fragment>
          <LatestRunStatus />
          <div style={{ display: 'inline-flex', gap: 3, padding: 4, background: 'var(--surface-2,#F3F4F7)', borderRadius: 10, marginBottom: 18 }}>
            {[['consolidate', 'Consolidate company files'], ['single', 'Single file']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '8px 16px', fontSize: 12.5, fontWeight: mode === m ? 700 : 600, border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)',
                background: mode === m ? '#fff' : 'transparent', color: mode === m ? 'var(--accent)' : 'var(--text-2)',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,.08)' : 'none', transition: 'all .12s',
              }}>{label}</button>
            ))}
          </div>
          {mode === 'consolidate' ? <ConsolidateCard /> : <LedgerUpdateCard />}
        </React.Fragment>
      )}

      {/* Current source info */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,70,229,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Active Source</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sourceLabel}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>Loaded: {new Date().toLocaleDateString()}</div>
        </div>
        <button onClick={() => window.__resetToBundled && window.__resetToBundled()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD0D8', background: '#fff', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'background .12s, border-color .12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.borderColor = 'var(--text-3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#CBD0D8'; }}>Reset to Bundled</button>
      </div>

    </div>
  );
}

function DropZone() {
  const [dragOver, setDragOver] = React.useState(false);
  const [file, setFile] = React.useState(null);
  const [status, setStatus] = React.useState(null); // null | 'uploading' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = React.useState('');
  const fileRef = React.useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const ok = /\.(xlsx|xls|csv)$/i.test(f.name);
    if (!ok) { setStatus('error'); setErrorMsg('Only .xlsx, .xls or .csv files are accepted.'); return; }
    if (f.size > 200 * 1024 * 1024) { setStatus('error'); setErrorMsg('File exceeds 200MB limit.'); return; }
    setFile(f);
    setStatus(null);
    setErrorMsg('');
  };

  const apply = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg('');
    try {
      const parentDoc = window.parent.document;
      const input = parentDoc.querySelector('[data-testid="stFileUploaderDropzoneInput"]')
        || parentDoc.querySelector('[data-testid="stFileUploader"] input[type="file"]')
        || parentDoc.querySelector('input[type="file"]');
      if (!input) {
        throw new Error('Host uploader not found. Use the toolbar uploader at the top of the page.');
      }
      const dt = new DataTransfer();
      dt.items.add(file);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').set;
      setter.call(input, dt.files);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || String(err));
    }
  };

  const clear = () => { setFile(null); setStatus(null); setErrorMsg(''); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div>
      <div onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : '#C4C9D2'}`,
          borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? 'rgba(79,70,229,.04)' : '#FAFBFC',
          transition: 'all .15s',
        }}>
        <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dragOver ? 'var(--accent)' : 'var(--text-2)'} strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Click to browse, or drag and drop</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>200MB per file · CSV, XLSX, XLS</span>
          </div>
        </div>
      </div>

      {file && status !== 'error' && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(5,150,105,.06)', borderRadius: 8, border: '1px solid rgba(5,150,105,.15)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(file.size / 1024)} KB</span>
          {status === null && (
            <>
              <button onClick={clear} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>
              <button onClick={apply} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Apply</button>
            </>
          )}
          {status === 'uploading' && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Uploading…</span>}
          {status === 'done' && <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>Applied · refreshing dashboard</span>}
        </div>
      )}

      {status === 'error' && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(220,38,38,.06)', borderRadius: 8, border: '1px solid rgba(220,38,38,.18)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', flex: 1 }}>{errorMsg}</span>
          <button onClick={clear} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

/* ---- Live pipeline progress (Sonu's step-by-step + validation view) -------
   While a job is in flight we poll Supabase directly from the browser:
     pipeline_jobs   (by job_id)     -> phase/status/current_step/error
     validation_runs (by year_month) -> each validation check + hard stop
   Polling client-side means the panel updates smoothly with no iframe reload
   during the 12-18 min wait. */

function PhIcon({ s, sm, big }) {
  const sz = big ? 22 : sm ? 15 : 18;
  const ring = { width: sz, height: sz, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' };
  if (s === 'running') return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" style={{ animation: 'fi-spin .8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.22-8.56"></path></svg>);
  if (s === 'pass') return (<span style={{ ...ring, background: '#059669' }}><svg width={Math.round(sz * 0.6)} height={Math.round(sz * 0.6)} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>);
  if (s === 'fail') return (<span style={{ ...ring, background: '#DC2626' }}><svg width={Math.round(sz * 0.52)} height={Math.round(sz * 0.52)} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>);
  if (s === 'warn') return (<span style={{ ...ring, background: '#D97706' }}><svg width={Math.round(sz * 0.5)} height={Math.round(sz * 0.5)} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round"><line x1="12" y1="6" x2="12" y2="13"></line><line x1="12" y1="17.5" x2="12" y2="17.5"></line></svg></span>);
  if (s === 'skip') return (<span style={{ ...ring, background: '#E5E7EB' }}><svg width={Math.round(sz * 0.5)} height={Math.round(sz * 0.5)} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg></span>);
  return (<span style={{ ...ring, border: '2px solid #D1D5DB' }}></span>);
}

function CheckRow({ c }) {
  // The pipeline emits PASS / WARNING / FAIL. WARNING = non-blocking (auto-fixed
  // or flagged for review) — the run still succeeds, so show it amber, not red.
  const s = String(c.status || '').toUpperCase();
  const kind = s === 'PASS' ? 'pass' : s === 'FAIL' ? 'fail' : 'warn';
  const nameColor = kind === 'fail' ? '#B91C1C' : kind === 'warn' ? '#92400E' : 'var(--text)';
  const tagColor = kind === 'fail' ? '#DC2626' : kind === 'warn' ? '#B45309' : '#059669';
  const tag = kind === 'fail' ? 'FAIL' : kind === 'warn' ? 'WARNING' : 'PASS';
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'flex-start' }}>
      <div style={{ marginTop: 1 }}><PhIcon s={kind} sm /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: nameColor }}>
          {c.name}
          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.04em', color: tagColor }}>{tag}</span>
        </div>
        {c.message && <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.45 }}>{c.message}</div>}
      </div>
    </div>
  );
}

function PhaseRow({ s, title, detail, children }) {
  const muted = s === 'pending' || s === 'skip';
  return (
    <div style={{ display: 'flex', gap: 12, padding: '7px 0' }}>
      <div style={{ marginTop: 1 }}><PhIcon s={s} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: muted ? 'var(--text-3)' : 'var(--text)' }}>{title}</div>
        {detail && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.5 }}>{detail}</div>}
        {children}
      </div>
    </div>
  );
}

function JobProgress({ job, onDismiss, onDone }) {
  const [jobRow, setJobRow] = React.useState(null);
  const [val, setVal] = React.useState(null);
  const firedDone = React.useRef(false);
  const attempts = React.useRef(0);

  React.useEffect(() => {
    let alive = true, timer = null;
    const base = window.__SUPABASE_URL, key = window.__SUPABASE_KEY;
    const get = async (path) => {
      if (!base || !key) return null;
      try {
        const r = await fetch(base + '/rest/v1/' + path, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
        if (!r.ok) return null;
        return await r.json();
      } catch (e) { return null; }
    };
    const poll = async () => {
      attempts.current += 1;
      let jr = null;
      if (job.job_id) {
        const rows = await get('pipeline_jobs?select=*&limit=1&job_id=eq.' + encodeURIComponent(job.job_id));
        jr = (rows && rows[0]) || null;
      }
      const ym = (jr && jr.year_month) || job.year_month;
      // Match THIS upload's validation run (the same month can have many):
      // year_month within a short window of when the job started. Anchor on
      // the pipeline_jobs row if present, else the upload time we recorded —
      // a validation row can exist even when the job row doesn't (early fail).
      const anchor = (jr && jr.created_at) || job.started_iso;
      let vr = null;
      if (ym && anchor) {
        const lower = new Date(new Date(anchor).getTime() - 120000).toISOString();
        const rows = await get('validation_runs?select=*&order=upload_timestamp.desc&limit=1&year_month=eq.' + encodeURIComponent(ym) + '&upload_timestamp=gte.' + encodeURIComponent(lower));
        vr = (rows && rows[0]) || null;
      }
      if (!alive) return;
      if (jr) setJobRow(jr);
      if (vr) setVal(vr);
      const vFail = vr && String(vr.overall_result || '').toUpperCase() === 'FAIL';
      const jStatus = (jr && jr.status) || job.status;
      const isDone = jStatus === 'complete';
      const isFail = jStatus === 'failed' || vFail;
      if (isDone && job.status !== 'complete' && !firedDone.current) {
        firedDone.current = true;
        try { onDone && onDone(); } catch (e) { /* noop */ }
      }
      // Keep polling until the outcome is known — a validation hard stop can
      // write a validation_runs FAIL row with no pipeline_jobs row, so don't
      // gate on job status alone. Capped so it never spins forever (~26 min).
      if (!isDone && !isFail && attempts.current < 400) timer = setTimeout(poll, 4000);
    };
    poll();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [job.job_id]);

  const status = (jobRow && jobRow.status) || job.status || 'queued';
  const ym = (jobRow && jobRow.year_month) || job.year_month;
  const checksRaw = (val && val.checks_summary) || [];
  const checks = checksRaw.slice().sort((a, b) => (a.check_id || 0) - (b.check_id || 0));
  const overall = val && String(val.overall_result || '').toUpperCase();
  // The pipeline marks non-blocking checks WARNING and the run PASS_WITH_WARNINGS
  // — anything starting with PASS is a success, not a failure.
  const overallPass = !!overall && overall.indexOf('PASS') === 0;
  const passCount = checks.filter(c => String(c.status || '').toUpperCase() === 'PASS').length;
  const warnCount = checks.filter(c => { const s = String(c.status || '').toUpperCase(); return s !== 'PASS' && s !== 'FAIL'; }).length;
  const autofixes = (val && val.auto_fixes_applied) || [];
  const hardStopReason = val && val.hard_stop_reason;
  const hardStop = hardStopReason || (status === 'failed' ? ((jobRow && jobRow.error_message) || job.error_message) : null);
  const frId = jobRow && jobRow.forecast_run_id;
  const step = (jobRow && jobRow.current_step) || job.current_step;
  const failed = status === 'failed' || overall === 'FAIL';
  const done = status === 'complete';

  // The pipeline doesn't always write a validation_runs row on success — but
  // it does keep pipeline_jobs.current_step updated. Infer which stage the
  // run is in from that text so the phases advance live either way.
  const t = String(step || '').toLowerCase();
  const stage = !t ? null
    : /done|saved|complete|writ|insert|database|supabase/.test(t) ? 'save'
    : /sav/.test(t) ? 'save'
    : /train|model|forecast|generat|predict|season/.test(t) ? 'forecast'
    : /valid|pars|read|check|load|struct/.test(t) ? 'validate'
    : null;

  const valPassed = overallPass || done || !!frId || stage === 'forecast' || stage === 'save';
  const phUpload = 'pass';
  const phVal = overall === 'FAIL' ? 'fail'
    : valPassed ? 'pass'
    : failed ? 'fail'
    : 'running';
  const phFore = overall === 'FAIL' ? 'skip'
    : (done || !!frId || stage === 'save') ? 'pass'
    : failed ? (valPassed ? 'fail' : 'skip')
    : valPassed ? 'running'
    : 'pending';
  const phSave = done ? 'pass'
    : failed ? 'skip'
    : (phFore === 'pass' && stage === 'save') ? 'running'
    : 'pending';

  const tone = done ? '#047857' : failed ? '#B91C1C' : 'var(--accent)';
  const wrap = {
    border: '1px solid',
    borderColor: done ? 'rgba(5,150,105,.28)' : failed ? 'rgba(220,38,38,.26)' : 'var(--accent-border)',
    background: done ? 'rgba(5,150,105,.04)' : failed ? 'rgba(220,38,38,.035)' : 'var(--accent-surface)',
    borderRadius: 12, padding: 22, marginBottom: 20,
  };

  const valDetail = phVal === 'running' ? ((stage === 'validate' && step) ? step : 'Running the file & data checks…')
    : phVal === 'pass' ? (warnCount > 0 ? `${passCount} passed · ${warnCount} warning${warnCount > 1 ? 's' : ''} (auto-handled)` : 'All checks passed')
    : overall === 'FAIL' ? 'Stopped on a failing check'
    : 'Did not complete';
  const foreDetail = phFore === 'running' ? ((stage === 'forecast' && step) ? step : 'Retraining the model and generating the new forecast…')
    : phFore === 'pass' ? 'Model retrained on the latest month'
    : phFore === 'fail' ? ((jobRow && jobRow.error_message) || 'The forecasting step reported an error')
    : phFore === 'skip' ? 'Not run'
    : 'Waiting for validation to pass';
  const saveClean = step ? String(step).replace(/^\s*Done\s*[—–-]\s*/i, '') : '';
  const saveDetail = phSave === 'pass' ? (saveClean || 'Predictions written to the database')
    : phSave === 'running' ? (step || 'Saving predictions…')
    : phSave === 'skip' ? 'Not run' : '—';
  // Multi-company merge summary (present only when several files were consolidated).
  const mr = job.merge_report || null;

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <PhIcon s={done ? 'pass' : failed ? 'fail' : 'running'} big />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: tone }}>
            {done ? 'Forecasts updated' : failed ? 'Pipeline stopped' : 'Updating forecasts'}{ym ? ' · ' + ym : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.5 }}>
            {done ? (warnCount > 0 ? `Fresh predictions are live · ${warnCount} check${warnCount > 1 ? 's' : ''} raised warnings (auto-handled), see below.` : 'Fresh predictions are now live on the dashboard.')
              : failed ? (overall === 'FAIL' ? 'A validation check did not pass — see the details below.' : 'The pipeline reported an error — see the details below.')
              : 'Validating and retraining on the server — about 12–18 minutes. You can keep using the dashboard.'}
          </div>
        </div>
      </div>

      {mr && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 16px 12px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent-surface)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </span>
            <div style={{ fontSize: 12.5, fontWeight: 700, flex: 1, minWidth: 0 }}>Consolidated {((mr.files || []).length) || (mr.companies_detected || []).length || 0} file{(((mr.files || []).length) === 1) ? '' : 's'}</div>
            {mr.total_rows_merged != null && <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{Number(mr.total_rows_merged).toLocaleString()} rows</span>}
          </div>
          {(mr.companies_detected || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {mr.companies_detected.map((c, i) => (
                <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', padding: '2px 9px', borderRadius: 10, letterSpacing: '.02em' }}>{c}</span>
              ))}
            </div>
          )}
          {(mr.files || []).map((f, i) => {
            const s = String(f.status || '').toLowerCase();
            const ok = s === 'ok' || s === 'merged' || s === 'success' || s.indexOf('ok') === 0;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? '1px solid #F3F4F6' : 'none' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.filename}>{f.filename}</span>
                {f.company && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>{f.company}</span>}
                {f.rows != null && <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--mono)', minWidth: 56, textAlign: 'right' }}>{Number(f.rows).toLocaleString()} rows</span>}
                {f.status && <span style={{ fontSize: 9.5, fontWeight: 700, color: ok ? '#059669' : '#B45309', background: ok ? 'rgba(5,150,105,.1)' : 'rgba(217,119,6,.12)', padding: '1px 7px', borderRadius: 9, whiteSpace: 'nowrap' }}>{f.status}</span>}
              </div>
            );
          })}
          {(mr.item_names_not_in_map || []).length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#92400E', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.22)', borderRadius: 7, padding: '7px 10px', lineHeight: 1.45 }}>
              {mr.item_names_not_in_map.length} item name{mr.item_names_not_in_map.length === 1 ? '' : 's'} weren't in the code map (code left blank): {mr.item_names_not_in_map.slice(0, 8).join(', ')}{mr.item_names_not_in_map.length > 8 ? ` +${mr.item_names_not_in_map.length - 8} more` : ''}
            </div>
          )}
          {(mr.warnings || []).length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#92400E', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.22)', borderRadius: 7, padding: '7px 10px', lineHeight: 1.45 }}>
              {mr.warnings.map((w, i) => <div key={i}>{typeof w === 'string' ? w : (w.message || JSON.stringify(w))}</div>)}
            </div>
          )}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 16px' }}>
        <PhaseRow s={phUpload} title="Upload received" detail={'Ledger handed to the pipeline' + (ym ? ' · ' + ym : '')} />
        <PhaseRow s={phVal} title="Validation" detail={valDetail}>
          {checks.map((c, i) => <CheckRow key={i} c={c} />)}
          {autofixes.length > 0 && (
            <div style={{ marginTop: 9, fontSize: 11.5, color: '#92400E', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.22)', borderRadius: 7, padding: '7px 10px', lineHeight: 1.45 }}>
              Auto-fixed: {autofixes.map(a => typeof a === 'string' ? a : (a.message || a.name || JSON.stringify(a))).join('; ')}
            </div>
          )}
        </PhaseRow>
        <PhaseRow s={phFore} title="Forecasting" detail={foreDetail} />
        <PhaseRow s={phSave} title="Predictions saved" detail={saveDetail} />
      </div>

      {hardStop && (
        <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.22)', borderRadius: 9 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{hardStopReason ? 'Hard stop' : 'Pipeline error'}</div>
          <div style={{ fontSize: 12.5, color: '#7F1D1D', lineHeight: 1.5 }}>{hardStop}</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.job_id ? 'Job ' + String(job.job_id).slice(0, 8) : ''}{job.started_at ? ' · started ' + job.started_at : ''}{step && !done && !failed ? ' · ' + step : ''}
        </div>
        {(done || failed) && (
          <button onClick={onDismiss} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: done ? '#059669' : '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>{done ? 'Done' : 'Dismiss'}</button>
        )}
      </div>
    </div>
  );
}

/* ---- Persistent "last upload failed" banner ------------------------------
   The live JobProgress panel only exists while a session job is in flight, so
   a failure would vanish on refresh / in a fresh session / if no one was
   watching. This reads the latest run straight from Supabase whenever the
   upload card is idle, and surfaces the pipeline's failure reason so it is
   always visible in the front end. Dismissals are remembered (localStorage)
   until a NEWER failure appears. */
function LatestRunStatus() {
  const [info, setInfo] = React.useState(null);
  const [dismissedId, setDismissedId] = React.useState(() => {
    try { return localStorage.getItem('fi_fail_dismissed') || ''; } catch (e) { return ''; }
  });

  React.useEffect(() => {
    let alive = true;
    const base = window.__SUPABASE_URL, key = window.__SUPABASE_KEY;
    if (!base || !key) return;
    const get = async (path) => {
      try {
        const r = await fetch(base + '/rest/v1/' + path, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
        if (!r.ok) return null;
        return await r.json();
      } catch (e) { return null; }
    };
    (async () => {
      const [vrRows, pjRows] = await Promise.all([
        get('validation_runs?select=*&order=upload_timestamp.desc&limit=1'),
        get('pipeline_jobs?select=*&order=created_at.desc&limit=1'),
      ]);
      if (!alive) return;
      const vr = (vrRows && vrRows[0]) || null;
      const pj = (pjRows && pjRows[0]) || null;
      const vrFail = vr && String(vr.overall_result || '').toUpperCase() === 'FAIL' ? vr : null;
      const vrTime = vrFail ? new Date(vrFail.upload_timestamp).getTime() : -1;
      const pjTime = pj ? new Date(pj.created_at).getTime() : -1;
      // Show a failure only if the most recent upload event is a failure — a
      // newer successful run supersedes (and hides) an older failed one.
      if (vrFail && vrTime >= pjTime) {
        const checks = (vrFail.checks_summary || []).filter(c => String(c.status || '').toUpperCase() === 'FAIL');
        setInfo({ id: 'v' + vrFail.id, ym: vrFail.year_month, reason: vrFail.hard_stop_reason || 'Validation did not pass.', checks });
      } else if (pj && pj.status === 'failed') {
        setInfo({ id: 'j' + (pj.job_id || pj.id), ym: pj.year_month, reason: pj.error_message || 'The pipeline reported an error.', checks: [] });
      } else {
        setInfo(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!info || info.id === dismissedId) return null;

  const dismiss = () => {
    try { localStorage.setItem('fi_fail_dismissed', info.id); } catch (e) { /* noop */ }
    setDismissedId(info.id);
  };

  return (
    <div style={{ border: '1px solid rgba(220,38,38,.26)', background: 'rgba(220,38,38,.04)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <PhIcon s="fail" big />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#B91C1C' }}>Last upload failed{info.ym ? ' · ' + info.ym : ''}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.5 }}>The most recent ledger upload did not complete. The pipeline’s reason is below.</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px', background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.22)', borderRadius: 9 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Reason</div>
        <div style={{ fontSize: 12.5, color: '#7F1D1D', lineHeight: 1.5 }}>{info.reason}</div>
      </div>
      {info.checks.length > 0 && (
        <div style={{ marginTop: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 16px 12px' }}>
          {info.checks.map((c, i) => <CheckRow key={i} c={c} />)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>Fix the issue above and upload the month again, or contact the system administrator if it needs a reset.</div>
        <button onClick={dismiss} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #CBD0D8', background: '#fff', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>Dismiss</button>
      </div>
    </div>
  );
}

/* Consolidate several company ledgers (C20/C30/C50…) into one via the server.
   Files go to the dedicated multi-file bridge; the server merges + processes
   them in a single request. Hidden while a job is in flight — the shared
   JobProgress panel (from LedgerUpdateCard) takes over and shows the merge
   report. */
function ConsolidateCard() {
  const job = (typeof window !== 'undefined' && window.__UPLOAD_JOB) || null;
  const [files, setFiles] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const fileRef = React.useRef(null);

  if (job && job.job_id) return null; // a run is active — JobProgress shows instead

  // Drop the picked files onto the dedicated multi-file uploader in the host.
  const submit = (fileList) => {
    const pd = window.parent.document;
    const input = pd.querySelector('.st-key-consolidate_bridge input[type="file"]')
      || pd.querySelector('.st-key-consolidate_bridge [data-testid="stFileUploaderDropzoneInput"]');
    if (!input) throw new Error('Consolidation uploader not found. Reload the page and try again.');
    const dt = new DataTransfer();
    fileList.forEach(f => dt.items.add(f));
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').set;
    setter.call(input, dt.files);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const addFiles = (list) => {
    const incoming = Array.from(list || []).filter(f => /\.xlsx$/i.test(f.name));
    if (!incoming.length) { setErr('Only .xlsx files are accepted.'); return; }
    for (const f of incoming) { if (f.size > 50 * 1024 * 1024) { setErr(f.name + ' exceeds the 50 MB limit.'); return; } }
    setErr('');
    setFiles(prev => {
      const seen = new Set(prev.map(f => f.name + '|' + f.size));
      const out = prev.slice();
      incoming.forEach(f => { const k = f.name + '|' + f.size; if (!seen.has(k)) { seen.add(k); out.push(f); } });
      return out;
    });
  };
  const removeAt = (i) => setFiles(prev => prev.filter((_, k) => k !== i));

  const start = () => {
    if (!files.length) return;
    setBusy(true); setErr('');
    try { submit(files); }
    catch (e) { setBusy(false); setErr(e.message || String(e)); }
  };

  const wrap = { background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 };
  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--accent-surface)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        </span>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Consolidate company ledgers</div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
        Add the separate company ledger files (e.g. C20, C30, C50). The server detects each company, merges them into one, then validates and processes the result — no need to combine them by hand first.
      </div>
      <div onClick={() => fileRef.current && fileRef.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        style={{ border: '2px dashed #C4C9D2', borderRadius: 12, padding: '22px 20px', textAlign: 'center', cursor: 'pointer', background: '#FAFBFC' }}>
        <input type="file" ref={fileRef} accept=".xlsx" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Click to add company files</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>.xlsx · drag &amp; drop or click</span>
        </div>
      </div>
      {files.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => (
            <div key={f.name + i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--accent-surface)', borderRadius: 8, border: '1px solid var(--accent-border)' }}>
              <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--accent)', flexShrink: 0, width: 14, textAlign: 'center' }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{Math.round(f.size / 1024)} KB</span>
              <button onClick={() => removeAt(i)} disabled={busy} title="Remove" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-2)', fontSize: 14, lineHeight: 1, cursor: 'pointer', fontFamily: 'var(--font)' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-3)' }}>{files.length} file{files.length > 1 ? 's' : ''} ready{files.length > 1 ? ' — will be merged' : ''}</span>
            <button onClick={() => setFiles([])} disabled={busy} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-2)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Clear</button>
            <button onClick={start} disabled={busy} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'var(--font)' }}>{busy ? 'Consolidating…' : (files.length > 1 ? 'Consolidate & process' : 'Process file')}</button>
          </div>
        </div>
      )}
      {err && <div style={{ marginTop: 10, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{err}</div>}
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.55 }}>
        Send the raw company exports as-is. The server merges, validates, and trains in one step (about 12–18 minutes) — you'll see a merge summary and live progress below.
      </div>
    </div>
  );
}

/* Upload a monthly ledger -> forecast pipeline (server-side) -> Supabase.
   Reads window.__UPLOAD_JOB to bootstrap, then JobProgress polls Supabase for
   the live step-by-step + validation state. */
function LedgerUpdateCard() {
  const job = (typeof window !== 'undefined' && window.__UPLOAD_JOB) || null;
  const [picked, setPicked] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const fileRef = React.useRef(null);

  // Submit a file into the hidden Streamlit bridge uploader (same channel the
  // rest of the app uses). Python branches on the sentinel filename.
  const bridge = (file) => {
    const pd = window.parent.document;
    const input = pd.querySelector('[data-testid="stFileUploaderDropzoneInput"]')
      || pd.querySelector('[data-testid="stFileUploader"] input[type="file"]')
      || pd.querySelector('input[type="file"]');
    if (!input) throw new Error('Host uploader not found. Reload the page and try again.');
    const dt = new DataTransfer();
    dt.items.add(file);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').set;
    setter.call(input, dt.files);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const pick = (f) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) { setErr('The ledger must be an .xlsx file.'); return; }
    if (f.size > 50 * 1024 * 1024) { setErr('File exceeds the 50 MB limit.'); return; }
    setErr(''); setPicked(f);
  };

  const start = () => {
    if (!picked) return;
    setBusy(true); setErr('');
    try {
      bridge(new File([picked], '__LEDGER_UPLOAD__' + picked.name, { type: picked.type || 'application/octet-stream' }));
    } catch (e) { setBusy(false); setErr(e.message || String(e)); }
  };

  const dismiss = () => {
    try { bridge(new File([new Blob(['x'], { type: 'text/csv' })], '__JOB_CLEAR__' + Date.now() + '.csv', { type: 'text/csv' })); } catch (e) { /* noop */ }
  };

  // Browser-side signal that the pipeline finished, so the host pulls fresh
  // predictions immediately instead of waiting on the 30s backup poll.
  const markDone = () => {
    try { bridge(new File([new Blob(['x'], { type: 'text/csv' })], '__JOB_DONE__' + Date.now() + '.csv', { type: 'text/csv' })); } catch (e) { /* noop */ }
  };

  const wrap = { background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 };

  // Any queued / running / finished job -> the live step-by-step panel.
  if (job && job.job_id) return <JobProgress job={job} onDismiss={dismiss} onDone={markDone} />;

  return (
    <div style={wrap}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Update forecasts with a new month</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
        Upload the monthly stock ledger exactly as the system exports it — it goes straight to the forecasting pipeline, which validates and processes it and writes fresh predictions. The dashboard updates on its own when it finishes (about 12–18 minutes).
      </div>
      <div onClick={() => fileRef.current && fileRef.current.click()}
        style={{ border: '2px dashed #C4C9D2', borderRadius: 12, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', background: '#FAFBFC' }}>
        <input type="file" ref={fileRef} accept=".xlsx" style={{ display: 'none' }} onChange={e => pick(e.target.files[0])} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Click to choose the monthly ledger</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>.xlsx · up to 50 MB</span>
        </div>
      </div>
      {picked && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--accent-surface)', borderRadius: 8, border: '1px solid var(--accent-border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{picked.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(picked.size / 1024)} KB</span>
          <button onClick={() => { setPicked(null); if (fileRef.current) fileRef.current.value = ''; }} disabled={busy} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>
          <button onClick={start} disabled={busy} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'var(--font)' }}>{busy ? 'Starting…' : 'Start update'}</button>
        </div>
      )}
      {err && <div style={{ marginTop: 10, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{err}</div>}
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.55 }}>
        Upload the stock ledger export exactly as the system produces it (.xlsx) — no reformatting needed. The pipeline parses and validates it. One month per file; the month is detected from the dates.
      </div>
    </div>
  );
}

Object.assign(window, { UploadDataPage, LedgerUpdateCard, ConsolidateCard });
