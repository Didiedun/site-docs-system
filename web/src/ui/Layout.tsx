import { ReactNode, useState } from 'react';
import { useAuth } from './AuthProvider';

export type Page = 'dashboard' | 'studio' | 'library' | 'cmgd';

interface NavItem { id: Page; label: string; short: string }
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',     short: 'DB' },
  { id: 'studio',    label: 'Jana Dokumen',  short: 'JD' },
  { id: 'library',   label: 'Arkib Dokumen', short: 'AD' },
  { id: 'cmgd',      label: 'CMGD',          short: 'CG' },
];

export function Layout({ page, onNavigate, children }: { page: Page; onNavigate: (p: Page) => void; children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const avatarUrl: string | undefined = user?.user_metadata?.['avatar_url'];
  const fullName: string | undefined = user?.user_metadata?.['full_name'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top header */}
      <header style={{ background: 'linear-gradient(180deg,var(--maroon),#5c0a23)', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', boxShadow: '0 2px 10px rgba(0,0,0,.2)', zIndex: 20, flexShrink: 0 }}>
        <img src="/utm-logo.png" alt="UTM" style={{ height: 36, width: 36, objectFit: 'contain', background: '#fff', borderRadius: 8, padding: 3, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Sistem Dokumen Tapak</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>UTM · Jabatan TNC (Pembangunan)</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{fullName ?? user?.email?.split('@')[0]}</div>
            <div style={{ opacity: 0.7, fontSize: 10.5 }}>{user?.email}</div>
          </div>
          {avatarUrl && (
            <img src={avatarUrl} alt="" style={{ height: 30, width: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,.4)' }} />
          )}
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,.15)', borderTop: '1px solid rgba(255,255,255,.3)', borderRight: '1px solid rgba(255,255,255,.3)', borderBottom: '1px solid rgba(255,255,255,.3)', borderLeft: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            Log Keluar
          </button>
        </div>
      </header>
      <div style={{ height: 3, background: 'var(--gold)', flexShrink: 0 }} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{ width: collapsed ? 54 : 200, minWidth: collapsed ? 54 : 200, background: '#fff', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', transition: 'width .2s, min-width .2s', overflow: 'hidden', flexShrink: 0 }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            style={{ background: 'none', borderTop: 'none', borderRight: 'none', borderBottom: '1px solid var(--line)', borderLeft: 'none', cursor: 'pointer', padding: '9px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 15, lineHeight: 1, width: '100%' }}
          >
            {collapsed ? '›' : '‹'}
          </button>
          <nav style={{ flex: 1, paddingTop: 6 }}>
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => onNavigate(n.id)}
                title={collapsed ? n.label : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '12px 0' : '12px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: page === n.id ? 'rgba(122,12,46,.07)' : 'transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeft: page === n.id ? '3px solid var(--maroon)' : '3px solid transparent',
                  cursor: 'pointer',
                  color: page === n.id ? 'var(--maroon)' : 'var(--ink)',
                  fontWeight: page === n.id ? 700 : 500,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'background .12s',
                }}
              >
                {collapsed
                  ? <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.03em' }}>{n.short}</span>
                  : <span>{n.label}</span>
                }
              </button>
            ))}
          </nav>
          {!collapsed && (
            <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--line)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.6 }}>
              Oleh <b style={{ color: 'var(--maroon)' }}>Daniel Dun</b><br />
              untuk <b style={{ color: 'var(--maroon)' }}>Hadirah</b>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '22px 22px 40px', overflowY: 'auto', background: 'var(--paper)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
