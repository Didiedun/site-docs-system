import { useState } from "react";
import { Dialog, ErrorNotice } from "./WorkspaceUI";
import { useAuth } from "./AuthProvider";
export interface ProjectProfile {
  id: string;
  name: string;
  contractor: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  signatory: string;
  position: string;
}
const EMPTY: ProjectProfile = {
  id: "",
  name: "",
  contractor: "",
  contractNumber: "",
  startDate: "",
  endDate: "",
  signatory: "",
  position: "",
};
export function ProjectProfiles({
  onApply,
}: {
  onApply: (profile: ProjectProfile) => void;
}) {
  const { user } = useAuth();
  const key = `sdt-project-profiles:${user?.id || "local"}`;
  const [profiles, setProfiles] = useState<ProjectProfile[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(saved)
        ? saved.filter(
            (p) => p && typeof p.id === "string" && typeof p.name === "string",
          )
        : [];
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState<ProjectProfile | null>(null);
  const [error, setError] = useState("");
  function persist(next: ProjectProfile[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setProfiles(next);
      return true;
    } catch {
      setError(
        "Profil tidak dapat disimpan pada peranti ini. Semak ruang simpanan pelayar.",
      );
      return false;
    }
  }
  return (
    <details className="profile-picker">
      <summary>
        Profil projek tersimpan <span className="small muted">· Pilihan</span>
      </summary>
      <label className="small" htmlFor="project-profile">
        Isi daripada profil projek
      </label>
      <select
        id="project-profile"
        className="filter-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Pilih profil tersimpan…</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="text-button"
          disabled={!selected}
          onClick={(event) => {
            const p = profiles.find((p) => p.id === selected);
            if (p) {
              onApply(p);
              event.currentTarget.closest("details")?.removeAttribute("open");
            }
          }}
        >
          Gunakan profil
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setError("");
            setEditing({ ...EMPTY });
          }}
        >
          + Profil baharu
        </button>
        {selected && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setError("");
              setEditing({ ...profiles.find((p) => p.id === selected)! });
            }}
          >
            Edit profil
          </button>
        )}
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        Disimpan pada peranti ini. Menggantikan butiran projek dalam borang.
      </p>
      {editing && (
        <Dialog
          title={editing.id ? "Edit profil projek" : "Profil projek baharu"}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const profile = {
                ...editing,
                name: editing.name.trim(),
                id: editing.id || crypto.randomUUID(),
              };
              if (!profile.name) return;
              const next = [
                ...profiles.filter((p) => p.id !== profile.id),
                profile,
              ];
              if (persist(next)) {
                setSelected(profile.id);
                setEditing(null);
              }
            }}
          >
            <p className="small muted">
              Simpan butiran yang kerap digunakan. Anda boleh menyemaknya
              sebelum menjana dokumen.
            </p>
            {(
              [
                ["name", "Nama projek"],
                ["contractor", "Kontraktor"],
                ["contractNumber", "No. kontrak / sebutharga"],
                ["startDate", "Tarikh mula kerja"],
                ["endDate", "Tarikh tamat kerja"],
                ["signatory", "Nama penandatangan"],
                ["position", "Jawatan penandatangan"],
              ] as const
            ).map(([field, label]) => (
              <div className="field" key={field}>
                <label>
                  {label}
                  {field === "name" ? " *" : ""}
                  <input
                    required={field === "name"}
                    type={field.endsWith("Date") ? "date" : "text"}
                    value={editing[field]}
                    onChange={(e) =>
                      setEditing({ ...editing, [field]: e.target.value })
                    }
                  />
                </label>
              </div>
            ))}
            {error && <ErrorNotice message={error} />}
            <div className="btn-row">
              <button className="btn btn-primary" type="submit">
                Simpan profil
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => setEditing(null)}
              >
                Batal
              </button>
              {editing.id && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    if (persist(profiles.filter((p) => p.id !== editing.id))) {
                      setSelected("");
                      setEditing(null);
                    }
                  }}
                >
                  Buang profil
                </button>
              )}
            </div>
          </form>
        </Dialog>
      )}
    </details>
  );
}
