/* Data Source Modal — light theme */

function DataSourceModal({ open, onClose }) {
  const [activeTab, setActiveTab] = React.useState('upload');
  if (!open) return null;

  const tabs = [
    { id: 'upload', label: 'File Upload', icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></> },
    { id: 'drive', label: 'Google Drive', icon: <><path d="M12 2L2 19h20L12 2z"></path></> },
    { id: 'github', label: 'GitHub', icon: <><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></> },
    { id: 'database', label: 'Database', icon: <><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></> },
  ];

  const fieldStyle = { width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', transition: 'border-color .15s' };
  const btnStyle = { padding: '11px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', width: '100%', transition: 'opacity .15s' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, width: 520, maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Connect Data Source</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'var(--surface-2)', border: 'none', color: 'var(--text-2)', cursor: 'pointer', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1, transition: 'background .12s, color .12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)'; }}>×</button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 550, cursor: 'pointer', border: 'none', fontFamily: 'var(--font)',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-2)',
              background: activeTab === tab.id ? 'var(--accent-surface)' : 'transparent',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
              transition: 'all .15s',
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{tab.icon}</svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        {/* Body */}
        <div style={{ padding: 24 }}>
          {activeTab === 'upload' && (
            <ModalUploadTab btnStyle={btnStyle} onClose={onClose} />
          )}
          {activeTab === 'drive' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Connect Google Drive</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Link a Google Sheet or Drive folder for auto-sync</div>
              </div>
              <input placeholder="Paste Google Sheet URL…" style={fieldStyle} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              <button style={btnStyle}>Connect</button>
            </div>
          )}
          {activeTab === 'github' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Repository URL</label><input placeholder="https://github.com/org/repo" style={fieldStyle} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Branch</label><input placeholder="main" style={fieldStyle} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>File Path</label><input placeholder="data/predictions.xlsx" style={fieldStyle} /></div>
              </div>
              <div><label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Access Token (optional)</label><input type="password" placeholder="ghp_xxxxxxxxxxxx" style={fieldStyle} /></div>
              <button style={{ ...btnStyle, marginTop: 4 }}>Connect Repository</button>
            </div>
          )}
          {activeTab === 'database' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Database Type</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['PostgreSQL', 'MySQL', 'SQLite', 'MSSQL'].map(db => (
                    <button key={db} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 550, cursor: 'pointer', fontFamily: 'var(--font)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>{db}</button>
                  ))}
                </div>
              </div>
              <input placeholder="Host" style={fieldStyle} />
              <div style={{ display: 'flex', gap: 10 }}><input placeholder="Port" style={{ ...fieldStyle, maxWidth: 100 }} /><input placeholder="Database name" style={fieldStyle} /></div>
              <div style={{ display: 'flex', gap: 10 }}><input placeholder="Username" style={fieldStyle} /><input type="password" placeholder="Password" style={fieldStyle} /></div>
              <button style={{ ...btnStyle, marginTop: 4 }}>Test Connection</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalUploadTab({ btnStyle, onClose }) {
  const [file, setFile] = React.useState(null);
  const [status, setStatus] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { setStatus('error'); setErrorMsg('Only .xlsx, .xls or .csv accepted.'); return; }
    if (f.size > 200 * 1024 * 1024) { setStatus('error'); setErrorMsg('File exceeds 200MB.'); return; }
    setFile(f); setStatus(null); setErrorMsg('');
  };

  const apply = async () => {
    if (!file) return;
    setStatus('uploading'); setErrorMsg('');
    try {
      const parentDoc = window.parent.document;
      const input = parentDoc.querySelector('[data-testid="stFileUploaderDropzoneInput"]')
        || parentDoc.querySelector('[data-testid="stFileUploader"] input[type="file"]')
        || parentDoc.querySelector('input[type="file"]');
      if (!input) throw new Error('Host uploader not found.');
      const dt = new DataTransfer();
      dt.items.add(file);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').set;
      setter.call(input, dt.files);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      setStatus('done');
      setTimeout(() => onClose && onClose(), 700);
    } catch (err) {
      setStatus('error'); setErrorMsg(err.message || String(err));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 14, padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? 'var(--accent-surface)' : 'var(--surface-2)',
          transition: 'all .15s'
        }}>
        <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{file ? file.name : 'Drop your file here, or click to browse'}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{file ? `${Math.round(file.size/1024)} KB · ready` : 'Supports .xlsx, .xls, .csv up to 200MB'}</div>
      </div>
      {status === 'error' && <div style={{ fontSize: 12, color: '#DC2626', background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.18)', padding: '8px 12px', borderRadius: 8 }}>{errorMsg}</div>}
      {status === 'done' && <div style={{ fontSize: 12, color: '#059669', background: 'rgba(5,150,105,.06)', border: '1px solid rgba(5,150,105,.15)', padding: '8px 12px', borderRadius: 8 }}>Applied · refreshing dashboard…</div>}
      <button onClick={apply} disabled={!file || status === 'uploading' || status === 'done'} style={{ ...btnStyle, opacity: (!file || status === 'uploading' || status === 'done') ? .55 : 1, cursor: (!file || status === 'uploading') ? 'default' : 'pointer' }}>{status === 'uploading' ? 'Uploading…' : 'Upload & Process'}</button>
    </div>
  );
}

window.DataSourceModal = DataSourceModal;
window.ModalUploadTab = ModalUploadTab;
