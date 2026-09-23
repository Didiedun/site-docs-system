import { useEffect, useState } from "react";
import {
  listCMGD,
  saveCMGD,
  deleteCMGD,
  cmgdStatus,
  type CMGDItem,
} from "../infrastructure/supabase/repositories";
import { Icon } from "./Icons";
import {
  PageHeading,
  EmptyState,
  LoadingRows,
  ErrorNotice,
  Dialog,
  STATUS_LABEL,
  dateLabel,
} from "./WorkspaceUI";
const EMPTY: CMGDItem = {
  project_name: "",
  contractor: "",
  contract_no: "",
  practical_completion_date: "",
  dlp_months: 12,
  dlp_end_date: "",
  cmgd_issued_date: null,
  notes: "",
};
function addMonths(value: string, months: number) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  const lastDay = new Date(y, m - 1 + months + 1, 0).getDate();
  const date = new Date(y, m - 1 + months, Math.min(d, lastDay));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function CMGDTracker() {
  const [items, setItems] = useState<CMGDItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CMGDItem>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<CMGDItem | null>(null);
  async function reload() {
    setLoading(true);
    setError("");
    try {
      setItems(await listCMGD());
    } catch {
      setError("Rekod CMGD tidak dapat dimuatkan. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  function openForm(item: CMGDItem = EMPTY) {
    setEditing({ ...item });
    setFormError("");
    setShowForm(true);
  }
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await saveCMGD(editing);
      setShowForm(false);
      await reload();
    } catch {
      setFormError(
        "Rekod tidak dapat disimpan. Maklumat anda masih tersedia untuk dicuba semula.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete() {
    if (!deleting?.id) return;
    setSaving(true);
    setFormError("");
    try {
      await deleteCMGD(deleting.id);
      setDeleting(null);
      await reload();
    } catch {
      setFormError("Rekod tidak dapat dipadam. Sila cuba lagi.");
    } finally {
      setSaving(false);
    }
  }
  const rank: Record<string, number> = {
    overdue: 0,
    due_soon: 1,
    active: 2,
    issued: 3,
  };
  const filtered = items
    .filter(
      (i) =>
        (filter === "all" || cmgdStatus(i) === filter) &&
        `${i.project_name} ${i.contractor} ${i.contract_no || ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        rank[cmgdStatus(a)] - rank[cmgdStatus(b)] ||
        a.dlp_end_date.localeCompare(b.dlp_end_date),
    );
  return (
    <>
      <PageHeading
        eyebrow="PEMANTAUAN PROJEK"
        title="Jejak CMGD"
        description="Pantau tempoh liabiliti kecacatan dan rekod pengeluaran sijil."
        action={
          <button className="btn btn-primary" onClick={() => openForm()}>
            <Icon name="plus" size={17} />
            Tambah rekod
          </button>
        }
      />
      <div className="filters">
        <label className="search-field">
          <Icon name="search" size={18} />
          <span className="sr-only">Cari rekod CMGD</span>
          <input
            type="search"
            placeholder="Cari projek, kontraktor atau no. kontrak…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="small muted">Disusun mengikut keutamaan</span>
      </div>
      <div
        className="seg"
        style={{ marginBottom: 22 }}
        aria-label="Tapis status CMGD"
      >
        {["all", "overdue", "due_soon", "active", "issued"].map((s) => (
          <button
            key={s}
            className={s === filter ? "active" : ""}
            aria-pressed={s === filter}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "Semua" : STATUS_LABEL[s]}{" "}
            <span className="muted">
              {items.filter((i) => s === "all" || cmgdStatus(i) === s).length}
            </span>
          </button>
        ))}
      </div>
      {error ? (
        <ErrorNotice message={error} retry={reload} />
      ) : loading ? (
        <LoadingRows />
      ) : !filtered.length ? (
        <div className="panel">
          <EmptyState
            title={
              items.length ? "Tiada rekod sepadan" : "Mulakan pemantauan projek"
            }
          >
            <p>
              {items.length
                ? "Cuba carian atau status yang lain."
                : "Tambah tarikh siap praktikal untuk mengira tarikh tamat DLP."}
            </p>
            <button
              className="btn"
              onClick={() => {
                if (items.length) {
                  setSearch("");
                  setFilter("all");
                } else openForm();
              }}
            >
              {items.length ? "Kosongkan penapis" : "Tambah rekod"}
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className="cmgd-list">
          {filtered.map((item) => (
            <article key={item.id} className="cmgd-row">
              <div className="cmgd-top">
                <div>
                  <span className={`badge ${cmgdStatus(item)}`}>
                    {STATUS_LABEL[cmgdStatus(item)]}
                  </span>
                  <h2>{item.project_name}</h2>
                  <p>
                    {item.contractor}
                    {item.contract_no && ` · ${item.contract_no}`}
                  </p>
                </div>
                <div className="row-actions">
                  {!item.cmgd_issued_date && (
                    <button className="btn" onClick={() => openForm(item)}>
                      Rekod pengeluaran
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => openForm(item)}
                  >
                    Edit
                  </button>
                  <details className="overflow-menu">
                    <summary aria-label={`Tindakan untuk ${item.project_name}`}>
                      ···
                    </summary>
                    <div className="menu-content">
                      <button
                        onClick={(e) => {
                          e.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          setFormError("");
                          setDeleting(item);
                        }}
                      >
                        Padam rekod
                      </button>
                    </div>
                  </details>
                </div>
              </div>
              <div className="cmgd-dates">
                <div>
                  <span>Siap praktikal</span>
                  <strong>{dateLabel(item.practical_completion_date)}</strong>
                </div>
                <div>
                  <span>Tempoh DLP</span>
                  <strong>{item.dlp_months} bulan</strong>
                </div>
                <div>
                  <span>Tamat DLP</span>
                  <strong>{dateLabel(item.dlp_end_date)}</strong>
                </div>
                <div>
                  <span>CMGD dikeluarkan</span>
                  <strong>{dateLabel(item.cmgd_issued_date)}</strong>
                </div>
              </div>
              {item.notes && <p className="cmgd-notes">{item.notes}</p>}
            </article>
          ))}
        </div>
      )}
      {showForm && (
        <Dialog
          title={editing.id ? "Kemaskini rekod CMGD" : "Rekod CMGD baharu"}
          onClose={() => {
            if (!saving) setShowForm(false);
          }}
        >
          <form onSubmit={handleSave}>
            <div className="field">
              <label>
                Nama projek *
                <input
                  required
                  value={editing.project_name}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, project_name: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="field">
              <label>
                Kontraktor *
                <input
                  required
                  value={editing.contractor}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, contractor: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="field">
              <label>
                No. kontrak / sebutharga
                <input
                  value={editing.contract_no || ""}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, contract_no: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="grid2">
              <div className="field">
                <label>
                  Tarikh siap praktikal *
                  <input
                    type="date"
                    required
                    value={editing.practical_completion_date}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        practical_completion_date: e.target.value,
                        dlp_end_date: addMonths(e.target.value, p.dlp_months),
                      }))
                    }
                  />
                </label>
              </div>
              <div className="field">
                <label>
                  Tempoh DLP (bulan)
                  <select
                    value={editing.dlp_months}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        dlp_months: Number(e.target.value),
                        dlp_end_date: addMonths(
                          p.practical_completion_date,
                          Number(e.target.value),
                        ),
                      }))
                    }
                  >
                    {[6, 12, 18, 24, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} bulan
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="field">
              <label>
                Tarikh tamat DLP
                <input readOnly value={dateLabel(editing.dlp_end_date)} />
              </label>
              <p className="hint">
                Dikira daripada tarikh siap praktikal dan tempoh DLP.
              </p>
            </div>
            <div className="field">
              <label>
                Tarikh CMGD dikeluarkan
                <input
                  type="date"
                  value={editing.cmgd_issued_date || ""}
                  onChange={(e) =>
                    setEditing((p) => ({
                      ...p,
                      cmgd_issued_date: e.target.value || null,
                    }))
                  }
                />
              </label>
              <p className="hint">
                Biarkan kosong jika sijil belum dikeluarkan.
              </p>
            </div>
            <div className="field">
              <label>
                Nota
                <textarea
                  value={editing.notes || ""}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </label>
            </div>
            {formError && <ErrorNotice message={formError} />}
            <div className="btn-row">
              <button
                className="btn btn-primary"
                disabled={saving}
                type="submit"
              >
                {saving ? "Menyimpan…" : "Simpan rekod"}
              </button>
              <button
                className="btn"
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
              >
                Batal
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Padam rekod CMGD?"
          onClose={() => {
            if (!saving) setDeleting(null);
          }}
        >
          <p>
            Rekod “{deleting.project_name}” akan dipadam. Tindakan ini tidak
            boleh dibatalkan.
          </p>
          {formError && <ErrorNotice message={formError} />}
          <div className="btn-row">
            <button
              className="btn"
              disabled={saving}
              onClick={() => setDeleting(null)}
            >
              Batal
            </button>
            <button
              className="btn btn-danger"
              disabled={saving}
              onClick={handleDelete}
            >
              {saving ? "Memadam…" : "Padam rekod"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
