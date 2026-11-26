// Memuat modul Node.js tanpa bergantung pada deklarasi tipe Node.
declare const require: (id: string) => any;
const readline = require("readline");
const { stdin: input, stdout: output } = require("process");

// Membuat interface terminal
const rl = readline.createInterface({ input, output });

// ============================================================
// BAGIAN 1: TIPE DATA, KONSTANTA, DAN DATA AWAL (SEED)
// ============================================================

// Struktur data untuk paket WiFi
interface Paket {
    kode: string;       // kode pilihan paket (1-5)
    nama: string;       // nama paket
    kecepatan: number;  // kecepatan dalam Mbps
    batas: number;      // batas maksimal perangkat
    harga: number;      // harga paket per bulan
}

// Struktur data untuk pelanggan beserta tagihannya
interface Pelanggan {
    id: string;                      // ID unik pelanggan
    nama: string;                    // nama pelanggan
    bulan: string;                   // bulan tagihan
    perangkat: number;               // jumlah perangkat
    paket: Paket;                    // paket yang dipilih
    status: "Lunas" | "Belum Lunas"; // status pembayaran
    denda: number;                   // denda keterlambatan
    total: number;                   // total tagihan yang dibayar
    metode: string;                  // metode pembayaran
}

// Daftar paket WiFi (nilai tetap, jadi memakai const)
const DAFTAR_PAKET: Paket[] = [
    { kode: "1", nama: "STAR",     kecepatan: 50, batas: 12, harga: 280000 },
    { kode: "2", nama: "PLATINUM", kecepatan: 30, batas: 10, harga: 220000 },
    { kode: "3", nama: "GRAND",    kecepatan: 20, batas: 8,  harga: 200000 },
    { kode: "4", nama: "GOLD",     kecepatan: 15, batas: 6,  harga: 150000 },
    { kode: "5", nama: "SILVER",   kecepatan: 10, batas: 4,  harga: 120000 }
];

// Ketentuan biaya (nilai tetap)
const BIAYA_ADMIN: number = 0;            // biaya admin per transaksi
const TARIF_DENDA_PER_HARI: number = 5000; // denda per hari keterlambatan

// Data awal pelanggan (seed minimal 5 data)
const dataPelanggan: Pelanggan[] = [
    { id: "PLG-001", nama: "Budi Santoso", bulan: "November", perangkat: 5, paket: DAFTAR_PAKET[0]!, status: "Belum Lunas", denda: 0, total: 0, metode: "-" },
    { id: "PLG-002", nama: "Siti Aminah",  bulan: "November", perangkat: 3, paket: DAFTAR_PAKET[1]!, status: "Lunas",       denda: 0, total: 220000, metode: "QRIS" },
    { id: "PLG-003", nama: "Andi Wijaya",  bulan: "Oktober",  perangkat: 4, paket: DAFTAR_PAKET[2]!, status: "Belum Lunas", denda: 0, total: 0, metode: "-" },
    { id: "PLG-004", nama: "Dewi Lestari", bulan: "November", perangkat: 2, paket: DAFTAR_PAKET[3]!, status: "Belum Lunas", denda: 0, total: 0, metode: "-" },
    { id: "PLG-005", nama: "Rizky Pratama", bulan: "Oktober", perangkat: 3, paket: DAFTAR_PAKET[4]!, status: "Lunas",       denda: 5000, total: 125000, metode: "Tunai" }
];

// Variabel yang berubah selama program berjalan (memakai let)
let nomorTerakhir: number = 5;     // penghitung untuk membuat ID baru
let jumlahTransaksi: number = 0;   // jumlah transaksi pembayaran yang berhasil

// ============================================================
// BAGIAN 2: FUNGSI BANTU
// ============================================================

// Fungsi untuk menerima input pengguna (mengembalikan string)
async function tanya(pesan: string): Promise<string> {
    return new Promise((resolve) => rl.question(pesan, resolve));
}

// Fungsi untuk mengubah angka menjadi format rupiah (mengembalikan string)
function rupiah(nilai: number): string {
    return "Rp" + nilai.toLocaleString("id-ID");
}

// Fungsi untuk menghitung denda keterlambatan (mengembalikan hasil hitung)
function hitungDenda(harga: number, hariTelat: number): number {
    // Denda dasar = jumlah hari x tarif per hari (compound *=)
    let denda: number = hariTelat;
    denda *= TARIF_DENDA_PER_HARI;

    // Batas maksimal denda = 20% dari harga paket (compound /=)
    let batasDenda: number = harga;
    batasDenda /= 5;

    // Denda tidak boleh melebihi batas maksimal
    if (denda > batasDenda) {
        denda = batasDenda;
    }
    return denda;
}

// Fungsi untuk menghitung total tagihan = harga + denda + admin (mengembalikan hasil hitung)
function hitungTotal(harga: number, denda: number): number {
    return harga + denda + BIAYA_ADMIN;
}

// Fungsi untuk membuat ID unik otomatis (tanpa parameter, mengembalikan string)
function buatId(): string {
    let idBaru: string = "";
    // Ulangi sampai ID yang dibuat belum dipakai pelanggan lain
    do {
        nomorTerakhir += 1;
        idBaru = "PLG-" + String(nomorTerakhir).padStart(3, "0");
    } while (dataPelanggan.some((p) => p.id === idBaru));
    return idBaru;
}

// Fungsi untuk membaca teks yang tidak boleh kosong
async function bacaTeks(pesan: string): Promise<string> {
    let teks: string = (await tanya(pesan)).trim();
    // Ulangi selama input kosong
    while (teks === "") {
        console.log("Input tidak boleh kosong!");
        teks = (await tanya(pesan)).trim();
    }
    return teks;
}

// Fungsi untuk membaca angka valid (bukan NaN dan tidak negatif)
async function bacaAngka(pesan: string, minimal: number): Promise<number> {
    let angka: number = Number(await tanya(pesan));
    // Ulangi selama bukan angka atau kurang dari minimal
    while (isNaN(angka) || angka < minimal) {
        console.log("Input harus berupa angka minimal " + minimal + "!");
        angka = Number(await tanya(pesan));
    }
    return angka;
}

// Fungsi untuk mencari pelanggan berdasarkan ID (find)
function cariById(id: string): Pelanggan | undefined {
    return dataPelanggan.find((p) => p.id.toLowerCase() === id.toLowerCase());
}

// Fungsi untuk menampilkan daftar paket (void, tanpa parameter)
function tampilkanPaket(): void {
    console.log("\n========== DAFTAR PAKET WIFI ==========");
    // Menampilkan setiap paket dengan forEach
    DAFTAR_PAKET.forEach((pk) => {
        console.log(pk.kode + ". " + pk.nama.padEnd(8) + " | " + pk.kecepatan + " Mbps | " +
            rupiah(pk.harga) + " | maks " + pk.batas + " perangkat");
    });
}

// Fungsi untuk menampilkan detail satu pelanggan (void, dengan parameter)
function tampilkanDetail(p: Pelanggan): void {
    console.log("--------------------------------------");
    console.log("ID Pelanggan    :", p.id);
    console.log("Nama Pelanggan  :", p.nama);
    console.log("Bulan           :", p.bulan);
    console.log("Paket           :", p.paket.nama, "(" + p.paket.kecepatan + " Mbps)");
    console.log("Jumlah Perangkat:", p.perangkat);
    console.log("Harga Paket     :", rupiah(p.paket.harga));
    console.log("Status          :", p.status);
    // Denda dan total hanya relevan jika sudah lunas
    if (p.status === "Lunas") {
        console.log("Denda           :", rupiah(p.denda));
        console.log("Total Dibayar   :", rupiah(p.total));
        console.log("Metode Bayar    :", p.metode);
    }
    console.log("--------------------------------------");
}

// Fungsi untuk menampilkan menu utama (void, tanpa parameter)
function tampilkanMenu(): void {
    console.log("\n======================================");
    console.log("          JOELENT NETWORK");
    console.log("      PEMBAYARAN TAGIHAN WIFI");
    console.log("======================================");
    console.log("1. Tambah Pelanggan (Create)");
    console.log("2. Lihat Semua Pelanggan (Read)");
    console.log("3. Lihat Detail berdasarkan ID (Read)");
    console.log("4. Ubah Data Pelanggan (Update)");
    console.log("5. Hapus Pelanggan (Delete)");
    console.log("6. Cari Pelanggan (Search)");
    console.log("7. Bayar Tagihan");
    console.log("0. Keluar");
}

// ============================================================
// BAGIAN 3: FITUR CREATE
// ============================================================

async function tambahData(): Promise<void> {
    console.log("\n--- TAMBAH PELANGGAN ---");

    // Memasukkan data pelanggan (validasi: tidak boleh kosong)
    const nama = await bacaTeks("Nama pelanggan: ");
    const bulan = await bacaTeks("Bulan pembayaran: ");
    const perangkat = await bacaAngka("Jumlah perangkat: ", 1);

    // Meminta pilihan paket
    tampilkanPaket();
    const pilihan = await tanya("Pilih paket (1-5): ");
    const paket = DAFTAR_PAKET.find((pk) => pk.kode === pilihan);

    // Memeriksa paket yang dipilih
    if (paket === undefined) {
        console.log("Pilihan paket tidak tersedia!");
        return;
    }

    // Memeriksa jumlah perangkat terhadap batas paket
    if (perangkat > paket.batas) {
        console.log("Jumlah perangkat tidak sesuai paket!");
        console.log("Maksimal perangkat:", paket.batas);
        return;
    }

    // Konfirmasi data sebelum disimpan
    const konfirmasi = (await tanya("Konfirmasi data? (ya/tidak): ")).toLowerCase();
    const valid: boolean = konfirmasi === "ya";
    if (!valid) {
        console.log("Data tidak dikonfirmasi, penyimpanan dibatalkan.");
        return;
    }

    // Menyimpan data baru ke array dengan push
    const pelangganBaru: Pelanggan = {
        id: buatId(),
        nama: nama,
        bulan: bulan,
        perangkat: perangkat,
        paket: paket,
        status: "Belum Lunas",
        denda: 0,
        total: 0,
        metode: "-"
    };
    dataPelanggan.push(pelangganBaru);
    console.log("Data berhasil ditambahkan dengan ID:", pelangganBaru.id);
}

// ============================================================
// BAGIAN 4: FITUR READ
// ============================================================

// Menampilkan seluruh data pelanggan
function lihatSemua(): void {
    console.log("\n--- DAFTAR SELURUH PELANGGAN ---");

    // Pesan khusus jika data kosong
    if (dataPelanggan.length === 0) {
        console.log("Data pelanggan masih kosong.");
        return;
    }

    // Menampilkan data satu per satu dengan for biasa
    for (let i = 0; i < dataPelanggan.length; i++) {
        const p = dataPelanggan[i];
        if (p === undefined) continue;
        console.log((i + 1) + ". " + p.id + " | " + p.nama.padEnd(14) + " | " +
            p.bulan.padEnd(9) + " | " + p.paket.nama.padEnd(8) + " | " + p.status);
    }
    console.log("Total pelanggan:", dataPelanggan.length);
}

// Menampilkan detail satu pelanggan berdasarkan ID
async function lihatDetail(): Promise<void> {
    console.log("\n--- DETAIL PELANGGAN ---");
    const id = await bacaTeks("Masukkan ID pelanggan: ");
    const p = cariById(id);

    // Pesan jika ID tidak ditemukan
    if (p === undefined) {
        console.log("ID pelanggan tidak ditemukan!");
    } else {
        tampilkanDetail(p);
    }
}

// ============================================================
// BAGIAN 5: FITUR UPDATE
// ============================================================

async function ubahData(): Promise<void> {
    console.log("\n--- UBAH DATA PELANGGAN ---");
    const id = await bacaTeks("Masukkan ID pelanggan: ");
    const p = cariById(id);

    // Pesan jika ID tidak ditemukan
    if (p === undefined) {
        console.log("ID pelanggan tidak ditemukan!");
        return;
    }

    // Menampilkan nilai lama terlebih dahulu
    console.log("Data saat ini:");
    tampilkanDetail(p);
    console.log("(Tekan Enter untuk melewati kolom yang tidak ingin diubah)");

    // Mengubah nama (kosong = tidak diubah)
    const namaBaru = (await tanya("Nama baru [" + p.nama + "]: ")).trim();
    if (namaBaru !== "") {
        p.nama = namaBaru;
    }

    // Mengubah bulan (kosong = tidak diubah)
    const bulanBaru = (await tanya("Bulan baru [" + p.bulan + "]: ")).trim();
    if (bulanBaru !== "") {
        p.bulan = bulanBaru;
    }

    // Mengubah paket (kosong = tidak diubah)
    tampilkanPaket();
    const paketBaru = (await tanya("Paket baru (1-5) [" + p.paket.nama + "]: ")).trim();
    if (paketBaru !== "") {
        const pk = DAFTAR_PAKET.find((x) => x.kode === paketBaru);
        if (pk === undefined) {
            console.log("Pilihan paket tidak tersedia, paket tidak diubah.");
        } else if (p.status === "Lunas") {
            // Paket tidak boleh diubah jika tagihan sudah lunas
            console.log("Tagihan sudah lunas, paket tidak dapat diubah.");
        } else {
            p.paket = pk;
        }
    }

    // Mengubah jumlah perangkat (kosong = tidak diubah)
    const perangkatBaru = (await tanya("Jumlah perangkat baru [" + p.perangkat + "]: ")).trim();
    if (perangkatBaru !== "") {
        const angka = Number(perangkatBaru);
        // Validasi: angka valid, minimal 1, dan tidak melebihi batas paket
        if (isNaN(angka) || angka < 1 || angka > p.paket.batas) {
            console.log("Jumlah perangkat tidak valid (maks " + p.paket.batas + "), tidak diubah.");
        } else {
            p.perangkat = angka;
        }
    }

    // Jika paket baru membuat perangkat melebihi batas, sesuaikan otomatis
    if (p.perangkat > p.paket.batas) {
        p.perangkat = p.paket.batas;
        console.log("Jumlah perangkat disesuaikan menjadi batas paket:", p.paket.batas);
    }

    console.log("Data berhasil diperbarui.");
}

// ============================================================
// BAGIAN 6: FITUR DELETE
// ============================================================

async function hapusData(): Promise<void> {
    console.log("\n--- HAPUS PELANGGAN ---");

    // Pesan jika data kosong
    if (dataPelanggan.length === 0) {
        console.log("Data pelanggan masih kosong.");
        return;
    }

    const id = await bacaTeks("Masukkan ID pelanggan: ");
    const index = dataPelanggan.findIndex((p) => p.id.toLowerCase() === id.toLowerCase());

    // Pesan jika ID tidak ditemukan
    if (index === -1) {
        console.log("ID pelanggan tidak ditemukan!");
        return;
    }

    // Konfirmasi (Y/N) sebelum menghapus
    const yakin = (await tanya("Yakin hapus " + dataPelanggan[index]!.nama + "? (Y/N): ")).toUpperCase();
    if (yakin === "Y") {
        dataPelanggan.splice(index, 1); // menghapus data dari array
        console.log("Data berhasil dihapus.");
    } else {
        console.log("Penghapusan dibatalkan.");
    }
}

// ============================================================
// BAGIAN 7: FITUR SEARCH
// ============================================================

async function cariData(): Promise<void> {
    console.log("\n--- CARI PELANGGAN ---");
    const kataKunci = (await bacaTeks("Kata kunci (nama/ID/bulan): ")).toLowerCase();

    // Memilih filter status
    console.log("Filter status: 1. Semua  2. Lunas  3. Belum Lunas");
    const pilihFilter = await tanya("Pilih filter (1-3): ");

    // SWITCH: menentukan filter status berdasarkan pilihan
    let filterStatus: string = "";
    switch (pilihFilter) {
        case "1":
            filterStatus = "Semua";
            break;
        case "2":
            filterStatus = "Lunas";
            break;
        case "3":
            filterStatus = "Belum Lunas";
            break;
        default:
            filterStatus = "Semua";
            console.log("Pilihan tidak valid, memakai filter Semua.");
            break;
    }

    // Mencari data (tidak sensitif huruf besar/kecil) dengan filter
    const hasil = dataPelanggan.filter((p) => {
        const cocokKata = p.nama.toLowerCase().includes(kataKunci) ||
            p.id.toLowerCase().includes(kataKunci) ||
            p.bulan.toLowerCase().includes(kataKunci);
        const cocokStatus = filterStatus === "Semua" || p.status === filterStatus;
        return cocokKata && cocokStatus;
    });

    // Menampilkan jumlah hasil atau pesan tidak ditemukan
    if (hasil.length === 0) {
        console.log("Data tidak ditemukan.");
    } else {
        console.log("Ditemukan " + hasil.length + " data:");
        // Menampilkan hasil dengan for...of
        for (const p of hasil) {
            console.log("- " + p.id + " | " + p.nama + " | " + p.bulan + " | " + p.paket.nama + " | " + p.status);
        }
    }
}

// ============================================================
// BAGIAN 8: FITUR BAYAR TAGIHAN (DENDA DAN TOTAL)
// ============================================================

async function bayarTagihan(): Promise<void> {
    console.log("\n--- BAYAR TAGIHAN ---");
    const id = await bacaTeks("Masukkan ID pelanggan: ");
    const p = cariById(id);

    // Pesan jika ID tidak ditemukan
    if (p === undefined) {
        console.log("ID pelanggan tidak ditemukan!");
        return;
    }

    // Pesan jika tagihan sudah lunas
    if (p.status === "Lunas") {
        console.log("Tagihan pelanggan ini sudah lunas.");
        return;
    }

    // Menghitung denda dan total tagihan
    console.log("Pelanggan:", p.nama, "| Paket:", p.paket.nama, "| Bulan:", p.bulan);
    const hariTelat = await bacaAngka("Jumlah hari keterlambatan (0 jika tepat waktu): ", 0);
    const denda = hitungDenda(p.paket.harga, hariTelat);
    const total = hitungTotal(p.paket.harga, denda);

    console.log("Harga Paket   :", rupiah(p.paket.harga));
    console.log("Denda         :", rupiah(denda), "(" + hariTelat + " hari)");
    console.log("Biaya Admin   :", rupiah(BIAYA_ADMIN));
    console.log("Total Tagihan :", rupiah(total));

    // Menampilkan pilihan metode pembayaran
    console.log("\n1. Transfer Bank");
    console.log("2. QRIS");
    console.log("3. Tunai");
    const pilihBayar = await tanya("Pilih pembayaran (1-3): ");

    // SWITCH: menentukan metode pembayaran
    let metode: string = "";
    switch (pilihBayar) {
        case "1":
            metode = "Transfer Bank";
            break;
        case "2":
            metode = "QRIS";
            break;
        case "3":
            metode = "Tunai";
            break;
        default:
            metode = "Tidak tersedia";
            break;
    }

    // IF tingkat 1: memeriksa metode pembayaran
    if (metode !== "Tidak tersedia") {
        const bayar = await bacaAngka("Nominal pembayaran: Rp", 1);

        // IF tingkat 2: nominal harus kelipatan Rp1.000 (operator %)
        if (bayar % 1000 === 0) {

            // IF tingkat 3: memeriksa kecukupan uang pembayaran
            if (bayar >= total) {
                const kembali = bayar - total;

                // Menyimpan hasil pembayaran ke data pelanggan
                p.status = "Lunas";
                p.denda = denda;
                p.total = total;
                p.metode = metode;
                jumlahTransaksi += 1;

                // Menampilkan struk pembayaran
                console.log("\n========== STRUK PEMBAYARAN ==========");
                console.log("JOELENT NETWORK");
                console.log("--------------------------------------");
                console.log("ID Pelanggan   :", p.id);
                console.log("Nama Pelanggan :", p.nama);
                console.log("Bulan          :", p.bulan);
                console.log("Paket          :", p.paket.nama, "(" + p.paket.kecepatan + " Mbps)");
                console.log("Harga Paket    :", rupiah(p.paket.harga));
                console.log("Denda          :", rupiah(denda));
                console.log("Biaya Admin    :", rupiah(BIAYA_ADMIN));
                console.log("Total Tagihan  :", rupiah(total));
                console.log("Metode Bayar   :", metode);
                console.log("Uang Dibayar   :", rupiah(bayar));
                console.log("Kembalian      :", rupiah(kembali));
                console.log("Status         : BERHASIL");
                console.log("Jumlah Transaksi:", jumlahTransaksi);
                console.log("======================================");
                console.log("Terima kasih telah menggunakan WiFi kami!");
            } else {
                // Menghitung kekurangan pembayaran (compound -=)
                let kurang: number = total;
                kurang -= bayar;
                console.log("Status: GAGAL. Uang kurang", rupiah(kurang));
            }
        } else {
            console.log("Nominal harus kelipatan Rp1.000!");
        }
    } else {
        console.log("Metode pembayaran tidak tersedia!");
    }
}

// ============================================================
// BAGIAN 9: MENU UTAMA
// ============================================================

async function main(): Promise<void> {
    let keluar: boolean = false; // penanda untuk menghentikan perulangan menu

    // Perulangan menu sampai pengguna memilih keluar
    while (!keluar) {
        tampilkanMenu();
        const pilihan = (await tanya("Pilih menu (0-7): ")).trim();

        // SWITCH: menjalankan fitur sesuai pilihan menu
        switch (pilihan) {
            case "1":
                await tambahData();
                break;
            case "2":
                lihatSemua();
                break;
            case "3":
                await lihatDetail();
                break;
            case "4":
                await ubahData();
                break;
            case "5":
                await hapusData();
                break;
            case "6":
                await cariData();
                break;
            case "7":
                await bayarTagihan();
                break;
            case "0":
                keluar = true;
                console.log("Terima kasih, program selesai.");
                break;
            default:
                // Menangani input menu yang tidak valid
                console.log("Pilihan menu tidak valid! Masukkan angka 0-7.");
                break;
        }
    }
}

// Menjalankan program dan menangani kesalahan
main()
    .catch((error) => console.error("Terjadi kesalahan:", error))
    .finally(() => rl.close());