import { useEffect, useState } from "react";
import {
  listArchivedDocs,
  deleteArchivedDoc,
  type ArchivedDoc,
} from "../infrastructure/supabase/repositories";
import { DocViewerModal } from "./DocViewerModal";
import { Icon } from "./Icons";
import {
  PageHeading,
  EmptyState,
  LoadingRows,
  ErrorNotice,
  Dialog,
  KIND_LABEL,
  dateLabel,
} from "./WorkspaceUI";
export function DocumentLibrary({ onCreateNew }: { onCreateNew: () => void }) {
  const [docs, setDocs] = useState<ArchivedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [project, setProject] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState("newest");
  const [viewing, setViewing] = useState<ArchivedDoc | null>(null);
  const [deleting, setDeleting] = useState<ArchivedDoc | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  async function reload() {
    setLoading(true);
    setError("");
    try {
      setDocs(await listArchivedDocs());
    } catch {
      setError("Arkib tidak dapat dimuatkan. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteArchivedDoc(deleting.id!, deleting.html_path);
      setDeleting(null);
      await reload();
    } catch {
      setDeleteError("Dokumen tidak dapat dipadam. Sila cuba lagi.");
    } finally {
      setDeleteBusy(false);
    }
  }
  const projects = [
    ...new Set(docs.map((d) => d.project_name).filter((p): p is string => !!p)),
  ].sort();
  const query = search.trim().toLocaleLowerCase();
  const filtered = docs
    .filter(
      (d) =>
        (kind === "all" || d.kind === kind) &&
        (project === "all" || d.project_name === project) &&
        (!query ||
          `${d.title} ${d.project_name || ""}`
            .toLocaleLowerCase()
            .includes(query)) &&
        (period === "all" ||
          (!!d.created_at &&
            new Date(d.created_at).getTime() >=
              Date.now() - Number(period) * 86400000)),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "oldest"
          ? (a.created_at || "").localeCompare(b.created_at || "")
          : (b.created_at || "").localeCompare(a.created_at || ""),
    );
  function reset() {
    setSearch("");
    setKind("all");
    setProject("all");
    setPeriod("all");
  }
  return (
    <>
      <PageHeading
        eyebrow="DOKUMEN ANDA"
        title="Arkib dokumen"
        description="Cari, semak dan cetak semula dokumen tapak yang telah disimpan."
        action={
          <button className="btn btn-primary" onClick={onCreateNew}>
            <Icon name="plus" size={17} />
            Jana dokumen
          </button>
        }
      />
      <div className="filters">
        <label className="search-field">
          <Icon name="search" size={18} />
          <span className="sr-only">Cari dokumen</span>
          <input
            type="search"
            placeholder="Cari tajuk atau projek…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="filter-select"
          aria-label="Jenis dokumen"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">Semua jenis</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          aria-label="Projek"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="all">Semua projek</option>
          {projects.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          className="filter-select"
          aria-label="Tempoh dokumen"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">Semua tarikh</option>
          <option value="7">7 hari terakhir</option>
          <option value="30">30 hari terakhir</option>
          <option value="90">90 hari terakhir</option>
        </select>
        <select
          className="filter-select"
          aria-label="Susunan dokumen"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Terkini dahulu</option>
          <option value="oldest">Terlama dahulu</option>
          <option value="title">Tajuk A–Z</option>
        </select>
      </div>
      {error ? (
        <ErrorNotice message={error} retry={reload} />
      ) : (
        <section className="panel">
          {loading ? (
            <LoadingRows />
          ) : !filtered.length ? (
            <EmptyState
              title={
                docs.length
                  ? "Tiada dokumen sepadan"
                  : "Belum ada dokumen tersimpan"
              }
            >
              <p>
                {docs.length
                  ? "Cuba kata carian lain atau kosongkan penapis."
                  : "Dokumen yang anda simpan akan tersedia di sini."}
              </p>
              <button
                className="btn"
                onClick={docs.length ? reset : onCreateNew}
              >
                {docs.length ? "Kosongkan penapis" : "Jana dokumen pertama"}
              </button>
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Dokumen</th>
                    <th scope="col" className="kind-column">
                      Jenis
                    </th>
                    <th scope="col" className="project-column">
                      Projek
                    </th>
                    <th scope="col" className="date-column">
                      Disimpan
                    </th>
                    <th scope="col">
                      <span className="sr-only">Tindakan</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <button
                          className="document-title"
                          onClick={() => setViewing(d)}
                        >
                          {d.title}
                        </button>
                        <div className="mobile-doc-meta">
                          {KIND_LABEL[d.kind]} · {dateLabel(d.created_at)}
                          <br />
                          {d.project_name}
                        </div>
                      </td>
                      <td className="kind-column">
                        <span className="badge">{KIND_LABEL[d.kind]}</span>
                      </td>
                      <td className="project-column muted">
                        {d.project_name || "—"}
                      </td>
                      <td className="date-column muted">
                        {dateLabel(d.created_at)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="text-button"
                            onClick={() => setViewing(d)}
                          >
                            Buka
                          </button>
                          <details className="overflow-menu">
                            <summary aria-label={`Tindakan untuk ${d.title}`}>
                              ···
                            </summary>
                            <div className="menu-content">
                              <button
                                onClick={(e) => {
                                  e.currentTarget
                                    .closest("details")
                                    ?.removeAttribute("open");
                                  setDeleteError("");
                                  setDeleting(d);
                                }}
                              >
                                Padam dokumen
                              </button>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && (
            <div className="table-meta" role="status">
              {filtered.length} daripada {docs.length} dokumen
            </div>
          )}
        </section>
      )}
      {viewing && (
        <DocViewerModal
          url={viewing.signed_url ?? viewing.public_url}
          htmlPath={viewing.html_path}
          title={viewing.title}
          onClose={() => setViewing(null)}
        />
      )}
      {deleting && (
        <Dialog
          title="Padam dokumen?"
          onClose={() => {
            if (!deleteBusy) setDeleting(null);
          }}
        >
          <p>
            “{deleting.title}” akan dipadam daripada arkib. Tindakan ini tidak
            boleh dibatalkan.
          </p>
          {deleteError && <ErrorNotice message={deleteError} />}
          <div className="btn-row">
            <button
              className="btn"
              disabled={deleteBusy}
              onClick={() => setDeleting(null)}
            >
              Batal
            </button>
            <button
              className="btn btn-danger"
              disabled={deleteBusy}
              onClick={handleDelete}
            >
              {deleteBusy ? "Memadam…" : "Padam dokumen"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
