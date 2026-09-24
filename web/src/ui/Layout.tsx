import { ReactNode, useState } from "react";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./WorkspaceUI";
import { Icon } from "./Icons";
export type Page = "dashboard" | "studio" | "library" | "cmgd" | "templates";
const NAV: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Ringkasan" },
  { id: "studio", label: "Jana dokumen" },
  { id: "library", label: "Arkib dokumen" },
  { id: "templates", label: "Templat surat" },
  { id: "cmgd", label: "Jejak CMGD" },
];
export function Layout({
  page,
  onNavigate,
  children,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  children: ReactNode;
}) {
  const { user, signOut, error: authError } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const fullName = user?.user_metadata?.["full_name"] as string | undefined;
  const name = fullName || user?.email?.split("@")[0] || "Pengguna";
  return (
    <div className={`workspace${collapsed ? " sidebar-collapsed" : ""}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Langkau ke kandungan
      </a>
      <aside className="workspace-sidebar">
        <div className="brand">
          <img src="/utm-logo.png" alt="UTM" />
          <div className="sidebar-label">
            <strong>
              Dokumen Tapak<span>Ruang kerja UTM</span>
            </strong>
          </div>
        </div>
        <div className="sidebar-caption sidebar-label">RUANG KERJA</div>
        <nav aria-label="Navigasi utama">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-link${page === n.id ? " active" : ""}`}
              aria-current={page === n.id ? "page" : undefined}
              aria-label={n.label}
              title={collapsed ? n.label : undefined}
              onClick={() => onNavigate(n.id)}
            >
              <Icon name={n.id} />
              <span className="sidebar-label">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note sidebar-label">
            <span className="status-dot" /> Sistem dokumen dalaman
            <p>Jabatan TNC (Pembangunan)</p>
          </div>
          <div className="account">
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <div className="sidebar-label account-name">
              <strong>{name}</strong>
              <span>{user?.email}</span>
            </div>
            <button
              className="icon-button"
              title="Log keluar"
              aria-label="Log keluar"
              onClick={signOut}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="icon-button sidebar-toggle"
              aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
            >
              <Icon name="chevron" />
            </button>
            <span>Ruang kerja</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{NAV.find((n) => n.id === page)?.label}</strong>
          </div>
          <span className="topbar-meta">UTM · Pembangunan</span>
          <button
            className="icon-button mobile-signout"
            aria-label="Log keluar"
            onClick={signOut}
          >
            <Icon name="logout" />
          </button>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={`workspace-main${page === "studio" ? " workspace-main-studio" : ""}`}
        >
          <div className="page-container">
            {authError && <ErrorNotice message={authError} />}
            {children}
          </div>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navigasi mudah alih">
        {NAV.map((n) => (
          <button
            key={n.id}
            aria-current={page === n.id ? "page" : undefined}
            className={page === n.id ? "active" : ""}
            onClick={() => onNavigate(n.id)}
          >
            <Icon name={n.id} size={20} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
