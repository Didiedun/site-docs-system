import { useState } from "react";
import {
  DOCUMENT_TEMPLATES,
  downloadTemplate,
  type DocumentTemplate,
} from "../infrastructure/templates";
import { Icon } from "./Icons";
import { PageHeading, EmptyState, ErrorNotice } from "./WorkspaceUI";

export function TemplateLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState<DocumentTemplate | null>(null);
  const [message, setMessage] = useState("");
  const filtered = DOCUMENT_TEMPLATES.filter(
    (t) =>
      (category === "Semua" || t.category === category) &&
      `${t.title} ${t.description} ${t.fields}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  async function download(template: DocumentTemplate) {
    if (pending) return;
    setPending(template.id);
    setFailed(null);
    setMessage("");
    try {
      await downloadTemplate(template);
      setMessage(`Muat turun ${template.title} telah dimulakan.`);
    } catch {
      setFailed(template);
    } finally {
      setPending(null);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PUSTAKA RUJUKAN"
        title="Templat & contoh surat"
        description="Cari format yang diperlukan, muat turun dan sesuaikan untuk projek anda."
      />
      <section
        className="template-intro"
        aria-label="Panduan penggunaan templat"
      >
        <span className="template-intro-icon">
          <Icon name="templates" size={26} />
        </span>
        <div>
          <h2>Format tersedia. Maklumat anda isi.</h2>
          <p>
            Semua fail Word mempunyai medan <strong>[DALAM KURUNG]</strong>{" "}
            untuk diganti. Semak nama, tarikh, rujukan dan kandungan sebelum
            mengeluarkan dokumen rasmi.
          </p>
        </div>
        <span className="template-total">
          <strong>{DOCUMENT_TEMPLATES.length}</strong> templat Word
        </span>
      </section>
      <section className="template-library" aria-label="Senarai templat">
        <div className="template-filters">
          <label className="template-search">
            <Icon name="search" size={18} />
            <span className="sr-only">Cari templat</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari surat, borang atau tujuan…"
            />
          </label>
          <label className="template-category">
            <span>Kategori</span>
            <select
              aria-label="Kategori"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Semua</option>
              <option>Kelulusan kerja</option>
              <option>Serahan &amp; aset</option>
            </select>
          </label>
        </div>
        <div className="template-results" role="status">
          {filtered.length} daripada {DOCUMENT_TEMPLATES.length} templat
        </div>
        {failed && (
          <ErrorNotice
            message={`“${failed.title}” belum dimuat turun. Semak sambungan dan sesi log masuk anda.`}
            retry={pending ? undefined : () => void download(failed)}
          />
        )}
        <p className="sr-only" role="status">
          {pending ? "Menyediakan muat turun…" : message}
        </p>
        {!filtered.length ? (
          <EmptyState title="Tiada templat sepadan">
            <p>Cuba kata kunci lain atau lihat semua kategori.</p>
            <button
              className="btn"
              onClick={() => {
                setQuery("");
                setCategory("Semua");
              }}
            >
              Tetapkan semula carian
            </button>
          </EmptyState>
        ) : (
          <div className="template-list">
            {filtered.map((t, index) => (
              <article className="template-row" key={t.id}>
                <div className="template-file-mark" aria-hidden="true">
                  <Icon name="document" size={27} />
                  <span>DOCX</span>
                </div>
                <div className="template-info">
                  <div className="template-labels">
                    <span>{t.category}</span>
                    <span>{t.kind}</span>
                  </div>
                  <h2>{t.title}</h2>
                  <p>{t.description}</p>
                  <details>
                    <summary>Maklumat yang perlu diganti</summary>
                    <p>{t.fields}</p>
                  </details>
                </div>
                <div className="template-download">
                  <span>Word · {Math.ceil(t.bytes / 1024)} KB</span>
                  <button
                    className="btn"
                    disabled={!!pending}
                    aria-label={`Muat turun ${t.title}`}
                    onClick={() => void download(t)}
                  >
                    <Icon name="download" size={16} />
                    {pending === t.id ? "Menyediakan…" : "Muat turun"}
                  </button>
                  <span className="template-order" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="template-footnote">
        Muat turun dalam format .docx untuk diedit menggunakan Microsoft Word
        atau aplikasi yang serasi.
      </p>
    </>
  );
}
