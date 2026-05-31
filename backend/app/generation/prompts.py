"""Builds (system, user) prompts that generate the BODY of each document in
UTM house style. Header/footer/signature and the No. Rujukan are NEVER
generated here — those are produced by the user's template per their SOP.
"""
import json
from typing import Any, Dict, Tuple

_MEMO_BASE = (
    "Anda pembantu kepada Penolong Jurutera Awam (penyelia tapak) di UTM. "
    "Anda mendraf BAHAGIAN ISI (badan) memo projek rasmi dalam Bahasa Melayu rasmi, "
    "mengikut gaya rumah UTM. Peraturan:\n"
    "- Output HANYA perenggan bernombor badan memo. Mula pada "
    "'Dengan segala hormatnya perkara di atas adalah dirujuk.' sebagai perenggan 1.\n"
    "- JANGAN hasilkan kepala memo, No. Rujukan, tarikh, DARIPADA/KEPADA, blok "
    "tandatangan, atau cogan 'MALAYSIA MADANI'. Itu diuruskan oleh templat pengguna.\n"
    "- Jangan reka angka, tarikh, klausa atau fakta yang tidak diberi. Guna hanya "
    "fakta yang dibekalkan.\n"
    "- Gunakan jadual ringkas (markdown) apabila jenis memo memerlukannya.\n"
)

_MEMO_TYPE_GUIDE: Dict[str, str] = {
    "kelewatan": (
        "Jenis: Memo Kelewatan Kerja. Struktur: (1) pembukaan; (2) ringkasan kemajuan "
        "setakat tarikh cut-off dengan jadual keseluruhan (Rancang/Sebenar/Status) dan "
        "jadual mengikut blok/tred dengan punca kelewatan; (3) penemuan punca utama "
        "berdasarkan punca yang diberi; (4) isu bahan/jentera jika ada; (5) arahan "
        "menyediakan Pelan Pemulihan dan amaran ambang 20%/60 hari ke arah penamatan kontrak."
    ),
    "denda": (
        "Jenis: Memo Denda Kebersihan & Keselamatan. Ditujukan kepada kontraktor. "
        "Struktur: (1) pembukaan; (2) penemuan ketidakpatuhan semasa semakan pada tarikh "
        "diberi (Akta/Peraturan kebersihan & keselamatan); (3) penalti berdasarkan kontrak "
        "dengan Jadual Gantirugi (Bil item LD, Perkara, Sasaran Nilai, Kadar Penalti); "
        "(4) rujukan Laporan Bergambar dan arahan tindakan segera; (5) penghargaan."
    ),
    "ketidakpatuhan": (
        "Jenis: Memo Ketidakpatuhan / Tidak Ikut Spesifikasi/Turutan. Nyatakan apa yang "
        "dilakukan berbanding keperluan/spesifikasi, lokasi, rujukan gambar, dan arahan pembetulan."
    ),
    "kerosakan": (
        "Jenis: Memo Kerosakan Aset. Nyatakan aset/kerosakan, lokasi (blok), bila ditemui, "
        "pihak bertanggungjawab, rujukan gambar, dan arahan membaiki/menggantikan."
    ),
    "arahan": (
        "Jenis: Memo Arahan (cth henti kerja, siapkan blok, kemukakan jadual baru). "
        "Nyatakan tindakan yang diarahkan, blok/skop, tarikh akhir, dan akibat jika gagal."
    ),
    "teknikal": (
        "Jenis: Memo Isu Teknikal. Nyatakan pemerhatian teknikal, keperluan/kelulusan yang "
        "dilanggar, lokasi, dan arahan tindakan teknikal."
    ),
    "pemakluman": (
        "Jenis: Memo Pemakluman/Pentadbiran. Maklum atau minta perkara pentadbiran "
        "(cth surat lantikan, kemaskini dokumen, kehadiran mesyuarat) secara ringkas dan sopan."
    ),
}

_MINIT_BASE = (
    "Anda mendraf BAHAGIAN ISI minit Mesyuarat Pemantauan Khas UTM dalam BM rasmi, "
    "daripada poin-poin mentah yang dicatat semasa mesyuarat. Output bahagian bernombor "
    "(1.0 Pendahuluan, 2.0 Laporan Kemajuan, 2.x Isu, Punca, Tarikh Siap, Rumusan, Penutup) "
    "dengan lajur Status/Tindakan di mana sesuai. JANGAN hasilkan kotak maklumat projek, "
    "senarai kehadiran, atau blok tandatangan. Jangan reka fakta."
)

_DIARY_BASE = (
    "Anda menyusun Laporan Harian Tapak Bina UTM daripada nota mentah penyelia. "
    "JANGAN salin nota bulat-bulat; TULIS SEMULA sebagai ayat kerja profesional yang ringkas. "
    "Hasilkan SATU objek JSON SAHAJA (tiada teks/pagar kod lain) dengan kunci:\n"
    '- "tajuk","tarikh","hari": string\n'
    '- "skop": {"Senibina":bool,"Mekanikal":bool,"Elektrik":bool,"Awam":bool,"Lanskap":bool} (tandakan disiplin kerja hari itu)\n'
    '- "cuaca": {"pagi":"cerah|mendung|hujan","petang":"cerah|mendung|hujan"}\n'
    '- "tenaga": {"senarai": [["peranan/tred cth Tukang Siling (P07)","bilangan"]]}\n'
    '- "perlaksanaan": senarai {"masa":"Pagi|Petang","butiran":[ayat kerja],"kuantiti":"","kualiti":""}\n'
    '- "bahan": [["nama bahan/penghantaran","bil dibekal"]]\n'
    '- "pengurusan": {"keselamatan":bool,"kebersihan":bool,"papan tanda":bool,"pakaian kerja":bool,"waktu kerja":bool}\n'
    '- "catatan": [catatan penyelia], "arahan": [arahan kepada kontraktor]\n'
    '- "penyelarasan": string (penyelarasan bersama pelanggan)\n'
    '- "ujian": {"keterangan":"","keputusan":""}; "komen": string (mingguan, biasanya kosong)\n'
    "Untuk perkara yang tiada dalam nota, tinggalkan kosong/false. Jangan reka data. "
    "Jangan hasilkan status/peratus kemajuan."
), 'catatan' (catatan penyelia), 'arahan' (arahan kepada "
    "kontraktor — tanda sebagai cadangan), 'penyelarasan' (penyelarasan bersama pelanggan). "
    "JANGAN reka kiraan pekerja/jentera/bahan atau status — itu data tapak/.mpp. "
    "Output JSON sahaja, tanpa teks lain."
)


def build_prompt(doc_type: str, payload: Dict[str, Any]) -> Tuple[str, str]:
    facts = json.dumps(payload, ensure_ascii=False, indent=2)
    if doc_type == "memo":
        mtype = (payload.get("memoType") or "").lower()
        guide = _MEMO_TYPE_GUIDE.get(mtype, "Jenis memo umum.")
        system = _MEMO_BASE + "\n" + guide
        user = f"Fakta untuk memo jenis '{mtype}':\n{facts}\n\nDraf badan memo sekarang."
        return system, user
    if doc_type == "minit":
        return _MINIT_BASE, f"Poin mesyuarat:\n{facts}\n\nDraf badan minit sekarang."
    if doc_type == "diary":
        return _DIARY_BASE, f"Nota harian:\n{facts}\n\nHasilkan JSON sekarang."
    raise ValueError(f"Unknown docType: {doc_type}")
