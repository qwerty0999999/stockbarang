# Product Requirements Document (PRD) – Sistem Inventori & Manajemen Aset
## Versi 3.0: Enterprise Asset & Smart Inventory Automation

**Tanggal:** September 2026  
**Proyek:** StockBarang (Sistem Manajemen Inventori & Siklus Hidup Aset Terintegrasi)  
**Tech Stack:** SvelteKit 2, Svelte 5 (Runes), Prisma ORM 5, PostgreSQL (Supabase), TailwindCSS 3, TypeScript  

---

## 1. Pendahuluan & Evaluasi Sistem

Sistem **StockBarang** saat ini telah sukses mengimplementasikan pemisahan mendasar antara:
1. **Barang Konsumsi (*Consumables*)**: Pelacakan kuantitas stok, batas minimum (*min stock*), transaksi masuk/keluar, dan suplier.
2. **Buku Induk Aset Tetap (*Fixed Assets / Household Register*)**: Pelacakan individual per unit fisik dengan kode aset unik, serial number, penanggung jawab (PIC), riwayat mutasi (*movement tracking*), serta pencetakan label barcode/QR.
3. **Peminjaman Terintegrasi (*Circulation & Loans*)**: Sirkulasi aset dan barang konsumsi dengan pencatatan kondisi awal/akhir dan deteksi keterlambatan.

### Latar Belakang PRD 3.0
Dalam pengoperasian riil di tingkat perusahaan/instansi, ditemukan kebutuhan-kebutuhan mendesak yang menjadi fokus pengembangan tahap v3.0:
- **Ketidakcocokan Stok Fisik vs Sistem**: Belum adanya modul formal **Stock Opname (Stocktaking)** berkala yang memiliki mekanisme rekonsiliasi dan *variance approval*.
- **Penyusutan Nilai Aset (Depresiasi)**: Aset tetap mengalami depresiasi tahunan/bulanan yang belum dihitung secara otomatis untuk laporan valuasi kekayaan perusahaan.
- **Pemeliharaan Aset (Maintenance & Service)**: Belum adanya riwayat servis berkala, biaya perbaikan, dan jadwal inspeksi aset bernilai tinggi (kendaraan, perangkat IT, mesin).
- **Integrasi Notifikasi Pasif**: Modul email dan WhatsApp (`email.ts`, `whatsapp.ts`) sudah tersedia secara teknis, namun belum dihubungkan ke alur kerja (*trigger*) transaksi atau peringatan batas waktu.
- **Pemberian Persetujuan (Workflow Approval)**: Pengeluaran barang dan peminjaman masih bersifat langsung tanpa verifikasi dari atasan/manajer divisi pemohon.
- **Kebutuhan Dokumen Resmi**: Belum ada generator Berita Acara Serah Terima (BAST) digital bertanda tangan elektronik (*digital signature*).

---

## 2. Tujuan & Sasaran Strategis

1. **Akurasi Stok 99%+**: Mengeliminasi selisih barang gudang melalui modul Stock Opname berbasis pemindaian kamera barcode/QR langsung.
2. **Visibilitas Penuh Nilai Aset**: Menghitung penyusutan nilai buku aset secara otomatis dengan metode Garis Lurus (*Straight-Line Depreciation*).
3. **Responsif & Nol Kelalaian**: Mengirimkan notifikasi instan via WhatsApp dan Email untuk peringatan stok kritis dan peminjaman terlambat (*zero overdue tolerance*).
4. **Akuntabilitas Mutasi & Pinjam**: Menghasilkan dokumen BAST PDF dengan verifikasi tanda tangan digital yang sah untuk setiap serah terima aset.
5. **Kenyamanan Operasional Mandiri**: Memberikan portal pemohon (*employee self-service*) bagi karyawan untuk melihat barang yang sedang dipegang dan mengajukan peminjaman/permintaan ATK.

---

## 3. Ruang Lingkup & Pilar Fitur Utama (PRD 3.0)

### 3.1 Modul Stock Opname & Rekonsiliasi Gudang
- **Sesi Stock Opname**: Pembukaan sesi audit berkala (per lokasi gudang atau per kategori).
- **Scanner Kamera Mobile**: Pemindaian barcode/QR barang langsung via kamera HP saat audit fisik di rak.
- **Kalkulasi Selisih Otomatis**: Perhitungan selisih antara hitungan fisik vs saldo sistem (*Variance Tracking*).
- **Eksekusi Penyesuaian (*Adjustment Approval*)**: Setelah diverifikasi Manajer, sistem otomatis menerbitkan transaksi penyesuaian (*Stock Adjustment*) ke log.

### 3.2 Siklus Hidup, Pemeliharaan & Depresiasi Aset Tetap
- **Kalkulator Depresiasi Aset**: Perhitungan nilai buku saat ini (*Current Book Value*), akumulasi penyusutan bulanan/tahunan, dan nilai sisa (*Salvage Value*) menggunakan metode Garis Lurus.
- **Log Servis & Pemeliharaan (*Asset Maintenance*)**: Penjadwalan servis rutin, pencatatan biaya perbaikan, nomor faktur reparasi, dan vendor bengkel/teknisi.
- **Status Aset Dinamis**: Menambahkan status `UNDER_MAINTENANCE` agar aset yang sedang diperbaiki tidak bisa dipinjam.

### 3.3 Otomasi Notifikasi Multi-Channel (WhatsApp & Email)
- **Pengingat H-1 Jatuh Tempo**: Mengirim pesan ramah ke nomor WhatsApp peminjam 24 jam sebelum batas waktu.
- **Alert Keterlambatan**: Notifikasi berkala via WhatsApp & Email ke peminjam dan supervisor jika pinjaman melewati batas waktu (*overdue*).
- **Alert Stok Kritis**: Email ringkasan harian ke Kepala Gudang untuk barang-barang di bawah batas minimum (*minStock*).

### 3.4 Universal Camera Barcode/QR Scanner
- Memperluas pemindai kamera (`@zxing/library`) ke:
  - Menu Peminjaman (scan QR Aset untuk pinjam / scan Surat untuk kembali).
  - Transaksi Masuk/Keluar (scan barcode langsung mengisi form).
  - Quick Asset Lookup (arahkan kamera ke label aset untuk melihat status langsung).

### 3.5 Berita Acara Serah Terima (BAST) & Digital Signature
- **Canvas Tanda Tangan Digital**: Penandatanganan digital langsung di layar sentuh atau mousepad.
- **Dokumen BAST Resmi**: Output PDF resmi dengan kop surat, rincian nomor seri/kondisi, tanda tangan kedua belah pihak, dan QR validasi keaslian.

### 3.6 Permohonan Barang & Workflow Approval (Requisition)
- **Portal Karyawan**: Karyawan dapat melihat stok barang konsumsi dan aset yang tersedia, lalu mengajukan permohonan peminjaman atau permintaan barang.
- **Multi-Level Approval**: Status alur: `DRAFT` &rarr; `PENDING_APPROVAL` &rarr; `APPROVED` / `REJECTED` &rarr; `COMPLETED`.

---

## 4. Matriks Peran & Hak Akses (RBAC v3.0)

| Modul & Fitur | Dev (Super User) | Admin | Manajemen / Staff Gudang | Karyawan / Peminjam |
|---|:---:|:---:|:---:|:---:|
| **Konfigurasi & Pengaturan Sistem** | ✅ | ✅ | ❌ | ❌ |
| **Buku Induk Aset & Master Data** | ✅ | ✅ | ✅ (View/Edit) | ❌ |
| **Transaksi In/Out Stok** | ✅ | ✅ | ✅ | ❌ |
| **Stock Opname (Audit & Approval)** | ✅ | ✅ (Approval) | ✅ (Hitung Fisik) | ❌ |
| **Depresiasi & Nilai Aset** | ✅ | ✅ | View Only | ❌ |
| **Pemeliharaan Aset (Maintenance)**| ✅ | ✅ | ✅ | ❌ |
| **Sirkulasi Peminjaman** | ✅ | ✅ | ✅ | View Status Milik Sendiri |
| **Pengajuan Permohonan (Requisition)**| ✅ | ✅ | ✅ | ✅ (Ajukan Permohonan) |
| **Persetujuan (Approval Engine)** | ✅ | ✅ | ❌ | ❌ |
| **Cetak BAST Digital & Label QR** | ✅ | ✅ | ✅ | View PDF Bukti Pinjam |
| **Laporan Komprehensif & Analitik**| ✅ | ✅ | ✅ (Operasional) | ❌ |

---

## 5. Rencana Skema Database Tambahan (Prisma)

- `StockOpname`: Menyimpan sesi opname, tanggal audit, status, dan penanggung jawab.
- `StockOpnameItem`: Menyimpan data per barang, jumlah sistem, jumlah hitung fisik, selisih (*variance*), dan alasan selisih.
- `AssetMaintenance`: Menyimpan riwayat servis, jadwal servis berkala, biaya perbaikan, dan rekanan vendor.
- `Requisition`: Menyimpan dokumen pengajuan barang/aset dari karyawan.
- `RequisitionItem`: Rincian item yang diajukan beserta kuantitas dan catatan.
- `HandoverDocument`: Berita Acara Serah Terima (BAST) beserta data tanda tangan digital (*signature canvas base64*).

---

## 6. Roadmap Implementasi Bertahap

1. **Sprint 1 (Fondasi Audit & Otomasi)**:
   - Implementasi skema Prisma `StockOpname` & `StockOpnameItem`.
   - UI Stock Opname dengan scanner kamera portabel dan kalkulasi selisih otomatis.
   - Mengaktifkan trigger notifikasi WhatsApp & Email otomatis.
2. **Sprint 2 (Siklus Aset & BAST Resmi)**:
   - Modul Pemeliharaan Aset (`AssetMaintenance`) dan kalkulator depresiasi Garis Lurus.
   - Komponen tanda tangan digital (`SignaturePad.svelte`) dan generator BAST PDF.
3. **Sprint 3 (Self-Service & Approval Flow)**:
   - Modul Permohonan Barang (`Requisition`) & dashboard approval untuk manajer.