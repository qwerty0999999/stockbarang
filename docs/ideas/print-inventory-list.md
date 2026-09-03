# Cetak Daftar Stok (Inventory List Print)

## Problem Statement
**"How might we"** memungkinkan staf gudang untuk mencetak daftar stok barang untuk kebutuhan audit fisik gudang dengan mudah dan terstruktur?

## Recommended Direction

Implementasi fitur **Print Inventory List** di halaman inventory yang memungkinkan pengguna:
1. Melihat preview daftar semua item dengan detail (nama, SKU, quantity, lokasi, kategori)
2. Mencetak langsung ke printer atau menyimpan sebagai PDF melalui browser
3. Filter data sebelum print (berdasarkan kategori, lokasi, stok rendah saja)

Menggunakan fungsi native browser `window.print()` dengan CSS print-optimized. Solusi ini simpel, tidak butuh library tambahan, dan langsung work di semua browser.

## Key Assumptions to Validate
- [x] User punya kebutuhan print untuk audit fisik gudang
- [x] Browser print sudah memadai untuk kebutuhan saat ini
- [x] Data yang di-print perlu difilter (tidak selalu semua)

## MVP Scope
**IN:**
- Tombol "Cetak" di halaman inventory
- Tabel print-friendly (tanpa action buttons, tanpa pagination UI)
- Filter kategori sebelum print
- Preview sebelum print (modal/overlay)

**OUT:**
- Export ke PDF (bukan prioritas - browser sudah bisa save as PDF)
- Pengaturan layout/format lanjutan
- Email laporan

## Not Doing (and Why)
- **Export Excel** — bukan prioritas, bisa ditambahkan luego
- **Scheduled email reports** — overkill untuk kebutuhan saat ini
- **PDF library** — browser sudah bisa, tidak perlu library tambahan

## Open Questions
- Apakah format tabel saat ini sudah sesuai untuk print?
- Perlu include barcode/SKU di print-out?

## Implementation Plan
1. Tambahkan tombol "Cetak" di header halaman inventory
2. Buat CSS print (`@media print`)
3. Tambah filter kategori sebelum print
4. Modal preview sebelum print (opsional)
