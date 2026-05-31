// The 7 memo families. The shell is identical; only the body pattern + the
// few facts differ. `needsProgramme` flags the one type fed by the .mpp.
export interface MemoTypeDef {
  id: string;
  label: string;
  audience: 'contractor' | 'internal';
  needsProgramme: boolean;
  factHints: string[];
}

export const MEMO_TYPES: MemoTypeDef[] = [
  { id: 'kelewatan', label: 'Kelewatan Kerja', audience: 'internal', needsProgramme: true,
    factHints: ['tarikh cut-off', 'punca (pekerja/bahan/jentera/M&E/rework/…)', 'blok fokus', 'bilangan pekerja (opsyenal)', 'bahan kurang (opsyenal)'] },
  { id: 'denda', label: 'Denda Kebersihan & Keselamatan', audience: 'contractor', needsProgramme: false,
    factHints: ['tarikh semakan', 'jenis pelanggaran', 'Bil item LD + kadar penalti', 'blok/lokasi + gambar'] },
  { id: 'ketidakpatuhan', label: 'Ketidakpatuhan / Spesifikasi', audience: 'contractor', needsProgramme: false,
    factHints: ['apa yang salah vs keperluan', 'lokasi', 'rujukan gambar'] },
  { id: 'kerosakan', label: 'Kerosakan Aset', audience: 'contractor', needsProgramme: false,
    factHints: ['aset/kerosakan', 'lokasi (blok)', 'tarikh ditemui', 'pihak bertanggungjawab'] },
  { id: 'arahan', label: 'Arahan', audience: 'contractor', needsProgramme: false,
    factHints: ['tindakan diarahkan', 'blok/skop', 'tarikh akhir', 'akibat'] },
  { id: 'teknikal', label: 'Isu Teknikal', audience: 'contractor', needsProgramme: false,
    factHints: ['pemerhatian teknikal', 'kelulusan/spek dilanggar', 'lokasi'] },
  { id: 'pemakluman', label: 'Pemakluman / Pentadbiran', audience: 'internal', needsProgramme: false,
    factHints: ['perkara pentadbiran', 'tindakan diminta'] },
];
