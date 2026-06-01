import { DocumentStudio } from './DocumentStudio';

export default function App() {
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
      <footer className="app-footer">Dibangunkan oleh <b>didiedun x hadirahafiqah</b></footer>
    </div>
  );
}
