import { Component, type ReactNode } from "react";

export function ErrorPage({
  notFound = false,
  onRetry,
}: {
  notFound?: boolean;
  onRetry?: () => void;
}) {
  return (
    <main className="error-page">
      <section className="error-page-content">
        <img src="/utm-logo.png" alt="UTM" className="login-logo" />
        <p className="eyebrow">SISTEM DOKUMEN TAPAK</p>
        <div className="error-code" aria-hidden="true">
          {notFound ? "404" : "!"}
        </div>
        <h1>
          {notFound ? "Halaman tidak dijumpai." : "Ruang kerja tergendala."}
        </h1>
        <p>
          {notFound
            ? "Pautan ini mungkin telah berubah. Kembali ke ringkasan untuk meneruskan kerja anda."
            : "Halaman ini tidak dapat dipaparkan. Cuba muat semula untuk menyambung kerja anda. Draf yang telah disimpan pada peranti ini boleh dipulihkan di studio."}
        </p>
        <div className="error-actions">
          {!notFound && (
            <button className="btn btn-primary" onClick={onRetry}>
              Muat semula
            </button>
          )}
          <a
            className={`btn${notFound ? " btn-primary" : ""}`}
            href="/#dashboard"
            onClick={
              notFound
                ? undefined
                : (event) => {
                    event.preventDefault();
                    window.location.assign("/#dashboard");
                    window.location.reload();
                  }
            }
          >
            Kembali ke ringkasan
          </a>
        </div>
        <p className="error-help">
          Jika masalah berulang, hubungi pentadbir sistem.
        </p>
      </section>
    </main>
  );
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ErrorPage onRetry={() => window.location.reload()} />
    ) : (
      this.props.children
    );
  }
}
