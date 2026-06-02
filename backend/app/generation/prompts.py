"""Builds (system, user) prompts that generate the BODY of each document in
UTM house style. Header/footer/signature and the No. Rujukan are NEVER
generated here.
"""
import json
from typing import Any, Dict, Tuple

_MEMO_BASE = """Anda pembantu Penolong Jurutera Awam (penyelia tapak) UTM. Anda menyusun BADAN memo projek rasmi dalam Bahasa Melayu rasmi (gaya rumah UTM) daripada nota mentah.
Hasilkan SATU objek JSON SAHAJA (tiada teks atau pagar kod lain) dengan kunci:
- blok: senarai blok mengikut turutan. Setiap blok salah satu daripada:
   {"type":"para","text":"..."}  perenggan badan (JANGAN nombor sendiri; sistem nombor bermula 2)
   {"type":"subhead","text":"..."}  tajuk kecil sebelum jadual (cth nama jadual)
   {"type":"table","title":"...","headers":["..."],"rows":[["..."]],"punca":["..."]}  (medan 'punca' OPSYENAL: senarai punca yang dikongsi SEMUA baris; sistem paparkan sebagai SATU lajur "Punca Kelewatan" digabung. JANGAN letak Punca dalam headers atau ulang ia setiap baris.)
- penutup: senarai ayat penutup, cth ["Kerjasama dan tindakan segera dari pihak tuan adalah amat dihargai.","Sekian, terima kasih."]
JANGAN masukkan perenggan pembuka 'Dengan segala hormatnya...' (sistem tambah sebagai perenggan 1). JANGAN reka No. Rujukan, tarikh, nama, kepala memo atau tandatangan. Jangan reka angka/fakta yang tiada dalam nota. Tulis semula nota sebagai ayat profesional, bukan salinan bulat-bulat.
PENTING: Masukkan HANYA kandungan berdasarkan poin/fakta yang diberi. JANGAN tambah perenggan, jadual atau peratus yang tidak diminta. JANGAN sertakan peratus kemajuan / status % / jadual kemajuan melainkan data 'programme' diberikan ATAU nombor diberi dalam nota.
GAYA: Huraikan setiap poin menjadi ayat yang lengkap, formal dan terperinci dalam gaya surat rasmi UTM — gunakan frasa penghubung, ayat penuh dan nada profesional. Untuk isi sel jadual dan setiap item dalam senarai 'punca', kekalkan RINGKAS dan padat (poin pendek, bukan perenggan panjang). Perincikan BAHASA sahaja; JANGAN menambah fakta, angka, tarikh, nama, lokasi, sebab atau dakwaan baharu yang tiada dalam nota.
CONTOH (huraikan bahasa, bukan fakta) — Nota: "kontraktor lambat hantar bahan, kerja terbengkalai" menjadi Perenggan: "Pihak kami mendapati bahawa pihak kontraktor menghadapi kelewatan dalam penghantaran bahan binaan ke tapak, sekali gus menyebabkan kerja-kerja di tapak terbengkalai dan tidak dapat diteruskan mengikut jadual yang ditetapkan."""

_MEMO_TYPE_GUIDE = {
    "kelewatan": """Jenis: Memo Kelewatan Kerja. Struktur: pembukaan; ringkasan kemajuan setakat cut-off dengan jadual keseluruhan (Rancang/Sebenar/Status) dan jadual mengikut blok dengan headers [Blok, Rancang, Sebenar, Status] DAN medan 'punca' (senarai punca utama yang SAMA bagi semua blok — sistem gabungkan sebagai satu lajur 'Punca Kelewatan'; JANGAN ulang punca setiap baris). Tulis setiap item 'punca' sebagai poin RINGKAS dan padat seperti dalam memo contoh (satu hingga dua ayat pendek sahaja setiap punca; BUKAN perenggan panjang dan BUKAN satu patah perkataan). Contoh gaya punca: (1) Bilangan pekerja di tapak semakin menurun; (2) Pengurusan gerak kerja di tapak lemah, tiada pemantauan teliti, dan kerja perlu dijalankan berulang kali; (3) Bahan binaan dan peralatan/jentera untuk melaksanakan kerja tidak mencukupi. Gunakan HANYA punca yang disebut dalam nota. Jadual blok dan punca disertakan HANYA jika data 'programme' diberikan; isu bahan/jentera; arahan sediakan Pelan Pemulihan dan amaran ambang ke arah penamatan kontrak.""",
    "denda": """Jenis: Memo Denda Kebersihan & Keselamatan, ditujukan kepada kontraktor. Struktur: pembukaan; penemuan ketidakpatuhan pada tarikh semakan; penalti berdasarkan Jadual Gantirugi (Bil item LD, Perkara, Kadar Penalti); rujukan Laporan Bergambar dan arahan tindakan; penghargaan.""",
    "ketidakpatuhan": """Jenis: Memo Ketidakpatuhan atau Spesifikasi. Nyatakan apa yang dilakukan berbanding keperluan, lokasi, rujukan gambar, dan arahan pembetulan.""",
    "kerosakan": """Jenis: Memo Kerosakan Aset. Nyatakan aset/kerosakan, lokasi, bila ditemui, pihak bertanggungjawab, rujukan gambar, dan arahan membaiki.""",
    "arahan": """Jenis: Memo Arahan. Nyatakan tindakan yang diarahkan, blok/skop, tarikh akhir, dan akibat jika gagal.""",
    "teknikal": """Jenis: Memo Isu Teknikal. Nyatakan pemerhatian teknikal, keperluan/kelulusan yang dilanggar, lokasi, dan arahan tindakan.""",
    "pemakluman": """Jenis: Memo Pemakluman atau Pentadbiran. Maklum atau minta perkara pentadbiran secara ringkas dan sopan.""",
}

_MINIT_BASE = """Anda mendraf BAHAGIAN ISI minit Mesyuarat Pemantauan Khas UTM dalam BM rasmi, daripada poin mentah. Output bahagian bernombor (Pendahuluan, Laporan Kemajuan, Isu, Punca, Tarikh Siap, Rumusan, Penutup) dengan lajur Status/Tindakan di mana sesuai. JANGAN hasilkan kotak maklumat projek, senarai kehadiran, atau blok tandatangan. Jangan reka fakta."""

_DIARY_BASE = """Anda menyusun Laporan Harian Tapak Bina UTM daripada nota mentah penyelia. JANGAN salin nota bulat-bulat; HURAIKAN setiap aktiviti menjadi ayat kerja yang lengkap, formal dan deskriptif dalam gaya laporan tapak rasmi. Hasilkan SATU objek JSON SAHAJA (tiada teks atau pagar kod lain) dengan kunci berikut:
- tajuk, tarikh, hari: string
- skop: objek dengan kunci Senibina, Mekanikal, Elektrik, Awam, Lanskap bernilai true atau false (disiplin kerja hari itu)
- cuaca: objek dengan kunci pagi dan petang, nilai cerah atau mendung atau hujan
- tenaga: objek dengan kunci senarai, iaitu senarai pasangan [peranan atau tred cth Tukang Siling (P07), bilangan]
- perlaksanaan: senarai objek dengan kunci masa (Pagi atau Petang), butiran (senarai ayat kerja yang DIHURAIKAN), kuantiti, kualiti
- bahan: senarai pasangan [nama bahan atau penghantaran, bil dibekal]
- pengurusan: objek dengan kunci keselamatan, kebersihan, papan tanda, pakaian kerja, waktu kerja bernilai true atau false
- catatan: senarai catatan penyelia
- arahan: senarai arahan kepada kontraktor
- penyelarasan: string penyelarasan bersama pelanggan
- ujian: objek dengan kunci keterangan dan keputusan
- komen: string komen mingguan (biasanya kosong)
GAYA BUTIRAN: Bagi SETIAP item dalam 'butiran' perlaksanaan, huraikan aktiviti menjadi satu ayat penuh yang formal dan deskriptif — nyatakan jenis kerja dan lokasi dengan jelas, dan gunakan frasa kerja yang sesuai (cth \"Kerja-kerja ... sedang dijalankan/diteruskan/dilaksanakan oleh pihak kontraktor di ...\"). Setiap butiran hendaklah satu ayat lengkap, bukan frasa pendek. Perincikan BAHASA sahaja — JANGAN tambah kuantiti, bahan, kaedah, peralatan, sebab atau lokasi yang TIADA dalam nota.
CONTOH (huraikan bahasa, bukan fakta) — Nota: \"Kerja2 memasang Syiling di Aras 4, P02\" menjadi butiran: \"Kerja-kerja pemasangan siling sedang dijalankan oleh pihak kontraktor di Aras 4, Blok P02.\" Nota: \"Kerja2 flashing di rooftop, P03\" menjadi butiran: \"Kerja-kerja pemasangan flashing sedang dilaksanakan di kawasan rooftop (bumbung), Blok P03.\"
Untuk perkara yang tiada dalam nota, tinggalkan kosong atau false. Jangan reka data. Jangan hasilkan status atau peratus kemajuan."""


def build_prompt(doc_type: str, payload: Dict[str, Any]) -> Tuple[str, str]:
    facts = json.dumps(payload, ensure_ascii=False, indent=2)
    if doc_type == "memo":
        mtype = (payload.get("memoType") or "").lower()
        has_prog = bool(payload.get("programme"))
        guide = _MEMO_TYPE_GUIDE.get(mtype, "Jenis memo umum.")
        clean = {k: v for k, v in payload.items() if not (k == "programme" and not v)}
        memo_facts = json.dumps(clean, ensure_ascii=False, indent=2)
        prog_rule = (
            "Data programme (.mpp) DIBERIKAN dalam 'programme'. Anda boleh sertakan peratus/jadual kemajuan berdasarkan data 'programme' itu sahaja."
            if has_prog else
            "TIADA data programme (.mpp) dan tiada peratus dalam nota. JANGAN sertakan sebarang peratus kemajuan, status %, atau jadual kemajuan. Tulis HANYA berdasarkan poin yang diberi."
        )
        system = _MEMO_BASE + "\n" + guide + "\n" + prog_rule
        user = "Fakta untuk memo jenis " + mtype + ":\n" + memo_facts + "\n\nHasilkan JSON memo sekarang."
        return system, user
    if doc_type == "minit":
        return _MINIT_BASE, "Poin mesyuarat:\n" + facts + "\n\nDraf badan minit sekarang."
    if doc_type == "diary":
        return _DIARY_BASE, "Nota harian:\n" + facts + "\n\nHasilkan JSON sekarang."
    raise ValueError("Unknown docType: " + str(doc_type))