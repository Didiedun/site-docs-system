import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { LoginPage } from './LoginPage';
import { Layout, type Page } from './Layout';
import { Dashboard } from './Dashboard';
import { DocumentStudio } from './DocumentStudio';
import { DocumentLibrary } from './DocumentLibrary';
import { CMGDTracker } from './CMGDTracker';
export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Memuatkan…</div>
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
