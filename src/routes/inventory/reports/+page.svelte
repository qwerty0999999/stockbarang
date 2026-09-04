<script lang="ts">
  import { jsPDF } from 'jspdf';
  import autoTable from 'jspdf-autotable';
  import * as XLSX from 'xlsx';

  let { data } = $props();
  let activeTab = $state<'assets' | 'items' | 'transactions' | 'loans'>('assets');

  function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  }

  function formatDate(d: string | Date | null) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // --- FILTER LAPORAN ASET ---
  let assetCategory = $state('');
  let assetLocation = $state('');
  let assetCondition = $state('');
  let filteredAssets = $derived(
    data.assets.filter((a: any) => {
      const matchCat = assetCategory ? a.categoryId?.toString() === assetCategory : true;
      const matchLoc = assetLocation ? a.locationId?.toString() === assetLocation : true;
      const matchCond = assetCondition ? a.condition === assetCondition : true;
      return matchCat && matchLoc && matchCond;
    })
  );

  let totalFilteredAssetValue = $derived(
    filteredAssets.reduce((sum: number, a: any) => sum + (a.price || 0), 0)
  );

  // --- FILTER LAPORAN STOK KONSUMSI ---
  let itemCategory = $state('');
  let itemStockOnly = $state(false);
  let filteredItems = $derived(
    data.items.filter((i: any) => {
      const matchCat = itemCategory ? i.categoryId?.toString() === itemCategory : true;
      const matchStock = itemStockOnly ? i.quantity <= i.minStock : true;
      return matchCat && matchStock;
    })
  );

  let totalFilteredItemValue = $derived(
    filteredItems.reduce((sum: number, i: any) => sum + (i.quantity * i.price), 0)
  );

  // --- FILTER TRANSAKSI ---
  let filterMulai = $state('');
  let filterSampai = $state('');
  let filterJenis = $state('Semua');

  let filteredTransactions = $derived(
    data.transactions.filter((t: any) => {
      let matchJenis = true;
      if (filterJenis === 'Barang Masuk') matchJenis = t.type === 'MASUK';
      else if (filterJenis === 'Barang Keluar') matchJenis = t.type === 'KELUAR';
      
      let matchTanggal = true;
      if (filterMulai && filterSampai) {
        const txDate = new Date(t.createdAt).getTime();
        const start = new Date(filterMulai).setHours(0, 0, 0, 0);
        const end = new Date(filterSampai).setHours(23, 59, 59, 999);
        matchTanggal = txDate >= start && txDate <= end;
      }
      return matchJenis && matchTanggal;
    })
  );

  // --- FILTER PEMINJAMAN ---
  let loanStatusFilter = $state('Semua');
  let filteredLoans = $derived(
    data.loans.filter((l: any) => {
      if (loanStatusFilter === 'DIPINJAM') return l.status === 'DIPINJAM' && !l.isOverdue;
      if (loanStatusFilter === 'TERLAMBAT') return l.isOverdue;
      if (loanStatusFilter === 'DIKEMBALIKAN') return l.status === 'DIKEMBALIKAN';
      return true;
    })
  );

  // ================= EXPORT FUNCTIONS =================

  // --- 1. ASET EXPORT ---
  function exportExcelAssets() {
    const wsData = [
      ['No', 'Kode Aset', 'Serial Number', 'Nama Aset', 'Kategori', 'Merek', 'Lokasi', 'PIC', 'Tgl Perolehan', 'Nilai (Rp)', 'Kondisi', 'Status'],
      ...filteredAssets.map((a: any, index: number) => [
        index + 1,
        a.assetCode,
        a.serialNumber || '-',
        a.name,
        a.category?.name || '-',
        a.brand?.name || '-',
        a.location?.name || '-',
        a.pic || '-',
        formatDate(a.purchaseDate),
        a.price || 0,
        a.condition,
        a.status
      ])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Buku Induk Aset");
    XLSX.writeFile(wb, "Laporan_Buku_Induk_Aset.xlsx");
  }

  function exportPdfAssets() {
    const doc = new jsPDF('landscape');
    doc.text("LAPORAN BUKU INDUK ASET TETAP (HOUSEHOLD REGISTER)", 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak tanggal: ${formatDate(new Date())} | Total: ${filteredAssets.length} unit | Nilai: ${formatRupiah(totalFilteredAssetValue)}`, 14, 21);

    const tableData = filteredAssets.map((a: any, index: number) => [
      index + 1,
      a.assetCode,
      a.name,
      a.category?.name || '-',
      a.location?.name || '-',
      a.pic || '-',
      formatDate(a.purchaseDate),
      formatRupiah(a.price),
      a.condition,
      a.status
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['No', 'Kode Aset', 'Nama Aset', 'Kategori', 'Lokasi', 'PIC', 'Tgl Beli', 'Nilai', 'Kondisi', 'Status']],
      body: tableData,
      styles: { fontSize: 8 }
    });

    doc.save("Laporan_Buku_Induk_Aset.pdf");
  }

  // --- 2. STOK KONSUMSI EXPORT ---
  function exportExcelItems() {
    const wsData = [
      ['No', 'SKU', 'Nama Barang', 'Kategori', 'Lokasi', 'Stok', 'Min Stok', 'Harga Satuan', 'Total Nilai'],
      ...filteredItems.map((i: any, index: number) => [
        index + 1,
        i.sku || '-',
        i.name,
        i.category?.name || '-',
        i.location || '-',
        i.quantity,
        i.minStock,
        i.price,
        i.quantity * i.price
      ])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Stok Konsumsi");
    XLSX.writeFile(wb, "Laporan_Stok_Konsumsi.xlsx");
  }

  function exportPdfItems() {
    const doc = new jsPDF();
    doc.text("LAPORAN STOK BARANG KONSUMSI", 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak tanggal: ${formatDate(new Date())} | Total Nilai Stok: ${formatRupiah(totalFilteredItemValue)}`, 14, 21);

    const tableData = filteredItems.map((i: any, index: number) => [
      index + 1,
      i.sku || '-',
      i.name,
      i.quantity.toString(),
      i.minStock.toString(),
      formatRupiah(i.price),
      formatRupiah(i.quantity * i.price)
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['No', 'SKU', 'Nama Barang', 'Stok', 'Min', 'Harga Satuan', 'Total Nilai']],
      body: tableData,
      styles: { fontSize: 8 }
    });

    doc.save("Laporan_Stok_Barang_Konsumsi.pdf");
  }

  // --- 3. TRANSAKSI EXPORT ---
  function exportExcelTransactions() {
    const wsData = [
      ['No', 'Tanggal', 'Jenis', 'Nama Barang', 'Jumlah', 'Supplier / Vendor', 'No. Referensi', 'Petugas', 'Catatan'],
      ...filteredTransactions.map((t: any, index: number) => [
        index + 1,
        formatDate(t.createdAt),
        t.type,
        t.item?.name || '-',
        t.quantity,
        t.supplier?.name || '-',
        t.reference || '-',
        t.user?.username || '-',
        t.notes || t.note || '-'
      ])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
    XLSX.writeFile(wb, "Laporan_Transaksi.xlsx");
  }

  function exportPdfTransactions() {
    const doc = new jsPDF('landscape');
    doc.text("LAPORAN TRANSAKSI BARANG MASUK / KELUAR", 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak tanggal: ${formatDate(new Date())} | Total Transaksi: ${filteredTransactions.length}`, 14, 21);

    const tableData = filteredTransactions.map((t: any, index: number) => [
      index + 1,
      formatDate(t.createdAt),
      t.type,
      t.item?.name || '-',
      t.quantity.toString(),
      t.supplier?.name || '-',
      t.reference || '-',
      t.user?.username || '-'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['No', 'Tanggal', 'Jenis', 'Nama Barang', 'Jumlah', 'Supplier', 'No. Ref', 'Petugas']],
      body: tableData,
      styles: { fontSize: 8 }
    });

    doc.save("Laporan_Transaksi.pdf");
  }

  // --- 4. PEMINJAMAN EXPORT ---
  function exportExcelLoans() {
    const wsData = [
      ['No', 'Kode Pinjam', 'Peminjam', 'Tipe Peminjam', 'Barang / Aset', 'Qty', 'Tgl Pinjam', 'Target Kembali', 'Realisasi Kembali', 'Status', 'Kondisi Awal', 'Kondisi Akhir'],
      ...filteredLoans.map((l: any, index: number) => [
        index + 1,
        l.loanCode,
        l.borrower?.name || l.borrowerName || '-',
        l.borrower?.type === 'external' ? 'Eksternal' : 'Internal',
        l.asset ? `[ASET] ${l.asset.name}` : (l.item ? `[KONSUMSI] ${l.item.name}` : '-'),
        l.quantity,
        formatDate(l.borrowDate),
        formatDate(l.expectedReturnDate),
        formatDate(l.actualReturnDate),
        l.isOverdue ? 'TERLAMBAT' : l.status,
        l.conditionBefore || '-',
        l.conditionAfter || '-'
      ])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Peminjaman");
    XLSX.writeFile(wb, "Laporan_Peminjaman.xlsx");
  }

  function exportPdfLoans() {
    const doc = new jsPDF('landscape');
    doc.text("LAPORAN SIRKULASI & STATUS PEMINJAMAN", 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak tanggal: ${formatDate(new Date())} | Total: ${filteredLoans.length} record`, 14, 21);

    const tableData = filteredLoans.map((l: any, index: number) => [
      index + 1,
      l.loanCode,
      l.borrower?.name || l.borrowerName || '-',
      l.asset ? `[ASET] ${l.asset.name}` : (l.item ? `[KONSUMSI] ${l.item.name}` : '-'),
      l.quantity.toString(),
      formatDate(l.borrowDate),
      formatDate(l.expectedReturnDate),
      formatDate(l.actualReturnDate),
      l.isOverdue ? 'TERLAMBAT' : l.status,
      `${l.conditionBefore || '-'} -> ${l.conditionAfter || '-'}`
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['No', 'Kode Pinjam', 'Peminjam', 'Barang / Aset', 'Qty', 'Tgl Pinjam', 'Target Kembali', 'Realisasi', 'Status', 'Kondisi']],
      body: tableData,
      styles: { fontSize: 8 }
    });

    doc.save("Laporan_Peminjaman.pdf");
  }
</script>

<svelte:head><title>Pusat Laporan & Analitik – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans">
  <!-- Page Header & Breadcrumb -->
  <div class="flex items-center justify-between pb-2 border-b border-gray-200">
    <div>
      <h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
        Pusat Laporan <span class="text-sm text-gray-500 font-light">Buku Induk Aset, Stok Konsumsi, Transaksi & Peminjaman</span>
      </h1>
    </div>
    <div class="text-xs text-gray-500 flex items-center gap-1">
      <a href="/inventory" class="hover:underline flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
        Home
      </a>
      <span>&gt;</span>
      <span class="text-gray-400">Laporan</span>
    </div>
  </div>

  <!-- Tabs Navigasi Laporan -->
  <div class="flex border-b border-gray-200 bg-white">
    <button 
      onclick={() => activeTab = 'assets'}
      class="px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 {activeTab === 'assets' ? 'border-[#3C8DBC] text-[#3C8DBC] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900'}">
      <span>1. Buku Induk Aset Tetap</span>
      <span class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">{data.assets.length}</span>
    </button>
    <button 
      onclick={() => activeTab = 'items'}
      class="px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 {activeTab === 'items' ? 'border-[#3C8DBC] text-[#3C8DBC] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900'}">
      <span>2. Stok Barang Konsumsi</span>
      <span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{data.items.length}</span>
    </button>
    <button 
      onclick={() => activeTab = 'transactions'}
      class="px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 {activeTab === 'transactions' ? 'border-[#3C8DBC] text-[#3C8DBC] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900'}">
      <span>3. Transaksi In / Out</span>
      <span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">{data.transactions.length}</span>
    </button>
    <button 
      onclick={() => activeTab = 'loans'}
      class="px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 {activeTab === 'loans' ? 'border-[#3C8DBC] text-[#3C8DBC] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900'}">
      <span>4. Peminjaman & Keterlambatan</span>
      <span class="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">{data.loans.length}</span>
    </button>
  </div>

  <!-- TAB 1: LAPORAN BUKU INDUK ASET TETAP -->
  {#if activeTab === 'assets'}
    <div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
      <div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button onclick={exportExcelAssets} class="bg-[#00A65A] hover:bg-[#008D4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Excel
          </button>
          <button onclick={exportPdfAssets} class="bg-[#DD4B39] hover:bg-[#C23321] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export PDF
          </button>
        </div>
        <div class="text-xs text-gray-600">
          Total Nilai Aset Terfilter: <span class="font-bold text-gray-900 font-mono">{formatRupiah(totalFilteredAssetValue)}</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-3 text-xs">
        <div>
          <label for="fCat" class="block font-semibold text-gray-600 mb-0.5">Kategori Aset:</label>
          <select id="fCat" bind:value={assetCategory} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
            <option value="">Semua Kategori</option>
            {#each data.categories as cat}
              <option value={cat.id.toString()}>{cat.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="fLoc" class="block font-semibold text-gray-600 mb-0.5">Lokasi / Ruangan:</label>
          <select id="fLoc" bind:value={assetLocation} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
            <option value="">Semua Lokasi</option>
            {#each data.locations as loc}
              <option value={loc.id.toString()}>{loc.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="fCond" class="block font-semibold text-gray-600 mb-0.5">Kondisi Fisik:</label>
          <select id="fCond" bind:value={assetCondition} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
            <option value="">Semua Kondisi</option>
            <option value="BAIK">Baik</option>
            <option value="RUSAK_RINGAN">Rusak Ringan</option>
            <option value="RUSAK_BERAT">Rusak Berat</option>
            <option value="HILANG">Hilang</option>
          </select>
        </div>
        {#if assetCategory || assetLocation || assetCondition}
          <div class="self-end pb-1">
            <button onclick={() => { assetCategory = ''; assetLocation = ''; assetCondition = ''; }} class="text-red-600 hover:underline font-semibold">
              Reset Filter
            </button>
          </div>
        {/if}
      </div>

      <!-- Table -->
      <div class="p-4 overflow-x-auto">
        <table class="w-full text-left border border-gray-200 text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-700 text-xs border-b border-gray-200">
              <th class="p-2.5 text-center w-10 font-bold border-r border-gray-200">NO</th>
              <th class="p-2.5 font-bold border-r border-gray-200">KODE ASET / SN</th>
              <th class="p-2.5 font-bold border-r border-gray-200">NAMA ASET</th>
              <th class="p-2.5 font-bold border-r border-gray-200">KATEGORI</th>
              <th class="p-2.5 font-bold border-r border-gray-200">LOKASI PENEMPATAN</th>
              <th class="p-2.5 font-bold border-r border-gray-200">PIC</th>
              <th class="p-2.5 text-right font-bold border-r border-gray-200">NILAI (RP)</th>
              <th class="p-2.5 text-center font-bold border-r border-gray-200">KONDISI</th>
              <th class="p-2.5 text-center font-bold">STATUS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each filteredAssets as a, idx}
              <tr class="hover:bg-gray-50 text-xs">
                <td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                <td class="p-2.5 font-mono border-r border-gray-100">
                  <span class="font-bold text-[#3C8DBC]">{a.assetCode}</span>
                  {#if a.serialNumber}<div class="text-gray-400 text-[10px]">SN: {a.serialNumber}</div>{/if}
                </td>
                <td class="p-2.5 font-semibold text-gray-900 border-r border-gray-100">{a.name}</td>
                <td class="p-2.5 text-gray-700 border-r border-gray-100">{a.category?.name || '-'}</td>
                <td class="p-2.5 font-medium text-gray-800 border-r border-gray-100">{a.location?.name || '-'}</td>
                <td class="p-2.5 text-gray-700 border-r border-gray-100">{a.pic || '-'}</td>
                <td class="p-2.5 text-right font-mono text-gray-800 border-r border-gray-100">{formatRupiah(a.price || 0)}</td>
                <td class="p-2.5 text-center border-r border-gray-100">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold {a.condition === 'BAIK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    {a.condition}
                  </span>
                </td>
                <td class="p-2.5 text-center">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold {a.status === 'TERSEDIA' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}">
                    {a.status}
                  </span>
                </td>
              </tr>
            {:else}
              <tr><td colspan="9" class="p-6 text-center text-gray-500">Tidak ada data aset yang cocok dengan filter.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  <!-- TAB 2: LAPORAN STOK KONSUMSI -->
  {:else if activeTab === 'items'}
    <div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
      <div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button onclick={exportExcelItems} class="bg-[#00A65A] hover:bg-[#008D4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Excel
          </button>
          <button onclick={exportPdfItems} class="bg-[#DD4B39] hover:bg-[#C23321] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export PDF
          </button>
        </div>
        <div class="text-xs text-gray-600">
          Total Nilai Stok: <span class="font-bold text-gray-900 font-mono">{formatRupiah(totalFilteredItemValue)}</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-3 text-xs">
        <div>
          <label for="iCat" class="block font-semibold text-gray-600 mb-0.5">Kategori:</label>
          <select id="iCat" bind:value={itemCategory} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
            <option value="">Semua Kategori</option>
            {#each data.categories as cat}
              <option value={cat.id.toString()}>{cat.name}</option>
            {/each}
          </select>
        </div>
        <div class="flex items-center gap-1.5 self-end pb-2">
          <input type="checkbox" id="stockAlert" bind:checked={itemStockOnly} />
          <label for="stockAlert" class="font-semibold text-red-600 cursor-pointer">Hanya Stok Kritis / Menipis</label>
        </div>
      </div>

      <!-- Table -->
      <div class="p-4 overflow-x-auto">
        <table class="w-full text-left border border-gray-200 text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-700 text-xs border-b border-gray-200">
              <th class="p-2.5 text-center w-10 font-bold border-r border-gray-200">NO</th>
              <th class="p-2.5 font-bold border-r border-gray-200">SKU</th>
              <th class="p-2.5 font-bold border-r border-gray-200">NAMA BARANG</th>
              <th class="p-2.5 font-bold border-r border-gray-200">KATEGORI</th>
              <th class="p-2.5 font-bold border-r border-gray-200">LOKASI</th>
              <th class="p-2.5 text-center font-bold border-r border-gray-200">SISA STOK</th>
              <th class="p-2.5 text-right font-bold border-r border-gray-200">HARGA SATUAN</th>
              <th class="p-2.5 text-right font-bold">TOTAL NILAI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each filteredItems as item, idx}
              <tr class="hover:bg-gray-50 text-xs {item.quantity <= item.minStock ? 'bg-red-50/50' : ''}">
                <td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                <td class="p-2.5 font-mono border-r border-gray-100 text-gray-600">{item.sku || '-'}</td>
                <td class="p-2.5 font-semibold text-gray-900 border-r border-gray-100">
                  {item.name}
                  {#if item.quantity <= item.minStock}
                    <span class="ml-1.5 px-1 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700">Kritis</span>
                  {/if}
                </td>
                <td class="p-2.5 text-gray-700 border-r border-gray-100">{item.category?.name || '-'}</td>
                <td class="p-2.5 text-gray-700 border-r border-gray-100">{item.location || '-'}</td>
                <td class="p-2.5 text-center border-r border-gray-100">
                  <span class="font-bold {item.quantity <= item.minStock ? 'text-red-700' : 'text-green-800'}">{item.quantity}</span>
                  <span class="text-gray-400 text-[10px] block">Min: {item.minStock}</span>
                </td>
                <td class="p-2.5 text-right font-mono text-gray-700 border-r border-gray-100">{formatRupiah(item.price)}</td>
                <td class="p-2.5 text-right font-mono font-bold text-gray-900">{formatRupiah(item.quantity * item.price)}</td>
              </tr>
            {:else}
              <tr><td colspan="8" class="p-6 text-center text-gray-500">Tidak ada data stok konsumsi.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  <!-- TAB 3: LAPORAN TRANSAKSI MASUK / KELUAR -->
  {:else if activeTab === 'transactions'}
    <div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
      <div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button onclick={exportExcelTransactions} class="bg-[#00A65A] hover:bg-[#008D4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Excel
          </button>
          <button onclick={exportPdfTransactions} class="bg-[#DD4B39] hover:bg-[#C23321] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export PDF
          </button>
        </div>
        <div class="text-xs text-gray-600">
          Total Transaksi Terfilter: <span class="font-bold text-gray-900">{filteredTransactions.length}</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-3 text-xs">
        <div>
          <label for="tJenis" class="block font-semibold text-gray-600 mb-0.5">Jenis Transaksi:</label>
          <select id="tJenis" bind:value={filterJenis} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
            <option value="Semua">Semua Transaksi</option>
            <option value="Barang Masuk">Barang Masuk (Penerimaan)</option>
            <option value="Barang Keluar">Barang Keluar (Pengeluaran)</option>
          </select>
        </div>
        <div>
          <label for="tMulai" class="block font-semibold text-gray-600 mb-0.5">Dari Tanggal:</label>
          <input id="tMulai" type="date" bind:value={filterMulai} class="border border-gray-300 px-2 py-1 text-xs rounded-sm bg-white" />
        </div>
        <div>
          <label for="tSampai" class="block font-semibold text-gray-600 mb-0.5">Sampai Tanggal:</label>
          <input id="tSampai" type="date" bind:value={filterSampai} class="border border-gray-300 px-2 py-1 text-xs rounded-sm bg-white" />
        </div>
        {#if filterMulai || filterSampai || filterJenis !== 'Semua'}
          <div class="self-end pb-1">
            <button onclick={() => { filterMulai = ''; filterSampai = ''; filterJenis = 'Semua'; }} class="text-red-600 hover:underline font-semibold">
              Reset Tanggal
            </button>
          </div>
        {/if}
      </div>

      <!-- Table -->
      <div class="p-4 overflow-x-auto">
        <table class="w-full text-left border border-gray-200 text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-700 text-xs border-b border-gray-200">
              <th class="p-2.5 text-center w-10 font-bold border-r border-gray-200">NO</th>
              <th class="p-2.5 font-bold border-r border-gray-200">TANGGAL</th>
              <th class="p-2.5 font-bold border-r border-gray-200">JENIS</th>
              <th class="p-2.5 font-bold border-r border-gray-200">NAMA BARANG</th>
              <th class="p-2.5 text-center font-bold border-r border-gray-200">JUMLAH</th>
              <th class="p-2.5 font-bold border-r border-gray-200">SUPPLIER / VENDOR</th>
              <th class="p-2.5 font-bold border-r border-gray-200">NO. DOKUMEN / REF</th>
              <th class="p-2.5 font-bold">PETUGAS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each filteredTransactions as t, idx}
              <tr class="hover:bg-gray-50 text-xs">
                <td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                <td class="p-2.5 text-gray-700 border-r border-gray-100">{formatDate(t.createdAt)}</td>
                <td class="p-2.5 font-bold border-r border-gray-100 {t.type === 'MASUK' ? 'text-green-700' : 'text-red-700'}">
                  {t.type}
                </td>
                <td class="p-2.5 font-semibold text-gray-900 border-r border-gray-100">{t.item?.name || '-'}</td>
                <td class="p-2.5 text-center font-bold border-r border-gray-100 {t.type === 'MASUK' ? 'text-green-700' : 'text-red-700'}">
                  {t.type === 'MASUK' ? '+' : '-'}{t.quantity}
                </td>
                <td class="p-2.5 text-gray-700 border-r border-gray-100">{t.supplier?.name || '-'}</td>
                <td class="p-2.5 font-mono text-gray-700 border-r border-gray-100">{t.reference || '-'}</td>
                <td class="p-2.5 text-gray-600">{t.user?.username || '-'}</td>
              </tr>
            {:else}
              <tr><td colspan="8" class="p-6 text-center text-gray-500">Tidak ada riwayat transaksi yang cocok.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  <!-- TAB 4: LAPORAN PEMINJAMAN & KETERLAMBATAN -->
  {:else}
    <div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
      <div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button onclick={exportExcelLoans} class="bg-[#00A65A] hover:bg-[#008D4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Excel
          </button>
          <button onclick={exportPdfLoans} class="bg-[#DD4B39] hover:bg-[#C23321] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export PDF
          </button>
        </div>
        <div class="text-xs text-gray-600">
          Total Peminjaman Terfilter: <span class="font-bold text-gray-900">{filteredLoans.length}</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-3 text-xs">
        <div>
          <label for="lStat" class="block font-semibold text-gray-600 mb-0.5">Status Peminjaman:</label>
          <select id="lStat" bind:value={loanStatusFilter} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white font-medium">
            <option value="Semua">Semua Status</option>
            <option value="DIPINJAM">Aktif Dipinjam</option>
            <option value="TERLAMBAT">Terlambat Pengembalian</option>
            <option value="DIKEMBALIKAN">Sudah Dikembalikan</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="p-4 overflow-x-auto">
        <table class="w-full text-left border border-gray-200 text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-700 text-xs border-b border-gray-200">
              <th class="p-2.5 text-center w-10 font-bold border-r border-gray-200">NO</th>
              <th class="p-2.5 font-bold border-r border-gray-200">KODE</th>
              <th class="p-2.5 font-bold border-r border-gray-200">PEMINJAM</th>
              <th class="p-2.5 font-bold border-r border-gray-200">BARANG / ASET</th>
              <th class="p-2.5 text-center font-bold border-r border-gray-200">QTY</th>
              <th class="p-2.5 font-bold border-r border-gray-200">TGL PINJAM</th>
              <th class="p-2.5 font-bold border-r border-gray-200">BATAS KEMBALI</th>
              <th class="p-2.5 text-center font-bold border-r border-gray-200">KONDISI PINJAM / BALIK</th>
              <th class="p-2.5 text-center font-bold">STATUS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each filteredLoans as l, idx}
              <tr class="hover:bg-gray-50 text-xs {l.isOverdue ? 'bg-red-50/60' : ''}">
                <td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                <td class="p-2.5 font-mono font-bold text-[#3C8DBC] border-r border-gray-100">{l.loanCode}</td>
                <td class="p-2.5 font-semibold text-gray-900 border-r border-gray-100">
                  {l.borrower?.name || l.borrowerName || '-'}
                  {#if l.borrower?.department}<span class="text-[10px] text-gray-500 block">{l.borrower.department}</span>{/if}
                </td>
                <td class="p-2.5 border-r border-gray-100 font-medium">
                  {#if l.asset}
                    <span class="text-purple-800 font-bold">[ASET]</span> {l.asset.name}
                  {:else if l.item}
                    <span class="text-blue-800 font-bold">[KONSUMSI]</span> {l.item.name}
                  {/if}
                </td>
                <td class="p-2.5 text-center font-bold border-r border-gray-100">{l.quantity}</td>
                <td class="p-2.5 text-gray-600 border-r border-gray-100">{formatDate(l.borrowDate)}</td>
                <td class="p-2.5 border-r border-gray-100 font-medium {l.isOverdue ? 'text-red-700 font-bold' : 'text-gray-700'}">
                  {formatDate(l.expectedReturnDate)}
                </td>
                <td class="p-2.5 text-center border-r border-gray-100">
                  <span class="text-gray-600">{l.conditionBefore || 'BAIK'}</span>
                  <span class="text-gray-400 mx-1">&rarr;</span>
                  <span class="font-bold {l.conditionAfter === 'BAIK' ? 'text-green-700' : (l.conditionAfter ? 'text-red-700' : 'text-gray-400')}">
                    {l.conditionAfter || '-'}
                  </span>
                </td>
                <td class="p-2.5 text-center">
                  {#if l.status === 'DIKEMBALIKAN'}
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">DIKEMBALIKAN</span>
                  {:else if l.isOverdue}
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse">TERLAMBAT</span>
                  {:else}
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">DIPINJAM</span>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr><td colspan="9" class="p-6 text-center text-gray-500">Tidak ada data peminjaman yang cocok.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>