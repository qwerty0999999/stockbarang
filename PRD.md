# Product Requirements Document (PRD) – Sistem Inventori & Manajemen Aset (Buku Induk)

**Versi:** 2.0 (Pembaruan Fitur Peminjaman & Household Register)  
**Tanggal:** 2026-09-04  
**Proyek:** Stockbarang (Sistem Manajemen Inventori & Aset Perusahaan)

## 1. Pendahuluan

Sistem ini dirancang tidak hanya untuk mengelola stok barang yang sifatnya habis pakai (consumables), tetapi juga bertindak sebagai Buku Induk Inventaris (Household Register) untuk melacak aset tetap perusahaan. Sistem memfasilitasi pencatatan barang masuk, manajemen perpindahan aset, peminjaman barang oleh karyawan/pihak luar, serta pelaporan yang komprehensif.

## 2. Tujuan

- Memisahkan dan mengelola dua jenis barang: Barang Konsumsi (dihitung berdasarkan kuantitas/stok) dan Aset Tetap/Buku Induk (dilacak per unit fisik dengan kode unik).
- Mendata seluruh barang masuk beserta asal usul (supplier/vendor) dan dokumen referensinya.
- Mengelola sistem peminjaman barang (loan) yang terintegrasi dengan data profil peminjam.
- Mengetahui riwayat, kondisi fisik, dan lokasi penempatan setiap aset (fitur Buku Induk).

## 3. Ruang Lingkup

Sistem mencakup:

- **Manajemen Master Data:** Kategori, Merek, Lokasi (Ruangan), Supplier, Data Peminjam/Karyawan.
- **Buku Induk Inventaris (Household Register):** Pencatatan aset tetap dengan Serial Number / Kode Inventaris unik, pelacakan kondisi, dan penanggung jawab (PIC).
- **Manajemen Stok Konsumsi:** Pencatatan stok barang habis pakai dengan SKU umum.
- **Transaksi In/Out:** Pencatatan barang masuk (pembelian/penerimaan) dan keluar (pemakaian/mutasi).
- **Modul Peminjaman:** Peminjaman barang dengan pencatatan identitas peminjam, batas waktu, dan validasi kondisi barang saat dipinjam vs dikembalikan.
- **Fitur Pendukung:** QR Code/Barcode aset, Export/Import data, dan Notifikasi keterlambatan.

## 4. Pengguna dan Peran

| Peran | Hak Akses |
|-------|-----------|
| Admin | Akses penuh ke semua modul, pengaturan sistem, kelola pengguna, approval data. |
| Manajemen / Staff Gudang | Mencatat barang masuk/keluar, melakukan update Buku Induk, memproses peminjaman. |
| Karyawan / Peminjam | Mengajukan peminjaman barang, melihat status peminjaman aktif. |

## 5. Fitur Utama

### 5.1 Buku Induk Inventaris (Household Register)
- Setiap aset memiliki kode unik (Serial Number / Asset Tag).
- Melacak: lokasi, kondisi (baik/rusak/hilang), PIC, tanggal perolehan, dan nilai aset.
- Riwayat perpindahan aset tercatat lengkap.

### 5.2 Modul Peminjaman
- Pencatatan peminjam (internal/karyawan atau eksternal).
- Batas waktu peminjaman dengan notifikasi otomatis.
- Validasi kondisi barang saat dipinjam dan dikembalikan.
- Laporan keterlambatan dan riwayat peminjaman per orang/barang.

### 5.3 Manajemen Stok Konsumsi
- Tracking berdasarkan SKU dan kuantitas.
- Alert stok minimum.
- Pencatatan barang masuk dari supplier dengan referensi dokumen (PO/Faktur).

### 5.4 Pelaporan
- Laporan inventaris aset per lokasi/kategori/kondisi.
- Laporan stok konsumsi (masuk/keluar/sisa).
- Laporan peminjaman aktif dan riwayat.
- Export ke format Excel/PDF.

## 6. Non-Functional Requirements
- Sistem berbasis web, dapat diakses dari browser modern.
- Dukungan QR Code/Barcode untuk scanning aset.
- Backup data berkala dan keamanan akses berbasis role.

## 7. Catatan Tambahan
- Integrasi dengan sistem HR untuk data karyawan (opsional).
- Support multi-cabang/perusahaan jika diperlukan di masa depan.