import { supabase } from "./supabase/client";

export type TemplateCategory = "Kelulusan kerja" | "Serahan & aset";
export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  kind: "Surat" | "Borang";
  file: string;
  bytes: number;
  fields: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "kelulusan-bekerja",
    title: "Kelulusan bekerja di luar waktu pejabat",
    description:
      "Borang kelulusan kerja hujung minggu, selepas waktu pejabat atau cuti umum.",
    category: "Kelulusan kerja",
    kind: "Borang",
    file: "kelulusan-bekerja-luar-waktu.docx",
    bytes: 65037,
    fields: "Kontraktor, projek, lokasi, tarikh dan waktu kerja.",
  },
  {
    id: "baki-kerja",
    title: "Kebenaran menyiapkan baki kerja",
    description:
      "Contoh surat susulan penyiapan, perlindungan insurans dan kemajuan baki kerja.",
    category: "Kelulusan kerja",
    kind: "Surat",
    file: "kebenaran-menyiapkan-baki-kerja.docx",
    bytes: 20195,
    fields: "Rujukan surat, kontraktor, tarikh, kemajuan dan punca kelewatan.",
  },
  {
    id: "jadual-kerja",
    title: "Kelulusan jadual perancangan kerja",
    description:
      "Contoh surat kelulusan jadual atau pindaan perancangan kerja kontraktor.",
    category: "Kelulusan kerja",
    kind: "Surat",
    file: "kelulusan-jadual-perancangan-kerja.docx",
    bytes: 19157,
    fields: "Projek, kontraktor, rujukan, tarikh dan pegawai penandatangan.",
  },
  {
    id: "serah-kunci",
    title: "Borang serah kunci",
    description:
      "Rekod serahan kunci ruang atau bangunan, dengan pengesahan PTJ dan kontraktor.",
    category: "Serahan & aset",
    kind: "Borang",
    file: "borang-serah-kunci.docx",
    bytes: 65718,
    fields: "Ruang, tarikh serahan, pegawai, nombor dan bilangan kunci.",
  },
  {
    id: "keluar-barang",
    title: "Kebenaran bawa keluar barang",
    description:
      "Borang pergerakan barang keluar kampus untuk pegawai, pembawa dan pengawal.",
    category: "Serahan & aset",
    kind: "Borang",
    file: "kebenaran-bawa-keluar-barang.docx",
    bytes: 220051,
    fields: "Barang, tujuan, kenderaan, tarikh, pegawai dan maklumat pembawa.",
  },
];

export async function downloadTemplate(
  template: DocumentTemplate,
): Promise<void> {
  const { data, error } = await supabase.storage
    .from("templates")
    .download(template.file);
  if (error || !data)
    throw new Error(
      "Muat turun tidak berjaya. Semak sambungan dan sesi log masuk anda, kemudian cuba lagi.",
    );
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = template.file;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow the browser to consume the Blob before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
