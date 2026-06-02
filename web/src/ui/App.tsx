import { useEffect } from 'react';
import { DocumentStudio } from './DocumentStudio';

export default function App() {
  // Wake the (free-tier) backend the moment the app opens, and keep it warm
  // while open, so it isn't asleep when the user taps Generate.
  useEffect(() => {
    const url = import.meta.env.VITE_BACKEND_URL as string | undefined;
    if (!url) return;
    const ping = () => fetch(`${url}/health`).catch(() => {});
    ping();
    const id = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <img className="brand-logo" src="/utm-logo.png" alt="UTM" />
        <div>
          <div className="brand-title">Sistem Dokumen Tapak</div>
          <div className="brand-sub">UTM · Jabatan TNC (Pembangunan) — Laporan Harian Tapak Bina</div>
        </div>
      </header>
      <div className="gold-rule" />
      <main className="app-main"><DocumentStudio projectId="demo-project" /></main>
      <footer className="app-footer">Dibangunkan oleh <b>Daniel Dun</b> untuk <b>Hadirah</b></footer>
    </div>
  );
}