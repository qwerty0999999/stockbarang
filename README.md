# StockBarang — Sistem Manajemen Inventaris

> Aplikasi web manajemen inventaris lengkap yang dibangun dengan **SvelteKit**, **Prisma ORM**, dan **PostgreSQL (Supabase)**. Dirancang untuk mencatat barang masuk/keluar, peminjaman, laporan stok, hingga cetak label barcode/QR — semua dalam satu platform.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Prasyarat](#prasyarat)
- [Instalasi & Konfigurasi](#instalasi--konfigurasi)
- [Skrip yang Tersedia](#skrip-yang-tersedia)
- [Struktur Database](#struktur-database)
- [Struktur Proyek](#struktur-proyek)
- [Role & Hak Akses](#role--hak-akses)
- [Build & Deploy](#build--deploy)

---

## Fitur Utama

### Dashboard
Ringkasan statistik real-time dalam satu tampilan:
- Total model barang, pengguna, dan supplier
- Total barang masuk & keluar (jumlah item dan jumlah transaksi)
- Status peminjaman: sudah dikembalikan vs belum dikembalikan
- Informasi akun pengguna yang sedang login (nama, ID, role)

### Manajemen Barang
- Tambah, edit, hapus barang dengan SKU, lokasi, harga, dan minimum stok
- Filter & pencarian barang
- Import data barang massal dari file **Excel**
- Update stok massal (batch update) untuk banyak barang sekaligus
- Notifikasi otomatis ketika stok di bawah batas minimum

### Transaksi Stok
- Catat transaksi **MASUK**, **KELUAR**, dan **ADJUSTMENT** stok
- Setiap transaksi dicatat lengkap: barang, jumlah, petugas, supplier, catatan, dan referensi (nomor invoice, dsb.)
- Riwayat transaksi dapat difilter berdasarkan tipe

### Peminjaman Barang
- Catat peminjaman barang beserta nama peminjam, tanggal rencana kembali, dan catatan
- Update status peminjaman: **DIPINJAM** → **DIKEMBALIKAN**
- Kode peminjaman unik otomatis (`loanCode`)
- Export laporan peminjaman ke **PDF**

### Manajemen Supplier
- Tambah, edit, hapus data supplier (nama, alamat, telepon, email)
- Supplier dapat dikaitkan langsung ke barang dan transaksi

### Laporan & Analitik
- Grafik transaksi barang (Chart.js)
- Grafik distribusi per kategori
- Export laporan ke **PDF** dan **Excel**

### Cetak Label
- Generate label **Barcode** (JsBarcode) dan **QR Code** (qrcode) per barang
- Dapat dicetak langsung dari browser

### Manajemen Admin & Pengguna
- Lihat dan kelola semua pengguna sistem
- Ubah role pengguna
- Hapus akun pengguna

### Profil Pengguna
- Ubah username dan informasi profil
- Ganti password
- Upload avatar/foto profil

---

## Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 |
| Styling | TailwindCSS 3 + PostCSS |
| Database | PostgreSQL (via Supabase) |
| ORM | Prisma 5 |
| Autentikasi | JWT (`jose`) + hashing password (`bcryptjs`) |
| Grafik | Chart.js 4 |
| PDF | jsPDF + jspdf-autotable |
| Excel | xlsx |
| Barcode | JsBarcode |
| QR Code | qrcode |
| Notifikasi | svelte-sonner |
| Runtime/Deploy | Node.js (`@sveltejs/adapter-node`) |
| Language | TypeScript |

---

## Prasyarat

Pastikan sudah terinstal:

- **Node.js** versi 18 ke atas
- **npm** versi 8 ke atas
- Akun [Supabase](https://supabase.com) (gratis) **atau** PostgreSQL yang berjalan secara lokal

---

## Instalasi & Konfigurasi

### 1. Clone Repositori

```bash
git clone <repo-url>
cd stockbarang
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Buat file `.env` di root proyek:

```bash
# Windows
copy .env.local .env

# Mac/Linux
cp .env.local .env
```

Kemudian sesuaikan isi `.env`:

```env
# Kunci rahasia untuk JWT (gunakan string acak yang panjang dan aman)
JWT_SECRET=ganti_dengan_secret_key_yang_kuat

# Koneksi via PgBouncer (untuk query normal)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"

# Koneksi langsung (untuk migrasi/push skema)
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
```

> **Catatan Supabase:** Nilai `DATABASE_URL` dan `DIRECT_URL` dapat ditemukan di dashboard Supabase → **Settings** → **Database** → **Connection String**.

### 4. Sinkronisasi Skema Database

Perintah ini akan membuat semua tabel di database sesuai dengan `prisma/schema.prisma`:

```bash
npm run db:push
```

### 5. (Opsional) Isi Data Awal

Jika tersedia file seed, jalankan:

```bash
npx tsx prisma/seed.ts
```

### 6. Jalankan Development Server

```bash
npm run dev
```

Buka browser dan akses: **`http://localhost:5173`**

---

## Skrip yang Tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server development dengan hot-reload |
| `npm run build` | Membuat build produksi di folder `build/` |
| `npm run preview` | Menjalankan preview dari hasil build produksi |
| `npm run check` | Memeriksa tipe TypeScript dan sintaks Svelte |
| `npm run db:generate` | Menghasilkan Prisma Client setelah perubahan skema |
| `npm run db:push` | Menyinkronkan skema Prisma ke database (tanpa migrasi) |
| `npm run db:studio` | Membuka Prisma Studio — GUI berbasis web untuk melihat & mengedit data |

---

## Struktur Database

Aplikasi ini memiliki 5 model utama:

| Model | Deskripsi |
|---|---|
| `User` | Pengguna sistem (admin, manajemen, dev) |
| `Category` | Kategori pengelompokan barang |
| `Supplier` | Data pemasok/supplier |
| `Item` | Data barang/inventaris |
| `Transaction` | Riwayat transaksi stok (masuk/keluar/adjustment) |
| `Loan` | Riwayat peminjaman dan pengembalian barang |

**Relasi antar model:**
- `Item` → `Category`, `Supplier`, `User`
- `Transaction` → `Item`, `User`, `Supplier`
- `Loan` → `Item`, `User`

---

## Struktur Proyek

```
stockbarang/
├── prisma/
│   └── schema.prisma          # Definisi skema database
│
├── src/
│   ├── app.html               # HTML template utama
│   ├── app.css                # Global CSS
│   ├── hooks.server.ts        # Middleware server (validasi sesi/JWT)
│   │
│   ├── lib/
│   │   ├── components/
│   │   │   ├── barcode/
│   │   │   │   └── LabelGenerator.svelte   # Generator label barcode & QR
│   │   │   └── charts/
│   │   │       ├── CategoryChart.svelte    # Grafik distribusi kategori
│   │   │       └── TransactionChart.svelte # Grafik transaksi
│   │   └── server/
│   │       ├── auth.ts        # Utilitas JWT: sign, verify, decode token
│   │       └── db.ts          # Instance Prisma Client
│   │
│   └── routes/
│       ├── login/             # Halaman login
│       ├── register/          # Halaman registrasi
│       │
│       ├── api/               # REST API endpoints (server-side)
│       │   ├── auth/
│       │   │   ├── login/         # POST — autentikasi pengguna
│       │   │   ├── logout/        # POST — hapus sesi
│       │   │   ├── register/      # POST — buat akun baru
│       │   │   ├── update-profile/# PUT  — ubah data profil
│       │   │   ├── change-password/# PUT — ganti password
│       │   │   └── upload-avatar/ # POST — upload foto profil
│       │   ├── inventory/
│       │   │   ├── +server.ts     # GET (list), POST (tambah barang)
│       │   │   ├── [id]/          # GET, PUT, DELETE per barang
│       │   │   ├── batch/         # PUT — update stok massal
│       │   │   └── import/        # POST — import dari Excel
│       │   ├── transactions/
│       │   │   └── +server.ts     # GET (list), POST (catat transaksi)
│       │   ├── loans/
│       │   │   ├── +server.ts     # GET (list), POST (catat peminjaman)
│       │   │   └── [id]/          # PUT — update status pengembalian
│       │   ├── suppliers/
│       │   │   ├── +server.ts     # GET, POST
│       │   │   └── [id]/          # PUT, DELETE
│       │   └── admin/
│       │       └── users/[id]/    # PUT (ubah role), DELETE (hapus user)
│       │
│       └── inventory/             # Halaman utama aplikasi (dilindungi auth)
│           ├── +layout.svelte     # Layout sidebar + navbar
│           ├── +page.svelte       # Dashboard utama
│           ├── items/             # Halaman manajemen barang
│           ├── transactions/      # Halaman riwayat transaksi
│           ├── peminjaman/        # Halaman peminjaman barang
│           ├── suppliers/         # Halaman manajemen supplier
│           ├── reports/           # Halaman laporan & grafik
│           ├── labels/            # Halaman cetak label barcode/QR
│           ├── admin/             # Halaman manajemen pengguna
│           └── profile/           # Halaman profil pengguna
│
├── static/                    # File statis (gambar, favicon, dll.)
├── package.json
├── svelte.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Role & Hak Akses

Sistem menggunakan 3 level role yang disimpan di database:

| Role | Deskripsi |
|---|---|
| `admin` | Akses penuh — termasuk manajemen pengguna, ubah role, dan hapus akun |
| `manajemen` | Akses operasional — kelola barang, transaksi, peminjaman, supplier, dan laporan |
| `dev` | Role developer — untuk keperluan pengembangan dan debugging |

Role dicek di setiap request API melalui JWT yang diverifikasi di `hooks.server.ts`.

---

## Build & Deploy

### Build Produksi

```bash
npm run build
```

Hasil build akan ada di folder `build/`.

### Menjalankan di Server

```bash
node build/index.js
```

### Variabel Environment di Produksi

Pastikan variabel berikut sudah diset di server/platform deployment:

```env
JWT_SECRET=...
DATABASE_URL=...
DIRECT_URL=...
```

> Aplikasi ini menggunakan `@sveltejs/adapter-node`, sehingga dapat di-deploy di server Node.js biasa, VPS, Railway, Render, maupun platform serupa.
