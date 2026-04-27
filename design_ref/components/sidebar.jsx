/* Sidebar component — light theme */

function Sidebar({ activePage, onNavigate, collapsed, onToggleCollapse, onOpenDataSource, itemCount }) {
  const nav = [
    { id: 'predictions', label: 'Monthly Predictions', icon: 'chart' },
    { id: 'explorer', label: 'Item Explorer', icon: 'table', badge: itemCount },
    { id: 'upload', label: 'Upload Data', icon: 'upload' },
  ];
  const config = [];

  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></>,
    table: <><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M3 15h18M9 3v18"></path></>,
    chart: <><rect x="3" y="12" width="4" height="8" rx="1"></rect><rect x="10" y="4" width="4" height="16" rx="1"></rect><rect x="17" y="8" width="4" height="12" rx="1"></rect></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></>,
    menu: <><line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></>,
    chevronL: <><polyline points="15 18 9 12 15 6"></polyline></>,
    chevronR: <><polyline points="9 18 15 12 9 6"></polyline></>,
  };

  const SvgIcon = ({ name, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
  );

  const renderItem = (item) => {
    const active = activePage === item.id;
    return (
      <button key={item.id} onClick={() => item.action ? item.action() : onNavigate(item.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '9px 0' : '9px 12px', borderRadius: 10, cursor: 'pointer',
          fontSize: 13, fontWeight: active ? 600 : 450, border: 'none', width: '100%', textAlign: 'left', fontFamily: 'var(--font)',
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: active ? 'var(--accent)' : 'var(--text-2)',
          background: active ? 'var(--accent-surface)' : 'transparent',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ opacity: active ? 1 : 0.55, display: 'flex' }}><SvgIcon name={item.icon} /></span>
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && item.badge && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: 'var(--accent-surface)', color: 'var(--accent)' }}>{item.badge}</span>}
      </button>
    );
  };

  return (
    <div style={{
      width: collapsed ? 60 : 220, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0, transition: 'width .2s ease',
    }}>
      {/* Logo — click to toggle collapse */}
      <div style={{ padding: collapsed ? '12px 6px' : '12px 10px', minHeight: 60, display: 'flex', alignItems: 'center' }}>
        <button onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: collapsed ? '6px 0' : '6px 8px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font)', textAlign: 'left',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10, transition: 'background .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #818CF8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em'
          }}>P</div>
          {!collapsed && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>Predictions</span>}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!collapsed && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', padding: '8px 12px 4px' }}>Dashboard</div>}
        {nav.map(renderItem)}
        {config.length > 0 && (<>
          {!collapsed && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', padding: '16px 12px 4px' }}>Settings</div>}
          {config.map(renderItem)}
        </>)}
      </nav>

      {!collapsed && (
        <div style={{ padding: '12px 12px 16px' }}>
          <button onClick={onOpenDataSource} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, width: '100%', textAlign: 'left', fontFamily: 'var(--font)',
            color: 'var(--accent)', background: 'var(--accent-surface)', border: '1px dashed var(--accent-border)',
          }}>
            <SvgIcon name="upload" size={15} />
            <span>Load New Data</span>
          </button>
        </div>
      )}
    </div>
  );
}

window.Sidebar = Sidebar;
