import { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { LoginPage } from "./LoginPage";
import { Layout, type Page } from "./Layout";
import { Dashboard } from "./Dashboard";
import { DocumentStudio } from "./DocumentStudio";
import { DocumentLibrary } from "./DocumentLibrary";
import { ErrorPage } from "./ErrorPage";
import { CMGDTracker } from "./CMGDTracker";
const PAGE_TITLE: Record<Page, string> = {
  dashboard: "Ringkasan",
  studio: "Jana Dokumen",
  library: "Arkib Dokumen",
  cmgd: "CMGD",
};

export default function App() {
  const { user, loading } = useAuth();
  const readPage = (): Page | "not-found" => {
    const value = window.location.hash.slice(1);
    return Object.prototype.hasOwnProperty.call(PAGE_TITLE, value)
      ? (value as Page)
      : !value ||
          /^(access_token|error|code)=/.test(value) ||
          value === "main-content"
        ? "dashboard"
        : "not-found";
  };
  const [page, setPage] = useState<Page | "not-found">(readPage);
  const previousPage = useRef(page);
  const navigate = (next: Page) => {
    window.location.hash = next;
    setPage(next);
  };
  useEffect(() => {
    const changed = () => setPage(readPage());
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    if (previousPage.current !== page) {
      window.scrollTo(0, 0);
      document.getElementById("main-content")?.focus({ preventScroll: true });
      previousPage.current = page;
    }
  }, [page]);

  // Unique per-view tab title (SPA — no router, so drive document.title from state)
  useEffect(() => {
    const section = loading
      ? "Memuatkan…"
      : !user
        ? "Log Masuk"
        : page === "not-found"
          ? "Halaman tidak dijumpai"
          : PAGE_TITLE[page];
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

  if (loading)
    return (
      <main className="login-page">
        <div className="empty-state" role="status">
          <img className="login-logo" src="/utm-logo.png" alt="UTM" />
          <p>Memuatkan ruang kerja…</p>
        </div>
      </main>
    );

  if (!user) return <LoginPage />;
  if (page === "not-found") return <ErrorPage notFound />;

  return (
    <Layout page={page} onNavigate={navigate}>
      {page === "dashboard" && <Dashboard onNavigate={navigate} />}
      {page === "studio" && (
        <DocumentStudio projectId="demo-project" onSaved={() => {}} />
      )}
      {page === "library" && (
        <DocumentLibrary onCreateNew={() => navigate("studio")} />
      )}
      {page === "cmgd" && <CMGDTracker />}
    </Layout>
  );
}
