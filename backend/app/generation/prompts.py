"""Builds (system, user) prompts that generate the BODY of each document in
UTM house style. Header/footer/signature and the No. Rujukan are NEVER
generated here.
"""
import json
from typing import Any, Dict, Tuple

_MEMO_BASE = """Anda pembantu kepada Penolong Jurutera Awam (penyelia tapak) di UTM. Anda mendraf BAHAGIAN ISI (badan) memo projek rasmi dalam Bahasa Melayu rasmi, mengikut gaya rumah UTM. Peraturan:
- Output HANYA perenggan bernombor badan memo, bermula dengan: Dengan segala hormatnya perkara di atas adalah dirujuk. sebagai perenggan 1.
- JANGAN hasilkan kepala memo, No. Rujukan, tarikh, DARIPADA/KEPADA, blok tandatangan, atau cogan MALAYSIA MADANI.
- Jangan reka angka, tarikh, klausa atau fakta yang tidak diberi.
- Gunakan jadual ringkas (markdown) apabila jenis memo memerlukannya."""

_MEMO_TYPE_GUIDE = {
    "kelewatan": """Jenis: Memo Kelewatan Kerja. Struktur: pembukaan; ringkasan kemajuan setakat cut-off dengan jadual keseluruhan (Rancang/Sebenar/Status) dan jadual mengikut blok dengan punca; penemuan punca utama; isu bahan/jentera; arahan sediakan Pelan Pemulihan dan amaran ambang ke arah penamatan kontrak.""",
    "denda": """Jenis: Memo Denda Kebersihan & Keselamatan, ditujukan kepada kontraktor. Struktur: pembukaan; penemuan ketidakpatuhan pada tarikh semakan; penalti berdasarkan Jadual Gantirugi (Bil item LD, Perkara, Kadar Penalti); rujukan Laporan Bergambar dan arahan tindakan; penghargaan.""",
    "ketidakpatuhan": """Jenis: Memo Ketidakpatuhan atau Spesifikasi. Nyatakan apa yang dilakukan berbanding keperluan, lokasi, rujukan gambar, dan arahan pembetulan.""",
    "kerosakan": """Jenis: Memo Kerosakan Aset. Nyatakan aset/kerosakan, lokasi, bila ditemui, pihak bertanggungjawab, rujukan gambar, dan arahan membaiki.""",
    "arahan": """Jenis: Memo Arahan. Nyatakan tindakan yang diarahkan, blok/skop, tarikh akhir, dan akibat jika gagal.""",
    "teknikal": """Jenis: Memo Isu Teknikal. Nyatakan pemerhatian teknikal, keperluan/kelulusan yang dilanggar, lokasi, dan arahan tindakan.""",
    "pemakluman": """Jenis: Memo Pemakluman atau Pentadbiran. Maklum atau minta perkara pentadbiran secara ringkas dan sopan.""",
}

_MINIT_BASE = """Anda mendraf BAHAGIAN ISI minit Mesyuarat Pemantauan Khas UTM dalam BM rasmi, daripada poin mentah. Output bahagian bernombor (Pendahuluan, Laporan Kemajuan, Isu, Punca, Tarikh Siap, Rumusan, Penutup) dengan lajur Status/Tindakan di mana sesuai. JANGAN hasilkan kotak maklumat projek, senarai kehadiran, atau blok tandatangan. Jangan reka fakta."""

_DIARY_BASE = """Anda menyusun Laporan Harian Tapak Bina UTM daripada nota mentah penyelia. JANGAN salin nota bulat-bulat; TULIS SEMULA setiap aktiviti sebagai ayat kerja profesional yang ringkas. Hasilkan SATU objek JSON SAHAJA (tiada teks atau pagar kod lain) dengan kunci berikut:
- tajuk, tarikh, hari: string
- skop: objek dengan kunci Senibina, Mekanikal, Elektrik, Awam, Lanskap bernilai true atau false (disiplin kerja hari itu)
- cuaca: objek dengan kunci pagi dan petang, nilai cerah atau mendung atau hujan
- tenaga: objek dengan kunci senarai, iaitu senarai pasangan [peranan atau tred cth Tukang Siling (P07), bilangan]
- perlaksanaan: senarai objek dengan kunci masa (Pagi atau Petang), butiran (senarai ayat kerja), kuantiti, kualiti
- bahan: senarai pasangan [nama bahan atau penghantaran, bil dibekal]
- pengurusan: objek dengan kunci keselamatan, kebersihan, papan tanda, pakaian kerja, waktu kerja bernilai true atau false
- catatan: senarai catatan penyelia
- arahan: senarai arahan kepada kontraktor
- penyelarasan: string penyelarasan bersama pelanggan
- ujian: objek dengan kunci keterangan dan keputusan
- komen: string komen mingguan (biasanya kosong)
Untuk perkara yang tiada dalam nota, tinggalkan kosong atau false. Jangan reka data. Jangan hasilkan status atau peratus kemajuan."""


def build_prompt(doc_type: str, payload: Dict[str, Any]) -> Tuple[str, str]:
    facts = json.dumps(payload, ensure_ascii=False, indent=2)
    if doc_type == "memo":
        mtype = (payload.get("memoType") or "").lower()
        guide = _MEMO_TYPE_GUIDE.get(mtype, "Jenis memo umum.")
        system = _MEMO_BASE + "\n" + guide
        user = "Fakta untuk memo jenis " + mtype + ":\n" + facts + "\n\nDraf badan memo sekarang."
        return system, user
    if doc_type == "minit":
        return _MINIT_BASE, "Poin mesyuarat:\n" + facts + "\n\nDraf badan minit sekarang."
    if doc_type == "diary":
        return _DIARY_BASE, "Nota harian:\n" + facts + "\n\nHasilkan JSON sekarang."
    raise ValueError("Unknown docType: " + str(doc_type))
