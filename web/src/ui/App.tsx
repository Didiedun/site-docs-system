import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { LoginPage } from './LoginPage';
import { Layout, type Page } from './Layout';
import { Dashboard } from './Dashboard';
import { DocumentStudio } from './DocumentStudio';
import { DocumentLibrary } from './DocumentLibrary';
import { CMGDTracker } from './CMGDTracker';
const PAGE_TITLE: Record<Page, string> = {
  dashboard: 'Dashboard',
  studio: 'Jana Dokumen',
  library: 'Arkib Dokumen',
  cmgd: 'CMGD',
};

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  // Unique per-view tab title (SPA — no router, so drive document.title from state)
  useEffect(() => {
    const section = loading ? 'Memuatkan…' : !user ? 'Log Masuk' : PAGE_TITLE[page];
    document.title = `${section} · Sistem Dokumen Tapak`;
  }, [page, user, loading]);

  // Keep the free-tier backend warm while logged in
  useEffect(() => {
    if (!user) return;
    const url = import.meta.env.VITE_BACKEND_URL as string | undefined;
    if (!url) return;
    const ping = () => fetch(`${url}/health`).catch(() => {});
    ping();
    const id = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'linear-gradient(160deg,#f6f3ee 0%,#ede8e0 100%)' }}>
        <div style={{ width: 72, height: 72, background: '#fff', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(122,12,46,.18)' }}>
          <img src="/utm-logo.png" alt="UTM" style={{ maxWidth: 52, maxHeight: 36, objectFit: 'contain' }} />
        </div>
        <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid rgba(122,12,46,.2)', borderTopColor: 'var(--maroon)', animation: 'spin .7s linear infinite' }} />
        <div style={{ color: 'var(--muted)', fontSize: 12.5, fontWeight: 600 }}>Memuatkan Sistem Dokumen Tapak…</div>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Layout page={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard onNavigate={(p) => setPage(p)} />}
      {page === 'studio' && <DocumentStudio projectId="demo-project" onSaved={() => {}} />}
      {page === 'library' && <DocumentLibrary onCreateNew={() => setPage('studio')} />}
      {page === 'cmgd' && <CMGDTracker />}
    </Layout>
  );
}
