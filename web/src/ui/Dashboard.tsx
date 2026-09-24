import { useEffect, useState } from "react";
import {
  listCMGD,
  listArchivedDocs,
  cmgdStatus,
  type CMGDItem,
  type ArchivedDoc,
} from "../infrastructure/supabase/repositories";
import { useAuth } from "./AuthProvider";
import { DocViewerModal } from "./DocViewerModal";
import { loadDraft, type DraftData } from "./draftStore";
import { Icon } from "./Icons";
import {
  PageHeading,
  EmptyState,
  LoadingRows,
  ErrorNotice,
  KIND_LABEL,
  STATUS_LABEL,
  dateLabel,
} from "./WorkspaceUI";
export function Dashboard({
  onNavigate,
}: {
  onNavigate: (p: "cmgd" | "library" | "studio" | "templates") => void;
}) {
  const { user } = useAuth();
  const [cmgds, setCmgds] = useState<CMGDItem[]>([]);
  const [docs, setDocs] = useState<ArchivedDoc[]>([]);
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<ArchivedDoc | null>(null);
  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [c, d] = await Promise.all([listCMGD(), listArchivedDocs()]);
      setCmgds(c);
      setDocs(d);
    } catch {
      setError(
        "Ringkasan tidak dapat dimuatkan. Semak sambungan anda dan cuba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
    loadDraft("studio:demo-project")
      .then(setDraft)
      .catch(() => {});
  }, []);
  const name = (
    (user?.user_metadata?.["full_name"] as string | undefined) ||
    user?.email?.split("@")[0] ||
    ""
  ).split(" ")[0];
  const alerts = cmgds
    .filter((c) => ["overdue", "due_soon"].includes(cmgdStatus(c)))
    .sort((a, b) => a.dlp_end_date.localeCompare(b.dlp_end_date));
  const stats = [
    { label: "Dokumen di arkib", value: docs.length },
    {
      label: "CMGD tamat tempoh",
      value: cmgds.filter((c) => cmgdStatus(c) === "overdue").length,
      urgent: true,
    },
    {
      label: "Tamat dalam 30 hari",
      value: cmgds.filter((c) => cmgdStatus(c) === "due_soon").length,
    },
    {
      label: "Projek dalam DLP",
      value: cmgds.filter((c) => cmgdStatus(c) === "active").length,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={new Date().toLocaleDateString("ms-MY", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        title={`Selamat datang${name ? `, ${name}` : ""}.`}
        description="Dokumen, draf dan tindakan tapak anda — dalam satu ruang kerja."
      />
      <section className="work-intro">
        <div>
          <p className="eyebrow">MULAKAN DI SINI</p>
          <h2>
            {draft
              ? "Sambung kerja terakhir anda."
              : "Dokumen seterusnya bermula di sini."}
          </h2>
          <p>
            {draft
              ? `Draf pada peranti ini · ${dateLabel(new Date(draft.savedAt).toISOString())}`
              : "Sediakan Site Diary, memo atau minit daripada catatan tapak."}
          </p>
        </div>
        <div className="intro-actions">
          <button
            className="btn btn-primary"
            onClick={() => onNavigate("studio")}
          >
            <Icon name={draft ? "arrow" : "plus"} size={17} />
            {draft ? "Sambung draf" : "Jana dokumen"}
          </button>
          <button className="btn" onClick={() => onNavigate("library")}>
            Buka arkib
          </button>
        </div>
      </section>
      <button
        className="template-shortcut"
        onClick={() => onNavigate("templates")}
      >
        <Icon name="templates" size={22} />
        <span>
          <strong>Perlukan contoh surat atau borang?</strong>
          <span>Pilih templat Word dan sesuaikan untuk projek anda.</span>
        </span>
        <span className="template-shortcut-label">Buka pustaka</span>
        <Icon name="arrow" size={18} />
      </button>
      {error ? (
        <ErrorNotice message={error} retry={reload} />
      ) : (
        <>
          <div className="stats-strip" aria-busy={loading}>
            {stats.map((s) => (
              <div className="stat-item" key={s.label}>
                <div
                  className={`stat-value${s.urgent && s.value > 0 ? " urgent" : ""}`}
                >
                  {loading ? "—" : s.value}
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Dokumen terkini</h2>
                  <p>Kerja yang telah disimpan ke arkib.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => onNavigate("library")}
                >
                  Lihat semua <Icon name="arrow" size={15} />
                </button>
              </div>
              {loading ? (
                <LoadingRows />
              ) : !docs.length ? (
                <EmptyState title="Ruang untuk dokumen pertama anda">
                  <p>Jana dokumen, semak kandungannya dan simpan ke arkib.</p>
                  <button className="btn" onClick={() => onNavigate("studio")}>
                    Jana dokumen
                  </button>
                </EmptyState>
              ) : (
                [...docs]
                  .sort((a, b) =>
                    (b.created_at || "").localeCompare(a.created_at || ""),
                  )
                  .slice(0, 6)
                  .map((d) => (
                    <div className="document-row" key={d.id}>
                      <span className="document-symbol">
                        <Icon name="document" size={18} />
                      </span>
                      <div className="document-info">
                        <button
                          className="document-title"
                          onClick={() => setViewing(d)}
                        >
                          {d.title}
                        </button>
                        <p>
                          {d.project_name || "Tanpa projek"} ·{" "}
                          {dateLabel(d.created_at)}
                        </p>
                      </div>
                      <span className="badge">{KIND_LABEL[d.kind]}</span>
                      <button
                        className="icon-button"
                        aria-label={`Buka ${d.title}`}
                        onClick={() => setViewing(d)}
                      >
                        <Icon name="arrow" size={17} />
                      </button>
                    </div>
                  ))
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Perlu perhatian</h2>
                  <p>Tarikh akhir dan tindakan CMGD.</p>
                </div>
                <Icon name="clock" size={18} />
              </div>
              {loading ? (
                <LoadingRows />
              ) : !alerts.length ? (
                <EmptyState title="Tiada tindakan segera">
                  <p>Projek yang hampir tamat DLP akan dipaparkan di sini.</p>
                  <button
                    className="text-button"
                    onClick={() => onNavigate("cmgd")}
                  >
                    Lihat CMGD <Icon name="arrow" size={15} />
                  </button>
                </EmptyState>
              ) : (
                alerts.slice(0, 4).map((c) => (
                  <button
                    className="alert-row"
                    key={c.id}
                    onClick={() => onNavigate("cmgd")}
                  >
                    <span className={`badge ${cmgdStatus(c)}`}>
                      {STATUS_LABEL[cmgdStatus(c)]}
                    </span>
                    <strong>{c.project_name}</strong>
                    <p>Tamat DLP · {dateLabel(c.dlp_end_date)}</p>
                  </button>
                ))
              )}
              {!!alerts.length && (
                <div className="panel-heading">
                  <span className="small muted">
                    {alerts.length} projek memerlukan perhatian
                  </span>
                  <button
                    className="text-button"
                    onClick={() => onNavigate("cmgd")}
                  >
                    Urus CMGD <Icon name="arrow" size={15} />
                  </button>
                </div>
              )}
            </section>
          </div>
        </>
      )}
      <div className="section-footer">
        <span>UTM · Jabatan TNC (Pembangunan)</span>
        <span>Daniel Dun untuk Hadirah</span>
      </div>
      {viewing && (
        <DocViewerModal
          url={viewing.signed_url ?? viewing.public_url}
          htmlPath={viewing.html_path}
          title={viewing.title}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}
