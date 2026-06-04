/* Upload Data page */

function UploadDataPage({ onOpenDataSource }) {
  const expectedCols = ['Item Code', 'Item Description', 'Is HV', 'Tier', 'Period', 'Prev Closing Balance', 'Predicted Closing Bal', 'Actual Closing Bal', 'Difference', 'Predicted Action', 'Actual Action', 'Direction Correct', 'Quantity', 'Item MAPE (%)'];
  const sourceLabel = (typeof window !== 'undefined' && window.__SOURCE_LABEL) || 'Bundled · Re_Forecast_2026_JanFeb_train24_25.xlsx';

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Upload Data</h2>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Upload the monthly stock ledger export — it goes straight to the forecasting pipeline, which validates it and refreshes the predictions.
        </div>
      </div>

      {/* Update forecasts via the pipeline API (the main flow) */}
      <LedgerUpdateCard />

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

/* Upload a monthly ledger -> forecast pipeline (server-side) -> Supabase.
   Reads window.__UPLOAD_JOB (injected by app.py) to show the live state. */
function LedgerUpdateCard() {
  const job = (typeof window !== 'undefined' && window.__UPLOAD_JOB) || null;
  const status = job && job.status;
  const active = status === 'queued' || status === 'running';
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

  const wrap = { background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 };

  if (active) {
    return (
      <div style={{ ...wrap, borderColor: 'var(--accent-border)', background: 'var(--accent-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'fi-spin .8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.22-8.56"></path></svg>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>Updating forecasts{job.year_month ? ' · ' + job.year_month : ''}</div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {job.current_step || 'Pipeline running…'}<br />
          The model is retraining on the server — this takes about <b>12–18 minutes</b>. You can keep using the dashboard; it refreshes on its own when the run finishes.
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>Job {String(job.job_id || '').slice(0, 8)} · started {job.started_at}</div>
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <div style={{ ...wrap, borderColor: 'rgba(5,150,105,.25)', background: 'rgba(5,150,105,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.4"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#047857' }}>Forecasts updated{job.year_month ? ' for ' + job.year_month : ''}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>The dashboard now shows the fresh predictions from the retrained model.</div>
          </div>
          <button onClick={dismiss} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Done</button>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ ...wrap, borderColor: 'rgba(220,38,38,.25)', background: 'rgba(220,38,38,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#B91C1C' }}>Pipeline failed</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.5 }}>{job.error_message || 'The forecast pipeline reported an error. Check the ledger format and try again.'}</div>
          </div>
          <button onClick={dismiss} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Dismiss</button>
        </div>
      </div>
    );
  }

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

Object.assign(window, { UploadDataPage, LedgerUpdateCard });
