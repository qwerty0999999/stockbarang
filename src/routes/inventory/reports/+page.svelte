<script lang="ts">
  import { jsPDF } from 'jspdf';
  import autoTable from 'jspdf-autotable';
  import * as XLSX from 'xlsx';

  let { data } = $props();
  let activeTab = $state('items');

  function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  }

  function formatDate(d: string | Date | null) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Filter State untuk Transaksi/Laporan
  let filterMulai = $state('');
  let filterSampai = $state('');
  let filterJenis = $state('Semua');

  // Mengambil data terfilter (Hanya memfilter di sisi client dari data.transactions)
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

  // --- EXPORT EXCEL STOK ---
  function exportExcelItems() {
    const wsData = [
      ['No', 'SKU', 'Nama Barang', 'Stok', 'Harga Satuan', 'Total Nilai'],
      ...data.items.map((i: any, index: number) => [
        index + 1,
        i.sku || '-',
        i.name,
        i.quantity,
        i.price,
        i.quantity * i.price
      ])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Stok Barang");
    XLSX.writeFile(wb, "Laporan_Stok_Barang.xlsx");
  }

  // --- EXPORT PDF STOK ---
  function exportPdfItems() {
    const doc = new jsPDF();
    doc.text("Laporan Stok Barang", 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak tanggal: ${formatDate(new Date())}`, 14, 22);

    const tableData = data.items.map((i: any, index: number) => [
      index + 1,
      i.sku || '-',
      i.name,
      i.quantity.toString(),
      formatRupiah(i.price),
      formatRupiah(i.quantity * i.price)
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['No', 'SKU', 'Nama Barang', 'Stok', 'Harga Satuan', 'Total Nilai']],
      body: tableData,
    });

    doc.save("Laporan_Stok_Barang.pdf");
  }

  // --- PRINT STOK ---
  function printItems() {
    const win = window.open('', '_blank');
    if(!win) return;
    let tableRows = '';
    data.items.forEach((i: any, idx: number) => {
      tableRows += `<tr>
        <td style="border:1px solid #ddd; padding:8px; text-align:center;">${idx+1}</td>
        <td style="border:1px solid #ddd; padding:8px;">${i.sku || '-'}</td>
        <td style="border:1px solid #ddd; padding:8px; font-weight:bold;">${i.name}</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:center;">${i.quantity}</td>
        <td style="border:1px solid #ddd; padding:8px;">${formatRupiah(i.price)}</td>
      </tr>`;
    });
    win.document.write(`
      <html>
        <head><title>Print Stok Barang</title></head>
        <body style="font-family:sans-serif; padding:20px;">
          <h2>LAPORAN STOK BARANG</h2>
          <p>Tanggal Cetak: ${formatDate(new Date())}</p>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#f2f2f2; text-align:left;">
                <th style="border:1px solid #ddd; padding:8px;">NO</th>
                <th style="border:1px solid #ddd; padding:8px;">SKU</th>
                <th style="border:1px solid #ddd; padding:8px;">NAMA BARANG</th>
                <th style="border:1px solid #ddd; padding:8px;">STOK</th>
                <th style="border:1px solid #ddd; padding:8px;">HARGA</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload=()=>{window.print();window.close()}<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  // --- EXPORT PDF TRANSAKSI ---
  function exportPdfTransactions() {
    const doc = new jsPDF();
    doc.text("Laporan Transaksi", 14, 15);
    doc.setFontSize(10);
    
    let infoY = 22;
    if(filterMulai && filterSampai) {
      doc.text(`Periode: ${formatDate(filterMulai)} s/d ${formatDate(filterSampai)}`, 14, infoY);
      infoY += 6;
    }
    doc.text(`Jenis Laporan: ${filterJenis}`, 14, infoY);
    infoY += 6;
    doc.text(`Dicetak tanggal: ${formatDate(new Date())}`, 14, infoY);

    const tableData = filteredTransactions.map((t: any, index: number) => [
      index + 1,
      t.item.name,
      formatDate(t.createdAt),
      t.quantity.toString(),
      t.supplier?.name || t.reference || '-'
    ]);

    autoTable(doc, {
      startY: infoY + 5,
      head: [['NO', 'NAMA BARANG', 'TANGGAL TRANSAKSI', 'JUMLAH', 'SUPLIER / REFERENSI']],
      body: tableData,
    });

    doc.save(`Laporan_Transaksi_${filterJenis.replace(' ','_')}.pdf`);
  }

  // --- PRINT TRANSAKSI ---
  function printTransactions() {
    const win = window.open('', '_blank');
    if(!win) return;
    let tableRows = '';
    filteredTransactions.forEach((t: any, idx: number) => {
      tableRows += `<tr>
        <td style="border:1px solid #ddd; padding:8px; text-align:center;">${idx+1}</td>
        <td style="border:1px solid #ddd; padding:8px; font-weight:bold;">${t.item.name}</td>
        <td style="border:1px solid #ddd; padding:8px;">${formatDate(t.createdAt)}</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:center;">${t.quantity}</td>
        <td style="border:1px solid #ddd; padding:8px;">${t.supplier?.name || t.reference || '-'}</td>
      </tr>`;
    });
    win.document.write(`
      <html>
        <head><title>Print Laporan Transaksi</title></head>
        <body style="font-family:sans-serif; padding:20px;">
          <h2>LAPORAN DATA TRANSAKSI</h2>
          <p>Periode: ${filterMulai ? formatDate(filterMulai) : '-'} s/d ${filterSampai ? formatDate(filterSampai) : '-'}<br/>
          Jenis Laporan: ${filterJenis}</p>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#f2f2f2; text-align:left;">
                <th style="border:1px solid #ddd; padding:8px;">NO</th>
                <th style="border:1px solid #ddd; padding:8px;">NAMA BARANG</th>
                <th style="border:1px solid #ddd; padding:8px;">TANGGAL TRANSAKSI</th>
                <th style="border:1px solid #ddd; padding:8px;">JUMLAH</th>
                <th style="border:1px solid #ddd; padding:8px;">SUPLIER / REFERENSI</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload=()=>{window.print();window.close()}<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

</script>

<svelte:head><title>Laporan – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans text-gray-800">
  <div class="flex items-center justify-between pb-2 border-b border-gray-200">
    <h1 class="text-2xl font-normal flex items-center gap-2">
      LAPORAN <span class="text-sm text-gray-500 font-light">Data Laporan</span>
    </h1>
    <div class="text-xs text-gray-500 flex items-center gap-1">
      <a href="/inventory" class="hover:underline flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
        Home
      </a>
      <span>&gt;</span>
      <span class="text-gray-400">Dashboard</span>
    </div>
  </div>

  <div class="flex gap-4 border-b border-[#3C8DBC]">
    <button onclick={() => activeTab = 'transactions'} class="px-4 py-2 text-sm font-bold {activeTab === 'transactions' ? 'bg-[#3C8DBC] text-white' : 'bg-gray-200 hover:bg-gray-300'} transition-colors rounded-t-sm">
      Laporan Transaksi
    </button>
    <button onclick={() => activeTab = 'items'} class="px-4 py-2 text-sm font-bold {activeTab === 'items' ? 'bg-[#3C8DBC] text-white' : 'bg-gray-200 hover:bg-gray-300'} transition-colors rounded-t-sm">
      Laporan Stok Barang
    </button>
  </div>

  {#if activeTab === 'transactions'}
    <div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
	{#if loading}
		<div class="p-4 space-y-4">
			<div class="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
			<div class="grid grid-cols-2 gap-4">
				<div class="h-32 bg-gray-100 rounded animate-pulse"></div>
				<div class="h-32 bg-gray-100 rounded animate-pulse"></div>
			</div>
			<div class="h-64 bg-gray-100 rounded animate-pulse"></div>
		</div>
	{:else}
      <div class="px-4 py-3 border-b border-gray-100"><h3 class="font-normal text-base">Filter Laporan</h3></div>
      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-bold mb-1" for="filterMulai">Mulai Tanggal</label>
          <input id="filterMulai" type="date" bind:value={filterMulai} class="w-full max-w-sm border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
        </div>
        <div>
          <label class="block text-sm font-bold mb-1" for="filterSampai">Sampai Tanggal</label>
          <input id="filterSampai" type="date" bind:value={filterSampai} class="w-full max-w-sm border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
        </div>
        <div>
          <label class="block text-sm font-bold mb-1" for="filterJenis">Laporan</label>
          <select id="filterJenis" bind:value={filterJenis} class="w-full max-w-sm border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm">
            <option value="Semua">Semua Transaksi</option>
            <option value="Barang Masuk">Barang Masuk</option>
            <option value="Barang Keluar">Barang Keluar</option>
          </select>
        </div>
        <button class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-4 py-2 text-xs font-semibold rounded-sm shadow-sm transition-colors">TAMPILKAN</button>
      </div>
    </div>

    <div class="bg-white shadow rounded-none border-t-4 border-[#00C0EF] mt-6">
      <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <h3 class="font-normal text-base">Laporan</h3>
      </div>
      <div class="p-4">
        <table class="w-full max-w-lg text-sm mb-4 border border-gray-100">
          <tbody>
            <tr class="border-b border-gray-100"><td class="font-bold py-2 px-3 w-40">DARI TANGGAL</td><td class="py-2 px-3">: {filterMulai ? formatDate(filterMulai) : '-'}</td></tr>
            <tr class="border-b border-gray-100"><td class="font-bold py-2 px-3">SAMPAI TANGGAL</td><td class="py-2 px-3">: {filterSampai ? formatDate(filterSampai) : '-'}</td></tr>
            <tr><td class="font-bold py-2 px-3">JENIS</td><td class="py-2 px-3">: {filterJenis}</td></tr>
          </tbody>
        </table>

        <div class="flex gap-2 mb-4">
          <button onclick={exportPdfTransactions} class="bg-[#5CB85C] hover:bg-[#4CAE4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> CETAK PDF
          </button>
          <button onclick={printTransactions} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg> PRINT
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left border border-gray-200">
            <thead class="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-xs">
              <tr>
                <th class="p-3 border-r border-gray-200 w-12 text-center">NO</th>
                <th class="p-3 border-r border-gray-200">NAMA BARANG</th>
                <th class="p-3 border-r border-gray-200">TANGGAL TRANSAKSI</th>
                <th class="p-3 border-r border-gray-200 text-center">JUMLAH</th>
                <th class="p-3 border-r border-gray-200">SUPLIER / REFERENSI</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each filteredTransactions as t, index}
                <tr class="hover:bg-gray-50">
                  <td class="p-3 border-r border-gray-200 text-center">{index + 1}</td>
                  <td class="p-3 border-r border-gray-200 font-semibold">{t.item.name}</td>
                  <td class="p-3 border-r border-gray-200">{formatDate(t.createdAt)}</td>
                  <td class="p-3 border-r border-gray-200 text-center">{t.quantity}</td>
                  <td class="p-3 border-r border-gray-200">{t.supplier?.name || t.reference || '-'}</td>
                </tr>
              {:else}
                <tr><td colspan="5" class="p-6 text-center text-gray-500">Data Laporan Kosong</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}

  {#if activeTab === 'items'}
    <div class="bg-white shadow rounded-none border-t-4 border-[#00C0EF]">
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-normal text-base">Laporan Stok Barang Saat Ini</h3>
        <div class="flex gap-2">
          <button onclick={exportExcelItems} class="bg-[#217346] hover:bg-[#1a5c38] text-white px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1">
            EKSPOR EXCEL
          </button>
          <button onclick={exportPdfItems} class="bg-[#5CB85C] hover:bg-[#4CAE4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1">
            CETAK PDF
          </button>
          <button onclick={printItems} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1">
            PRINT
          </button>
        </div>
      </div>
      <div class="p-4">
        <table class="w-full text-sm text-left border border-gray-200">
          <thead class="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-xs">
            <tr>
              <th class="p-3 border-r border-gray-200 w-12 text-center">NO</th>
              <th class="p-3 border-r border-gray-200">SKU</th>
              <th class="p-3 border-r border-gray-200">NAMA BARANG</th>
              <th class="p-3 border-r border-gray-200 text-center">STOK</th>
              <th class="p-3 border-r border-gray-200">HARGA</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each data.items as item, index}
              <tr class="hover:bg-gray-50">
                <td class="p-3 border-r border-gray-200 text-center">{index + 1}</td>
                <td class="p-3 border-r border-gray-200">{item.sku || '-'}</td>
                <td class="p-3 border-r border-gray-200 font-semibold">{item.name}</td>
                <td class="p-3 border-r border-gray-200 text-center font-bold">{item.quantity}</td>
                <td class="p-3 border-r border-gray-200">{formatRupiah(item.price)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>