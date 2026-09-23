import {
  useMemo,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  ChangeEvent,
} from "react";
import {
  uploadDocumentFile,
  saveArchivedDoc,
  SessionExpiredError,
} from "../infrastructure/supabase/repositories";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  isDraftMeaningful,
  DRAFT_VERSION,
  type DraftData,
} from "./draftStore";
import { downscaleToJpeg } from "./imageResize";

import { GenerationProgress } from "./GenerationProgress";
import { PageHeading, ErrorNotice } from "./WorkspaceUI";
import { ProjectProfiles, type ProjectProfile } from "./ProjectProfiles";
import { MEMO_TYPES } from "../domain/memoTypes";
import { ProgrammeSnapshot } from "../domain/entities";
import { buildPorts } from "../composition";
import {
  generateMemo,
  generateMinit,
  generateSiteDiary,
  parseProgramme,
} from "../application/useCases";

type Kind = "diary" | "memo" | "minit";
type GeneratedMeta = {
  title: string;
  projectName: string;
  sourcePayload: Record<string, unknown>;
};
type Photo = { name: string; dataUrl: string };
type LbEntry = { id: number; catatan: string; photos: Photo[] };
// Short ascending two-tone "ding" on successful save, so users don't have to
// read "Menyimpan…"→"Tersimpan!" to know it worked. Web Audio = no asset to
// bundle, works offline; fired from a click so autoplay policy allows it.
function playSaveChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    (
      [
        [880, 0],
        [1320, 0.12],
      ] as const
    ).forEach(([freq, t]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.2, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* audio unavailable — stay silent */
  }
}

const HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Mac",
  "April",
  "Mei",
  "Jun",
  "Julai",
  "Ogos",
  "September",
  "Oktober",
  "November",
  "Disember",
];
function fromISO(iso: string) {
  if (!iso) return { tarikh: "", hari: "" };
  const d = new Date(iso + "T00:00:00");
  return {
    tarikh: `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`,
    hari: HARI[d.getDay()],
  };
}
const SK_DEFAULT = "Pengarah Seksyen Kontrak & Perolehan\nFail";
const UNIT_DEFAULT =
  "Seksyen Pembangunan\nBahagian Pengurusan Aset\nJabatan Timbalan Naib Canselor (Pembangunan)";
const Sec = ({ children }: { children: any }) => (
  <div className="studio-section-title">{children}</div>
);
export function DocumentStudio({
  projectId,
}: {
  projectId: string;
  onSaved?: () => void;
}) {
  const ports = useMemo(() => buildPorts(), []);
  const [step, setStep] = useState(0);
  const [mobileView, setMobileView] = useState<"form" | "preview">("form");
  const [validation, setValidation] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [kind, setKind] = useState<Kind>("diary");
  const [story, setStory] = useState("");
  const [snapshot, setSnapshot] = useState<ProgrammeSnapshot | null>(null);
  const [operation, setOperation] = useState<"generate" | "parse" | null>(null);
  const busy = operation !== null;
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");

  // diary
  const [tajukKerja, setTajukKerja] = useState("");
  const [bil, setBil] = useState("");
  const [tarikhISO, setTarikhISO] = useState("");
  const [waktuMula, setWaktuMula] = useState("08:00");
  const [waktuTamat, setWaktuTamat] = useState("17:30");
  const [cuacaPagi, setCuacaPagi] = useState("cerah");
  const [cuacaPetang, setCuacaPetang] = useState("cerah");
  const [diaryHtml, setDiaryHtml] = useState("");

  // memo header (all user-entered — never generated)
  const [memoType, setMemoType] = useState(MEMO_TYPES[0].id);
  const [mBil, setMBil] = useState("");
  const [noRujukan, setNoRujukan] = useState("");
  const [mTarikhISO, setMTarikhISO] = useState("");
  const [daripada, setDaripada] = useState("PENGARAH SEKSYEN PEMBANGUNAN");
  const [kepada, setKepada] = useState("");
  const [projek, setProjek] = useState("");
  const [mTajuk, setMTajuk] = useState("");
  const [tuan, setTuan] = useState(true);
  const [namaTtd, setNamaTtd] = useState("");
  const [jawatanTtd, setJawatanTtd] = useState("Pengarah");
  const [unitTtd, setUnitTtd] = useState(UNIT_DEFAULT);
  const [emelTtd, setEmelTtd] = useState("");
  const [sk, setSk] = useState(SK_DEFAULT);

  // Laporan Bergambar (shared by memo + diary)
  const [lbDisiplin, setLbDisiplin] = useState("AWAM");
  const [lbTajukLajur, setLbTajukLajur] = useState("Gambar keadaan di tapak");
  const [entries, setEntries] = useState<LbEntry[]>([]);

  const [memoHtml, setMemoHtml] = useState("");
  const [editing, setEditing] = useState(false);

  // minit — header, attendance and signatures are user-entered; AI writes only the body
  const [mmTitle, setMmTitle] = useState("");
  const [mmTajuk, setMmTajuk] = useState("");
  const [mmNamaKon, setMmNamaKon] = useState("");
  const [mmNoSeb, setMmNoSeb] = useState("");
  const [mmTMulaISO, setMmTMulaISO] = useState("");
  const [mmTTamatISO, setMmTTamatISO] = useState("");
  const [mmTarikhISO, setMmTarikhISO] = useState("");
  const [mmMasa, setMmMasa] = useState("");
  const [mmTempat, setMmTempat] = useState("Bilik Mesyuarat, BPA");
  const [mmBil, setMmBil] = useState("");
  const [chair, setChair] = useState<{ nama: string; jawatan: string }[]>([
    { nama: "", jawatan: "Pengerusi Mesyuarat" },
  ]);
  const [utmA, setUtmA] = useState<
    { nama: string; jawatan: string; seksyen: string }[]
  >([{ nama: "", jawatan: "", seksyen: "Seksyen Pembangunan" }]);
  const [konA, setKonA] = useState<{ nama: string; jawatan: string }[]>([
    { nama: "", jawatan: "" },
  ]);
  const [sigs, setSigs] = useState<
    { peranan: string; nama: string; jawatan: string }[]
  >([
    { peranan: "Disediakan oleh,", nama: "", jawatan: "" },
    { peranan: "Disemak oleh,", nama: "", jawatan: "" },
    { peranan: "Disahkan oleh,", nama: "", jawatan: "" },
    { peranan: "Diluluskan oleh,", nama: "", jawatan: "" },
  ]);
  const [minitHtml, setMinitHtml] = useState("");
  const [generatedMeta, setGeneratedMeta] = useState<
    Partial<Record<Kind, GeneratedMeta>>
  >({});
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const { tarikh, hari } = fromISO(tarikhISO);
  const selectedType = MEMO_TYPES.find((t) => t.id === memoType);
  const needsProgramme =
    (kind === "memo" && selectedType?.needsProgramme) || kind === "diary";
  const activeHtml =
    kind === "diary" ? diaryHtml : kind === "memo" ? memoHtml : minitHtml;
  const hasDoc = !!activeHtml;
  const frameId = `${kind}Frame`;
  const projectName =
    kind === "diary" ? tajukKerja : kind === "memo" ? projek : mmTajuk;
  const documentDate =
    kind === "diary" ? tarikhISO : kind === "memo" ? mTarikhISO : mmTarikhISO;
  function applyProfile(p: ProjectProfile) {
    setSaveStatus("idle");
    setTajukKerja(p.name);
    setProjek(p.name);
    setMmTajuk(p.name);
    setMmNamaKon(p.contractor);
    setMmNoSeb(p.contractNumber);
    setMmTMulaISO(p.startDate);
    setMmTTamatISO(p.endDate);
    setNamaTtd(p.signatory);
    setJawatanTtd(p.position);
  }
  function changeKind(next: Kind) {
    setKind(next);
    setStep(0);
    setValidation(false);
    setError("");
    setSaveStatus("idle");
    setEditing(false);
  }

  // ── Draft autosave & recovery (IndexedDB — holds photos, unlike localStorage) ──
  const DRAFT_KEY = `studio:${projectId}`;
  const [recovered, setRecovered] = useState<DraftData | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  const fieldsBag = () => ({
    kind,
    tajukKerja,
    bil,
    tarikhISO,
    waktuMula,
    waktuTamat,
    cuacaPagi,
    cuacaPetang,
    memoType,
    mBil,
    noRujukan,
    mTarikhISO,
    daripada,
    kepada,
    projek,
    mTajuk,
    tuan,
    namaTtd,
    jawatanTtd,
    unitTtd,
    emelTtd,
    sk,
    lbDisiplin,
    lbTajukLajur,
    mmTitle,
    mmTajuk,
    mmNamaKon,
    mmNoSeb,
    mmTMulaISO,
    mmTTamatISO,
    mmTarikhISO,
    mmMasa,
    mmTempat,
    mmBil,
    chair,
    utmA,
    konA,
    sigs,
    snapshot,
    generatedMeta,
  });
  const buildDraft = (): DraftData => ({
    version: DRAFT_VERSION,
    savedAt: Date.now(),
    story,
    diaryHtml,
    memoHtml,
    minitHtml,
    output,
    entries,
    fields: fieldsBag(),
  });
  function applyDraft(d: DraftData) {
    const f = d.fields as Record<string, any>;
    setGeneratedMeta(f.generatedMeta ?? {});
    setKind(f.kind ?? "diary");
    setTajukKerja(f.tajukKerja ?? "");
    setBil(f.bil ?? "");
    setTarikhISO(f.tarikhISO ?? "");
    setWaktuMula(f.waktuMula ?? "08:00");
    setWaktuTamat(f.waktuTamat ?? "17:30");
    setCuacaPagi(f.cuacaPagi ?? "cerah");
    setCuacaPetang(f.cuacaPetang ?? "cerah");
    setMemoType(f.memoType ?? MEMO_TYPES[0].id);
    setMBil(f.mBil ?? "");
    setNoRujukan(f.noRujukan ?? "");
    setMTarikhISO(f.mTarikhISO ?? "");
    setDaripada(f.daripada ?? "");
    setKepada(f.kepada ?? "");
    setProjek(f.projek ?? "");
    setMTajuk(f.mTajuk ?? "");
    setTuan(f.tuan ?? true);
    setNamaTtd(f.namaTtd ?? "");
    setJawatanTtd(f.jawatanTtd ?? "");
    setUnitTtd(f.unitTtd ?? UNIT_DEFAULT);
    setEmelTtd(f.emelTtd ?? "");
    setSk(f.sk ?? SK_DEFAULT);
    setLbDisiplin(f.lbDisiplin ?? "AWAM");
    setLbTajukLajur(f.lbTajukLajur ?? "Gambar keadaan di tapak");
    setMmTitle(f.mmTitle ?? "");
    setMmTajuk(f.mmTajuk ?? "");
    setMmNamaKon(f.mmNamaKon ?? "");
    setMmNoSeb(f.mmNoSeb ?? "");
    setMmTMulaISO(f.mmTMulaISO ?? "");
    setMmTTamatISO(f.mmTTamatISO ?? "");
    setMmTarikhISO(f.mmTarikhISO ?? "");
    setMmMasa(f.mmMasa ?? "");
    setMmTempat(f.mmTempat ?? "Bilik Mesyuarat, BPA");
    setMmBil(f.mmBil ?? "");
    setChair(f.chair ?? [{ nama: "", jawatan: "Pengerusi Mesyuarat" }]);
    setUtmA(
      f.utmA ?? [{ nama: "", jawatan: "", seksyen: "Seksyen Pembangunan" }],
    );
    setKonA(f.konA ?? [{ nama: "", jawatan: "" }]);
    setSigs(f.sigs ?? []);
    setSnapshot(f.snapshot ?? null);
    setStory(d.story ?? "");
    setEntries(d.entries ?? []);
    setDiaryHtml(d.diaryHtml ?? "");
    setMemoHtml(d.memoHtml ?? "");
    setMinitHtml(d.minitHtml ?? "");
    setOutput(d.output ?? "");
  }
  function restoreDraft() {
    if (recovered) applyDraft(recovered);
    setRecovered(null);
  }
  function discardDraft() {
    clearDraft(DRAFT_KEY).catch(() => {});
    setRecovered(null);
    setDraftSavedAt(null);
  }

  // Snapshot the pristine defaults once so autosave only fires on real edits.
  const pristineRef = useRef<string>();
  if (pristineRef.current === undefined)
    pristineRef.current = JSON.stringify(fieldsBag());

  useEffect(() => {
    loadDraft(DRAFT_KEY)
      .then((d) => {
        if (d) setRecovered(d);
      })
      .catch(() => {
        setDraftError("Draf pada peranti ini tidak dapat dibaca.");
      })
      .finally(() => setDraftReady(true));
  }, [DRAFT_KEY]);

  useEffect(() => {
    if (
      !draftReady ||
      recovered ||
      saveStatus === "saved" ||
      saveStatus === "saving"
    )
      return; // hold off while a recovery decision is pending
    const draft = buildDraft();
    const meaningful = isDraftMeaningful(draft, pristineRef.current!);
    const t = setTimeout(() => {
      if (meaningful)
        saveDraft(DRAFT_KEY, draft)
          .then(() => {
            setDraftSavedAt(draft.savedAt);
            setDraftError("");
          })
          .catch(() =>
            setDraftError(
              "Draf belum disimpan. Ruang simpanan peranti mungkin penuh.",
            ),
          );
      // Only clear a draft we actually wrote this session — never wipe a prior
      // draft during the pristine-mount window before recovery is offered.
      else if (draftSavedAt != null)
        clearDraft(DRAFT_KEY)
          .then(() => setDraftSavedAt(null))
          .catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    generatedMeta,
    saveStatus,
    draftReady,
    recovered,
    kind,
    story,
    snapshot,
    output,
    tajukKerja,
    bil,
    tarikhISO,
    waktuMula,
    waktuTamat,
    cuacaPagi,
    cuacaPetang,
    diaryHtml,
    memoType,
    mBil,
    noRujukan,
    mTarikhISO,
    daripada,
    kepada,
    projek,
    mTajuk,
    tuan,
    namaTtd,
    jawatanTtd,
    unitTtd,
    emelTtd,
    sk,
    lbDisiplin,
    lbTajukLajur,
    entries,
    memoHtml,
    mmTitle,
    mmTajuk,
    mmNamaKon,
    mmNoSeb,
    mmTMulaISO,
    mmTTamatISO,
    mmTarikhISO,
    mmMasa,
    mmTempat,
    mmBil,
    chair,
    utmA,
    konA,
    sigs,
    minitHtml,
  ]);

  const latestDraft = useRef<(() => DraftData | null) | null>(null);
  latestDraft.current = () => {
    if (!draftReady || recovered || saveStatus === "saved") return null;
    const draft = buildDraft();
    const doc = (document.getElementById(frameId) as HTMLIFrameElement | null)
      ?.contentDocument;
    if (doc && hasDoc) {
      doc.designMode = "off";
      if (doc.body) doc.body.style.outline = "";
      draft[
        kind === "diary"
          ? "diaryHtml"
          : kind === "memo"
            ? "memoHtml"
            : "minitHtml"
      ] = "<!doctype html>" + doc.documentElement.outerHTML;
    }
    return isDraftMeaningful(draft, pristineRef.current!) ? draft : null;
  };
  useLayoutEffect(() => {
    const flush = () => {
      const draft = latestDraft.current?.();
      if (draft) void saveDraft(DRAFT_KEY, draft).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [DRAFT_KEY]);

  async function onMpp(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOperation("parse");
    setError("");
    try {
      setSnapshot(await parseProgramme(ports, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : JSON.stringify(err));
    } finally {
      setOperation(null);
    }
  }

  function addEntry() {
    setEntries((p) => [...p, { id: Date.now(), catatan: "", photos: [] }]);
  }
  function removeEntry(id: number) {
    setEntries((p) => p.filter((e) => e.id !== id));
  }
  function setEntryCatatan(id: number, v: string) {
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, catatan: v } : e)));
  }
  function addEntryPhotos(id: number, ev: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files || []);
    ev.target.value = ""; // let the same file be re-picked after a delete
    Promise.all(
      files.map(async (f) => ({
        name: f.name,
        dataUrl: await downscaleToJpeg(f),
      })),
    )
      .then((loaded) =>
        setEntries((p) =>
          p.map((e) =>
            e.id === id ? { ...e, photos: [...e.photos, ...loaded] } : e,
          ),
        ),
      )
      .catch(() =>
        setError("Gambar tidak dapat dimuatkan. Cuba gambar yang lain."),
      );
  }
  function removeEntryPhoto(id: number, index: number) {
    setEntries((p) =>
      p.map((e) =>
        e.id === id
          ? { ...e, photos: e.photos.filter((_, i) => i !== index) }
          : e,
      ),
    );
  }

  const lbPayload = () => ({
    entries: entries.map((e) => ({ catatan: e.catatan, photos: e.photos })),
    disiplin: lbDisiplin,
    tajukLajur: lbTajukLajur,
  });

  function setChairField(i: number, key: "nama" | "jawatan", v: string) {
    setChair((pr) => pr.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }
  function setUtmField(
    i: number,
    key: "nama" | "jawatan" | "seksyen",
    v: string,
  ) {
    setUtmA((pr) => pr.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }
  function setKonField(i: number, key: "nama" | "jawatan", v: string) {
    setKonA((pr) => pr.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }
  function setSigField(i: number, key: "nama" | "jawatan", v: string) {
    setSigs((pr) => pr.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  async function onGenerate() {
    setValidation(true);
    if (!projectName.trim() || !documentDate) {
      setStep(0);
      return;
    }
    if (!story.trim()) {
      setStep(1);
      return;
    }
    captureEdits();
    setOperation("generate");
    setMobileView("preview");
    setError("");
    setSaveStatus("idle");
    try {
      const notes = { notes: story };
      if (kind === "memo") {
        const { html } = await generateMemo(ports, {
          projectId,
          memoType,
          siteStory: notes,
          snapshot: snapshot ?? undefined,
          header: {
            bil: mBil,
            noRujukan,
            tarikh: fromISO(mTarikhISO).tarikh,
            daripada,
            kepada,
            projek,
            tajuk: mTajuk,
            tuan,
            namaTtd,
            jawatanTtd,
            unitTtd,
            emelTtd,
            sk,
            lbDisiplin,
            lbTajukLajur,
            photoEntries: entries.map((e) => ({
              catatan: e.catatan,
              photos: e.photos,
            })),
          },
        });
        setMemoHtml(html);
      } else if (kind === "minit") {
        const pengerusi = chair
          .filter((c) => c.nama.trim())
          .map((c) => ({ nama: c.nama, jawatan: c.jawatan }));
        const utmGroups: {
          tajuk: string;
          ahli: { nama: string; jawatan: string }[];
        }[] = [];
        utmA
          .filter((a) => a.nama.trim())
          .forEach((a) => {
            const sec = a.seksyen.trim() || "Pihak UTM";
            let g = utmGroups.find((x) => x.tajuk === sec);
            if (!g) {
              g = { tajuk: sec, ahli: [] };
              utmGroups.push(g);
            }
            g.ahli.push({ nama: a.nama, jawatan: a.jawatan });
          });
        const kontraktor = konA
          .filter((k) => k.nama.trim())
          .map((k) => ({ nama: k.nama, jawatan: k.jawatan }));
        const tandatangan = sigs
          .filter((sg) => sg.nama.trim() || sg.jawatan.trim())
          .map((sg) => ({
            peranan: sg.peranan,
            nama: sg.nama,
            jawatan: sg.jawatan,
          }));
        const dot = mmTarikhISO
          ? mmTarikhISO.split("-").reverse().join(".")
          : "";
        const { html } = await generateMinit(ports, {
          projectId,
          notes,
          header: {
            title: mmTitle,
            tajuk: mmTajuk,
            namaKontraktor: mmNamaKon,
            noSebutharga: mmNoSeb,
            tarikhMula: fromISO(mmTMulaISO).tarikh,
            tarikhTamat: fromISO(mmTTamatISO).tarikh,
            tarikh: dot,
            masa: mmMasa,
            tempat: mmTempat,
            bil: mmBil,
          },
          kehadiran: { pengerusi, utmGroups, kontraktor },
          tandatangan,
        });
        setMinitHtml(html);
      } else {
        const { html } = await generateSiteDiary(ports, {
          projectId,
          notes,
          header: {
            tajuk: tajukKerja,
            bil,
            tarikh,
            hari,
            waktuMula,
            waktuTamat,
            cuaca: { pagi: cuacaPagi, petang: cuacaPetang },
          },
          lb: lbPayload(),
          snapshot: snapshot ?? undefined,
        });
        setDiaryHtml(html);
      }
      setGeneratedMeta((previous) => ({
        ...previous,
        [kind]: {
          title:
            kind === "diary"
              ? `Site Diary — ${tajukKerja} (${fromISO(tarikhISO).tarikh})`
              : kind === "memo"
                ? `Memo — ${mTajuk || memoType} (${fromISO(mTarikhISO).tarikh})`
                : `Minit — ${mmTitle || mmTajuk} (${mmTarikhISO})`,
          projectName,
          sourcePayload: {
            ...fieldsBag(),
            generatedMeta: undefined,
            notes: story,
          },
        },
      }));
      setOutput("");
      setEditing(false);
      setStep(2);
      setMobileView("preview");
    } catch (err) {
      setMobileView("form");
      setError(
        err instanceof Error && err.name === "AccessError"
          ? err.message
          : "Dokumen tidak dapat dijana. Sila cuba lagi. Catatan dan pratonton terdahulu dikekalkan.",
      );
    } finally {
      setOperation(null);
    }
  }

  // Persist edits from the preview before changing views, saving or regenerating.
  function captureEdits() {
    const doc = (document.getElementById(frameId) as HTMLIFrameElement | null)
      ?.contentDocument;
    if (!doc || !hasDoc) return activeHtml;
    doc.designMode = "off";
    if (doc.body) doc.body.style.outline = "";
    const html = "<!doctype html>" + doc.documentElement.outerHTML;
    if (kind === "diary") setDiaryHtml(html);
    else if (kind === "memo") setMemoHtml(html);
    else setMinitHtml(html);
    setEditing(false);
    return html;
  }
  function toggleEdit() {
    if (editing) {
      captureEdits();
      return;
    }
    const doc = (document.getElementById(frameId) as HTMLIFrameElement | null)
      ?.contentDocument;
    if (!doc) return;
    doc.designMode = "on";
    if (doc.body) doc.body.style.outline = "2px dashed #7a0c2e";
    setEditing(true);
    setSaveStatus("idle");
  }

  function printFrame(id: string) {
    captureEdits();
    const f = document.getElementById(id) as HTMLIFrameElement | null;
    const doc = f?.contentDocument;
    if (doc) {
      doc.designMode = "off";
      if (doc.body) doc.body.style.outline = "";
    }
    setEditing(false);

    const html = doc ? "<!doctype html>" + doc.documentElement.outerHTML : "";

    // Primary: open blank window + document.write (works on Chrome/Firefox/Safari desktop+mobile)
    // No size hints — mobile browsers ignore them and some treat them as popup signals to block
    const pw = window.open("", "_blank");
    if (pw) {
      try {
        pw.document.open();
        pw.document.write(html);
        pw.document.close();
        // Give fonts/images a moment then trigger print dialog
        setTimeout(() => {
          try {
            pw.focus();
            pw.print();
          } catch (_) {}
        }, 600);
      } catch (_) {
        // document.write blocked (Arc, strict CSP browsers) — navigate to blob URL instead
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        pw.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
      return;
    }

    // window.open blocked (popup blocker) — open blob URL via link click
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // Export the document (including any inline edits) as a .doc that Word /
  // Pages / Google Docs can open and edit (add/remove rows, etc.).
  function saveAsWord(frameId: string, filename: string) {
    captureEdits();
    const f = document.getElementById(frameId) as HTMLIFrameElement | null;
    const doc = f?.contentDocument;
    if (!doc) return;
    doc.designMode = "off";
    if (doc.body) doc.body.style.outline = "";
    setEditing(false);
    const ns =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>";
    const html =
      "<!doctype html>" +
      doc.documentElement.outerHTML.replace(/<html[^>]*>/i, ns);
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function saveToSystem() {
    const activeKind = kind;
    const activeHtml = captureEdits();
    if (!activeHtml) return;
    setSaveStatus("saving");
    setError("");
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const pathSuffix = `${activeKind}/${ts}.html`;
      const { publicUrl, fullPath } = await uploadDocumentFile(
        new Blob([activeHtml], { type: "text/html" }),
        pathSuffix,
        "text/html",
      );
      const title =
        activeKind === "diary"
          ? `Site Diary — ${tajukKerja} (${fromISO(tarikhISO).tarikh || ts.slice(0, 10)})`
          : activeKind === "memo"
            ? `Memo — ${mTajuk || memoType} (${fromISO(mTarikhISO).tarikh || ts.slice(0, 10)})`
            : `Minit — ${mmTitle || mmTajuk} (${mmTarikhISO || ts.slice(0, 10)})`;
      const sourcePayload: Record<string, unknown> =
        activeKind === "diary"
          ? {
              notes: story,
              tajukKerja,
              bil,
              tarikhISO,
              waktuMula,
              waktuTamat,
              cuacaPagi,
              cuacaPetang,
            }
          : activeKind === "memo"
            ? {
                notes: story,
                memoType,
                mTajuk,
                kepada,
                daripada,
                projek,
                mTarikhISO,
              }
            : { notes: story, mmTitle, mmTajuk, mmTarikhISO };
      await saveArchivedDoc({
        title: generatedMeta[activeKind]?.title ?? title,
        kind: activeKind,
        html_path: fullPath,
        public_url: publicUrl,
        project_name: generatedMeta[activeKind]?.projectName ?? projectName,
        source_payload:
          generatedMeta[activeKind]?.sourcePayload ?? sourcePayload,
      });
      setSaveStatus("saved");
      playSaveChime();
      // Persisted server-side now — drop the local recovery draft.
      clearDraft(DRAFT_KEY).catch(() => {});
      setDraftSavedAt(null);
    } catch (err) {
      setError(
        err instanceof SessionExpiredError
          ? "Sesi tamat — sila log masuk semula untuk menyimpan dokumen ini."
          : err instanceof Error
            ? err.message
            : String(err),
      );
      setSaveStatus("error");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="STUDIO DOKUMEN"
        title="Daripada catatan kepada dokumen."
        description="Isi maklumat, tambah catatan dan semak dokumen rasmi anda."
      />
      <div className="mobile-studio-tabs seg">
        <button
          className={mobileView === "form" ? "active" : ""}
          aria-pressed={mobileView === "form"}
          onClick={() => {
            captureEdits();
            setMobileView("form");
          }}
        >
          Isi maklumat
        </button>
        <button
          className={mobileView === "preview" ? "active" : ""}
          aria-pressed={mobileView === "preview"}
          onClick={() => setMobileView("preview")}
        >
          Pratonton{hasDoc ? " · Sedia" : ""}
        </button>
      </div>
      <div className="studio-grid" data-mobile-view={mobileView}>
        <div className="studio-form">
          <h2>Jana dokumen</h2>
          <p className="small muted">
            Maklumat rasmi anda isi. AI membantu menyediakan draf kandungan.
          </p>
          {recovered && (
            <div
              style={{
                background: "#fff8f0",
                border: "1px solid #e9c6a8",
                borderLeft: "4px solid var(--gold)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--maroon)",
                  marginBottom: 3,
                }}
              >
                Draf belum disimpan dijumpai
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  lineHeight: 1.5,
                  marginBottom: 10,
                }}
              >
                Kerja terakhir anda (termasuk gambar) dari{" "}
                {new Date(recovered.savedAt).toLocaleString("ms-MY", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                masih tersimpan pada peranti ini. Pulihkan atau mula semula?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: "6px 14px", fontSize: 12.5 }}
                  onClick={restoreDraft}
                >
                  Pulihkan
                </button>
                <button
                  className="btn"
                  style={{ padding: "6px 14px", fontSize: 12.5 }}
                  onClick={discardDraft}
                >
                  Buang
                </button>
              </div>
            </div>
          )}

          <div className="field">
            <div className="seg">
              <button
                className={kind === "diary" ? "active" : ""}
                disabled={busy || saveStatus === "saving"}
                onClick={() => {
                  captureEdits();
                  changeKind("diary");
                }}
              >
                Site Diary
              </button>
              <button
                className={kind === "memo" ? "active" : ""}
                disabled={busy || saveStatus === "saving"}
                onClick={() => {
                  captureEdits();
                  changeKind("memo");
                }}
              >
                Memo
              </button>
              <button
                className={kind === "minit" ? "active" : ""}
                disabled={busy || saveStatus === "saving"}
                onClick={() => {
                  captureEdits();
                  changeKind("minit");
                }}
              >
                Minit
              </button>
            </div>
          </div>

          <nav className="studio-steps" aria-label="Langkah dokumen">
            {["Maklumat", "Kandungan", "Semakan"].map((label, i) => (
              <button
                key={label}
                className={step === i ? "active" : ""}
                aria-current={step === i ? "step" : undefined}
                onClick={() => setStep(i)}
              >
                <span className="step-number">0{i + 1}</span>
                {label}
              </button>
            ))}
          </nav>
          <fieldset
            onChange={() => {
              if (saveStatus === "saved") setSaveStatus("idle");
            }}
            disabled={busy || saveStatus === "saving" || !!recovered}
            className="studio-fields"
          >
            <section className="studio-step" hidden={step !== 0}>
              <ProjectProfiles onApply={applyProfile} />
              {validation && (!projectName.trim() || !documentDate) && (
                <ErrorNotice message="Sila isi nama projek dan tarikh dokumen sebelum menjana." />
              )}
              {/* ---------- MEMO header ---------- */}
              {kind === "memo" && (
                <>
                  <div className="field">
                    <label>
                      Jenis Memo
                      <select
                        value={memoType}
                        onChange={(e) => setMemoType(e.target.value)}
                      >
                        {MEMO_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedType && (
                      <p className="hint">
                        Perlu: {selectedType.factHints.join(" · ")}
                      </p>
                    )}
                  </div>
                  <Sec>Maklumat Memo (anda isi)</Sec>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Memo Bil.
                        <input
                          value={mBil}
                          onChange={(e) => setMBil(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Tarikh
                        <input
                          type="date"
                          value={mTarikhISO}
                          onChange={(e) => setMTarikhISO(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="field">
                    <label>
                      No. Rujukan
                      <input
                        value={noRujukan}
                        onChange={(e) => setNoRujukan(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      Daripada
                      <input
                        value={daripada}
                        onChange={(e) => setDaripada(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      Kepada
                      <textarea
                        style={{ minHeight: 70 }}
                        value={kepada}
                        onChange={(e) => setKepada(e.target.value)}
                      />
                    </label>
                  </div>
                  <div
                    className="field"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <input
                      id="tuan"
                      type="checkbox"
                      checked={tuan}
                      onChange={(e) => setTuan(e.target.checked)}
                      style={{ width: "auto" }}
                    />
                    <label htmlFor="tuan" style={{ margin: 0 }}>
                      Papar &ldquo;Tuan,&rdquo; (memo kepada kontraktor)
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      Projek
                      <textarea
                        style={{ minHeight: 90 }}
                        value={projek}
                        onChange={(e) => setProjek(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      Tajuk memo (baris selepas PROJEK)
                      <input
                        value={mTajuk}
                        onChange={(e) => setMTajuk(e.target.value)}
                      />
                    </label>
                  </div>
                </>
              )}

              {/* ---------- DIARY fields ---------- */}
              {kind === "diary" && (
                <>
                  <div className="field">
                    <label>
                      Tajuk Kerja
                      <input
                        value={tajukKerja}
                        onChange={(e) => setTajukKerja(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Tarikh
                        <input
                          type="date"
                          value={tarikhISO}
                          onChange={(e) => setTarikhISO(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Hari (auto)
                        <input value={hari} readOnly />
                      </label>
                    </div>
                  </div>
                  <div className="field">
                    <label>
                      Bil (No. laporan)
                      <input
                        value={bil}
                        onChange={(e) => setBil(e.target.value)}
                      />
                    </label>
                  </div>
                  <Sec>Pengurusan Tapak</Sec>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Waktu Mula Bekerja
                        <input
                          type="time"
                          value={waktuMula}
                          onChange={(e) => setWaktuMula(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Waktu Tamat Bekerja
                        <input
                          type="time"
                          value={waktuTamat}
                          onChange={(e) => setWaktuTamat(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Cuaca — Pagi
                        <select
                          value={cuacaPagi}
                          onChange={(e) => setCuacaPagi(e.target.value)}
                        >
                          <option value="cerah">Cerah</option>
                          <option value="mendung">Mendung</option>
                          <option value="hujan">Hujan</option>
                        </select>
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Cuaca — Petang
                        <select
                          value={cuacaPetang}
                          onChange={(e) => setCuacaPetang(e.target.value)}
                        >
                          <option value="cerah">Cerah</option>
                          <option value="mendung">Mendung</option>
                          <option value="hujan">Hujan</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* ---------- MINIT header + kehadiran ---------- */}
              {kind === "minit" && (
                <>
                  <Sec>Maklumat Mesyuarat (anda isi)</Sec>
                  <div className="field">
                    <label>
                      Tajuk minit
                      <input
                        value={mmTitle}
                        onChange={(e) => setMmTitle(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      Tajuk Kerja (projek)
                      <textarea
                        style={{ minHeight: 80 }}
                        value={mmTajuk}
                        onChange={(e) => setMmTajuk(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Nama Kontraktor
                        <input
                          value={mmNamaKon}
                          onChange={(e) => setMmNamaKon(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        No. Sebutharga
                        <input
                          value={mmNoSeb}
                          onChange={(e) => setMmNoSeb(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Tarikh Mula Kerja
                        <input
                          type="date"
                          value={mmTMulaISO}
                          onChange={(e) => setMmTMulaISO(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Tarikh Tamat Kerja
                        <input
                          type="date"
                          value={mmTTamatISO}
                          onChange={(e) => setMmTTamatISO(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Tarikh Mesyuarat
                        <input
                          type="date"
                          value={mmTarikhISO}
                          onChange={(e) => setMmTarikhISO(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Masa
                        <input
                          value={mmMasa}
                          onChange={(e) => setMmMasa(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Tempat
                        <input
                          value={mmTempat}
                          onChange={(e) => setMmTempat(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Bil. Mesyuarat
                        <input
                          value={mmBil}
                          onChange={(e) => setMmBil(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  <details className="optional-section">
                    <summary>Kehadiran mesyuarat</summary>
                    <Sec>Pengerusi mesyuarat</Sec>
                    {chair.map((c, i) => (
                      <div
                        key={i}
                        className="field"
                        style={{
                          border: "1px solid #e6e0d8",
                          borderRadius: 9,
                          padding: 10,
                        }}
                      >
                        <div className="grid2">
                          <div className="field">
                            <label>
                              Nama
                              <input
                                value={c.nama}
                                onChange={(e) =>
                                  setChairField(i, "nama", e.target.value)
                                }
                              />
                            </label>
                          </div>
                          <div className="field">
                            <label>
                              Jawatan
                              <input
                                value={c.jawatan}
                                onChange={(e) =>
                                  setChairField(i, "jawatan", e.target.value)
                                }
                              />
                            </label>
                          </div>
                        </div>
                        {chair.length > 1 && (
                          <button
                            className="btn"
                            style={{ padding: "4px 10px" }}
                            onClick={() =>
                              setChair((pr) => pr.filter((_, idx) => idx !== i))
                            }
                          >
                            Buang
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="btn-row">
                      <button
                        className="btn"
                        onClick={() =>
                          setChair((pr) => [
                            ...pr,
                            { nama: "", jawatan: "Pengerusi Mesyuarat" },
                          ])
                        }
                      >
                        + Tambah pengerusi
                      </button>
                    </div>

                    <Sec>
                      Kehadiran — Pegawai UTM (nama · jawatan · seksyen)
                    </Sec>
                    {utmA.map((a, i) => (
                      <div
                        key={i}
                        className="field"
                        style={{
                          border: "1px solid #e6e0d8",
                          borderRadius: 9,
                          padding: 10,
                        }}
                      >
                        <div className="grid2">
                          <div className="field">
                            <label>
                              Nama
                              <input
                                value={a.nama}
                                onChange={(e) =>
                                  setUtmField(i, "nama", e.target.value)
                                }
                              />
                            </label>
                          </div>
                          <div className="field">
                            <label>
                              Jawatan
                              <input
                                value={a.jawatan}
                                onChange={(e) =>
                                  setUtmField(i, "jawatan", e.target.value)
                                }
                              />
                            </label>
                          </div>
                        </div>
                        <div className="field">
                          <label>
                            Seksyen / Bahagian
                            <input
                              value={a.seksyen}
                              onChange={(e) =>
                                setUtmField(i, "seksyen", e.target.value)
                              }
                            />
                          </label>
                        </div>
                        {utmA.length > 1 && (
                          <button
                            className="btn"
                            style={{ padding: "4px 10px" }}
                            onClick={() =>
                              setUtmA((pr) => pr.filter((_, idx) => idx !== i))
                            }
                          >
                            Buang
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="btn-row">
                      <button
                        className="btn"
                        onClick={() =>
                          setUtmA((pr) => [
                            ...pr,
                            {
                              nama: "",
                              jawatan: "",
                              seksyen: "Seksyen Pembangunan",
                            },
                          ])
                        }
                      >
                        + Tambah pegawai
                      </button>
                    </div>

                    <Sec>Kehadiran — Kontraktor</Sec>
                    {konA.map((k, i) => (
                      <div
                        key={i}
                        className="field"
                        style={{
                          border: "1px solid #e6e0d8",
                          borderRadius: 9,
                          padding: 10,
                        }}
                      >
                        <div className="grid2">
                          <div className="field">
                            <label>
                              Nama
                              <input
                                value={k.nama}
                                onChange={(e) =>
                                  setKonField(i, "nama", e.target.value)
                                }
                              />
                            </label>
                          </div>
                          <div className="field">
                            <label>
                              Jawatan
                              <input
                                value={k.jawatan}
                                onChange={(e) =>
                                  setKonField(i, "jawatan", e.target.value)
                                }
                              />
                            </label>
                          </div>
                        </div>
                        {konA.length > 1 && (
                          <button
                            className="btn"
                            style={{ padding: "4px 10px" }}
                            onClick={() =>
                              setKonA((pr) => pr.filter((_, idx) => idx !== i))
                            }
                          >
                            Buang
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="btn-row">
                      <button
                        className="btn"
                        onClick={() =>
                          setKonA((pr) => [...pr, { nama: "", jawatan: "" }])
                        }
                      >
                        + Tambah wakil kontraktor
                      </button>
                    </div>
                  </details>
                </>
              )}
            </section>
            <section className="studio-step" hidden={step !== 1}>
              {needsProgramme && (
                <div className="field">
                  <label>
                    Programme (.mpp) — opsyenal, untuk status %
                    <input type="file" accept=".mpp" onChange={onMpp} />
                  </label>
                  {snapshot && (
                    <p className="hint">
                      ✓ Dibaca — sebenar {snapshot.overall.actual}% / rancang{" "}
                      {snapshot.overall.plan}%
                    </p>
                  )}
                </div>
              )}

              {kind === "memo" && (
                <Sec>Isi Memo (AI draf daripada nota anda)</Sec>
              )}
              <div className="field">
                <label>
                  {kind === "diary"
                    ? "Nota harian (aktiviti, pekerja, isu…)"
                    : kind === "memo"
                      ? "Nota / fakta (tulis nombor, tarikh, RM tepat di sini)"
                      : "Poin mesyuarat"}
                  <textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                  />
                </label>
              </div>

              {/* ---------- Laporan Bergambar (memo + diary) ---------- */}
              {kind !== "minit" && (
                <>
                  <details className="optional-section">
                    <summary>Laporan bergambar (pilihan)</summary>
                    <div className="grid2">
                      <div className="field">
                        <label>
                          Disiplin (jalur tajuk)
                          <input
                            value={lbDisiplin}
                            onChange={(e) => setLbDisiplin(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="field">
                        <label>
                          Tajuk lajur gambar
                          <input
                            value={lbTajukLajur}
                            onChange={(e) => setLbTajukLajur(e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                    {entries.map((e, idx) => (
                      <div
                        key={e.id}
                        className="field"
                        style={{
                          border: "1px solid #e6e0d8",
                          borderRadius: 9,
                          padding: 10,
                        }}
                      >
                        <label>
                          Baris {idx + 1}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(ev) => addEntryPhotos(e.id, ev)}
                          />
                        </label>
                        {e.photos.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              marginTop: 6,
                            }}
                          >
                            {e.photos.map((ph, i) => (
                              <div key={i} style={{ position: "relative" }}>
                                <img
                                  src={ph.dataUrl}
                                  alt={ph.name}
                                  title={ph.name}
                                  className="photo-thumb"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEntryPhoto(e.id, i)}
                                  title={`Buang ${ph.name}`}
                                  className="photo-remove"
                                  aria-label={`Buang ${ph.name}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea
                          aria-label={`Catatan gambar baris ${idx + 1}`}
                          style={{ minHeight: 56, marginTop: 6 }}
                          value={e.catatan}
                          onChange={(ev) =>
                            setEntryCatatan(e.id, ev.target.value)
                          }
                        />
                        <button
                          className="btn"
                          style={{ padding: "4px 10px", marginTop: 6 }}
                          onClick={() => removeEntry(e.id)}
                        >
                          Buang baris
                        </button>
                      </div>
                    ))}
                    <div className="btn-row">
                      <button className="btn" onClick={addEntry}>
                        + Tambah baris gambar
                      </button>
                    </div>
                  </details>
                </>
              )}

              {validation && !story.trim() && (
                <p role="alert" className="field-error">
                  Sila tambah catatan untuk kandungan dokumen.
                </p>
              )}
            </section>
            <section className="studio-step" hidden={step !== 2}>
              <div className="review-summary">
                <h3>Semak sebelum menjana</h3>
                <dl>
                  <dt>Projek</dt>
                  <dd>{projectName || "Belum diisi"}</dd>
                  <dt>Tarikh dokumen</dt>
                  <dd>
                    {documentDate
                      ? fromISO(documentDate).tarikh
                      : "Belum diisi"}
                  </dd>
                  <dt>Catatan</dt>
                  <dd>
                    {story.trim()
                      ? `${story.trim().length} aksara`
                      : "Belum diisi"}
                  </dd>
                  {kind !== "minit" && (
                    <>
                      <dt>Lampiran gambar</dt>
                      <dd>
                        {entries.reduce((n, e) => n + e.photos.length, 0)}{" "}
                        gambar
                      </dd>
                    </>
                  )}
                </dl>
              </div>
              {/* ---------- MINIT signatures ---------- */}
              {kind === "minit" && (
                <>
                  <Sec>Tandatangan — nama &amp; jawatan</Sec>
                  {sigs.map((sg, i) => (
                    <div
                      key={i}
                      className="field"
                      style={{
                        border: "1px solid #e6e0d8",
                        borderRadius: 9,
                        padding: 10,
                      }}
                    >
                      <label>{sg.peranan}</label>
                      <div className="grid2">
                        <div className="field">
                          <label>
                            Nama
                            <input
                              value={sg.nama}
                              onChange={(e) =>
                                setSigField(i, "nama", e.target.value)
                              }
                            />
                          </label>
                        </div>
                        <div className="field">
                          <label>
                            Jawatan
                            <input
                              value={sg.jawatan}
                              onChange={(e) =>
                                setSigField(i, "jawatan", e.target.value)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ---------- MEMO signature ---------- */}
              {kind === "memo" && (
                <>
                  <Sec>Tandatangan &amp; Salinan (anda isi)</Sec>
                  <div className="grid2">
                    <div className="field">
                      <label>
                        Nama penandatangan
                        <input
                          value={namaTtd}
                          onChange={(e) => setNamaTtd(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Jawatan
                        <input
                          value={jawatanTtd}
                          onChange={(e) => setJawatanTtd(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="field">
                    <label>
                      Unit / Bahagian (kekal)
                      <textarea
                        style={{ minHeight: 64 }}
                        value={unitTtd}
                        onChange={(e) => setUnitTtd(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      Emel
                      <input
                        value={emelTtd}
                        onChange={(e) => setEmelTtd(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="field">
                    <label>
                      s.k. (salinan kepada)
                      <textarea
                        style={{ minHeight: 60 }}
                        value={sk}
                        onChange={(e) => setSk(e.target.value)}
                      />
                    </label>
                  </div>
                </>
              )}
            </section>
          </fieldset>
          <div className="studio-footer">
            {step < 2 ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep(step + 1)}
              >
                Teruskan ke {step === 0 ? "kandungan" : "semakan"} →
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={onGenerate}
                disabled={
                  busy || !draftReady || !!recovered || saveStatus === "saving"
                }
              >
                {busy
                  ? operation === "parse"
                    ? "Membaca fail MPP…"
                    : "Menjana dokumen…"
                  : hasDoc
                    ? "Jana semula dokumen"
                    : "Jana dokumen"}
              </button>
            )}
            <p className="save-note" role="status">
              {busy
                ? operation === "parse"
                  ? "Fail MPP sedang dibaca. Sila tunggu."
                  : "Dokumen sedang disediakan. Ini mungkin mengambil sedikit masa."
                : saveStatus === "saved"
                  ? "Dokumen disimpan ke arkib."
                  : draftSavedAt && !recovered
                    ? `Draf disimpan pada peranti ini · ${new Date(draftSavedAt).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}`
                    : "Draf disimpan automatik pada peranti ini."}
            </p>
          </div>
          {draftError && <ErrorNotice message={draftError} />}
          {error && <ErrorNotice message={error} />}
        </div>

        <div className="studio-preview">
          {busy && (
            <GenerationProgress
              key={operation}
              parsing={operation === "parse"}
            />
          )}
          <div
            aria-busy={busy}
            className={
              busy ? "preview-content is-processing" : "preview-content"
            }
            {...(busy ? { inert: "" } : {})}
          >
            {!hasDoc ? (
              <div className="preview-empty">
                <div className="paper-illustration" aria-hidden="true">
                  <div className="paper-brand" />
                  <div className="paper-line title" />
                  <div className="paper-line" />
                  <div className="paper-line" />
                  <div className="paper-line short" />
                  <br />
                  <div className="paper-line" />
                  <div className="paper-line short" />
                </div>
                <h3>Dokumen anda, di sini.</h3>
                <p>
                  Lengkapkan maklumat dan catatan. Pratonton akan tersedia
                  selepas dokumen dijana.
                </p>
                <span className="badge">
                  {kind === "diary"
                    ? "Site Diary"
                    : kind === "memo"
                      ? "Memo"
                      : "Minit mesyuarat"}{" "}
                  · Format A4
                </span>
              </div>
            ) : (
              <>
                <div className="preview-toolbar">
                  <button
                    className="btn"
                    disabled={busy || saveStatus === "saving"}
                    onClick={toggleEdit}
                  >
                    {editing ? "Selesai edit" : "Edit"}
                  </button>
                  <button className="btn" onClick={() => printFrame(frameId)}>
                    Cetak / PDF
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      saveAsWord(
                        frameId,
                        kind === "diary"
                          ? "site-diary.doc"
                          : kind === "memo"
                            ? "memo.doc"
                            : "minit-mesyuarat.doc",
                      )
                    }
                  >
                    Word
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={
                      busy || saveStatus === "saving" || saveStatus === "saved"
                    }
                    onClick={saveToSystem}
                  >
                    {saveStatus === "saving"
                      ? "Menyimpan…"
                      : saveStatus === "saved"
                        ? "Disimpan ke arkib"
                        : saveStatus === "error"
                          ? "Cuba simpan lagi"
                          : "Simpan ke arkib"}
                  </button>
                </div>
                {saveStatus === "error" && (
                  <ErrorNotice message="Dokumen belum disimpan ke arkib. Cuba simpan semula." />
                )}
                <p className="preview-hint">
                  Pratonton terakhir · Jana semula selepas mengubah maklumat.
                </p>
                <div className="preview-pages">
                  <iframe
                    id={frameId}
                    key={kind}
                    title={`Pratonton ${kind}`}
                    srcDoc={activeHtml}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
