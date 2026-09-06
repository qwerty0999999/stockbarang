<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';
  import { jsPDF } from 'jspdf';
  import autoTable from 'jspdf-autotable';
  import * as XLSX from 'xlsx';

  let { data } = $props();
  let opname = $derived(data.opname);
  let userRole = $derived(data.userRole);

  let items = $state<any[]>([]);
  $effect(() => {
    items = data.opname.items || [];
  });

  // Filter state
  let searchQuery = $state('');
  let filterVariance = $state<'ALL' | 'DIFF' | 'MATCH'>('ALL');

  let filteredItems = $derived(
    items.filter(item => {
      const matchSearch = 
        item.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.item.sku && item.item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.item.location && item.item.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchSearch) return false;
      if (filterVariance === 'DIFF') return item.variance !== 0;
      if (filterVariance === 'MATCH') return item.variance === 0;
      return true;
    })
  );

  // Stats
  let totalItems = $derived(items.length);
  let matchCount = $derived(items.filter(i => i.variance === 0).length);
  let surplusCount = $derived(items.filter(i => i.variance > 0).length);
  let deficitCount = $derived(items.filter(i => i.variance < 0).length);
  let totalDiffUnits = $derived(items.reduce((acc, i) => acc + Math.abs(i.variance), 0));

  // Scanner modal state
  let showScanner = $state(false);

  // Edit Physical Count Modal state
  let editModalOpen = $state(false);
  let activeItem = $state<any>(null);
  let physicalQtyInput = $state(0);
  let reasonInput = $state('');
  let notesInput = $state('');
  let savingItem = $state(false);

  // Adjust Approval Modal state
  let showAdjustModal = $state(false);
  let adjusting = $state(false);

  function openEditModal(opItem: any) {
    if (opname.status === 'ADJUSTED') return;
    activeItem = opItem;
    physicalQtyInput = opItem.physicalQty;
    reasonInput = opItem.reason || '';
    notesInput = opItem.notes || '';
    editModalOpen = true;
  }

  function handleScan(code: string) {
    const cleanCode = code.trim().toLowerCase();
    const found = items.find(
      i => (i.item.sku && i.item.sku.toLowerCase() === cleanCode) || i.item.name.toLowerCase().includes(cleanCode)
    );

    if (found) {
      showScanner = false;
      toast.success(`Ditemukan: ${found.item.name}`);
      openEditModal(found);
    } else {
      toast.error(`Barang dengan barcode/kode "${code}" tidak ditemukan dalam sesi ini.`);
    }
  }

  async function savePhysicalCount() {
    if (!activeItem) return;
    savingItem = true;

    try {
      const res = await fetch(`/api/stock-opname/${opname.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opnameItemId: activeItem.id,
          physicalQty: physicalQtyInput,
          reason: reasonInput,
          notes: notesInput
        })
      });

      if (res.ok) {
        toast.success(`Berhasil mencatat fisik ${activeItem.item.name}: ${physicalQtyInput}`);
        editModalOpen = false;
        await invalidateAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan hitung fisik');
      }
    } catch (e: any) {
      toast.error(e.message || 'Kesalahan jaringan');
    } finally {
      savingItem = false;
    }
  }

  async function completeSession() {
    if (!confirm('Tandai perhitungan fisik selesai (COMPLETED)? Status akan siap untuk ditinjau dan dieksekusi penyesuaian oleh manajer/admin.')) return;
    try {
      const res = await fetch(`/api/stock-opname/${opname.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      if (res.ok) {
        toast.success('Sesi Stock Opname telah ditandai SELESAI HITUNG!');
        await invalidateAll();
      } else {
        toast.error('Gagal memperbarui status');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function executeAdjustment() {
    adjusting = true;
    try {
      const res = await fetch(`/api/stock-opname/${opname.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const resData = await res.json();
      if (res.ok) {
        toast.success(resData.message || 'Penyesuaian stok berhasil dieksekusi!');
        showAdjustModal = false;
        await invalidateAll();
      } else {
        toast.error(resData.error || 'Gagal mengeksekusi penyesuaian');
      }
    } catch (e: any) {
      toast.error(e.message || 'Kesalahan server');
    } finally {
      adjusting = false;
    }
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('BERITA ACARA & LAPORAN HASIL STOCK OPNAME', 14, 15);
    doc.setFontSize(9);
    doc.text(`Kode Sesi: ${opname.opnameCode}`, 14, 22);
    doc.text(`Judul: ${opname.title}`, 14, 27);
    doc.text(`Tanggal Audit: ${new Date(opname.date).toLocaleDateString('id-ID')}`, 14, 32);
    doc.text(`Auditor: ${opname.auditor?.username || '-'}`, 130, 22);
    doc.text(`Status: ${opname.status}`, 130, 27);

    const tableData = items.map((i, idx) => [
      idx + 1,
      i.item.sku || '-',
      i.item.name,
      i.item.location || '-',
      i.systemQty,
      i.physicalQty,
      i.variance > 0 ? `+${i.variance}` : i.variance,
      i.reason || '-'
    ]);

    autoTable(doc, {
      head: [['No', 'SKU', 'Nama Barang', 'Lokasi', 'Sistem', 'Fisik', 'Selisih', 'Keterangan / Alasan']],
      body: tableData,
      startY: 38,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 141, 188] }
    });

    doc.save(`Stock_Opname_${opname.opnameCode}.pdf`);
  }

  function exportExcel() {
    const rows = items.map((i, idx) => ({
      'No': idx + 1,
      'SKU': i.item.sku || '-',
      'Nama Barang': i.item.name,
      'Lokasi': i.item.location || '-',
      'Kategori': i.item.category?.name || '-',
      'Stok Sistem': i.systemQty,
      'Hitung Fisik': i.physicalQty,
      'Selisih (Variance)': i.variance,
      'Alasan / Catatan': i.reason || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Opname');
    XLSX.writeFile(wb, `Stock_Opname_${opname.opnameCode}.xlsx`);
  }
</script>

<svelte:head>
  <title>Audit Sesi {opname.opnameCode} – StockBarang</title>
</svelte:head>

<div class="space-y-4">
  <!-- Top Navigation & Title -->
  <div class="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-gray-200 gap-3">
    <div>
      <div class="flex items-center gap-2 mb-1 text-xs text-gray-500">
        <a href="/inventory/stock-opname" class="hover:underline flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Daftar Sesi
        </a>
        <span>/</span>
        <span class="font-mono font-semibold text-blue-600">{opname.opnameCode}</span>
      </div>
      <h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
        {opname.title}
        <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold {opname.status === 'ADJUSTED' ? 'bg-emerald-100 text-emerald-800' : opname.status === 'COMPLETED' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}">
          {opname.status}
        </span>
      </h1>
      <p class="text-xs text-gray-500 mt-0.5">
        Auditor: <strong>{opname.auditor?.username}</strong> • Tanggal: {new Date(opname.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
        {#if opname.approvedBy}
          • Diverifikasi oleh: <strong>{opname.approvedBy.username}</strong>
        {/if}
      </p>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onclick={() => showScanner = true}
        disabled={opname.status === 'ADJUSTED'}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded shadow-sm transition disabled:opacity-40"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
        Scan Barcode Rak
      </button>

      {#if opname.status === 'IN_PROGRESS'}
        <button
          type="button"
          onclick={completeSession}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          Selesaikan Hitung Fisik
        </button>
      {/if}

      {#if (userRole === 'admin' || userRole === 'dev') && opname.status !== 'ADJUSTED'}
        <button
          type="button"
          onclick={() => showAdjustModal = true}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Verifikasi & Eksekusi Penyesuaian
        </button>
      {/if}

      <div class="flex items-center gap-1 border-l pl-2 border-gray-300">
        <button
          type="button"
          onclick={exportPDF}
          class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded transition"
          title="Download PDF"
        >
          PDF
        </button>
        <button
          type="button"
          onclick={exportExcel}
          class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded transition"
          title="Download Excel"
        >
          Excel
        </button>
      </div>
    </div>
  </div>

  <!-- Variance Summary Cards -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
    <div class="bg-white border border-gray-200 rounded p-3 shadow-sm">
      <span class="text-[11px] uppercase font-bold text-gray-400">Total Item</span>
      <p class="text-xl font-bold text-gray-800 mt-0.5">{totalItems}</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3 shadow-sm">
      <span class="text-[11px] uppercase font-bold text-emerald-600">Sesuai Fisik (Cocok)</span>
      <p class="text-xl font-bold text-emerald-700 mt-0.5">{matchCount}</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3 shadow-sm">
      <span class="text-[11px] uppercase font-bold text-blue-600">Fisik Lebih (+)</span>
      <p class="text-xl font-bold text-blue-700 mt-0.5">{surplusCount}</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3 shadow-sm">
      <span class="text-[11px] uppercase font-bold text-rose-600">Fisik Kurang (-)</span>
      <p class="text-xl font-bold text-rose-700 mt-0.5">{deficitCount}</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3 shadow-sm col-span-2 md:col-span-1">
      <span class="text-[11px] uppercase font-bold text-purple-600">Total Selisih Unit</span>
      <p class="text-xl font-bold text-purple-700 mt-0.5">{totalDiffUnits}</p>
    </div>
  </div>

  <!-- Filter & Search Inside Session -->
  <div class="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-wrap gap-2 items-center justify-between">
    <div class="flex items-center gap-2 flex-1 max-w-sm">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari barang di sesi ini..."
        class="w-full text-xs px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
      />
    </div>

    <div class="flex items-center gap-1.5 text-xs">
      <button
        type="button"
        onclick={() => filterVariance = 'ALL'}
        class="px-2.5 py-1 rounded font-medium transition {filterVariance === 'ALL' ? 'bg-[#3c8dbc] text-white' : 'bg-gray-100 text-gray-700'}"
      >
        Semua ({items.length})
      </button>
      <button
        type="button"
        onclick={() => filterVariance = 'DIFF'}
        class="px-2.5 py-1 rounded font-medium transition {filterVariance === 'DIFF' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}"
      >
        Berselisih Saja ({surplusCount + deficitCount})
      </button>
      <button
        type="button"
        onclick={() => filterVariance = 'MATCH'}
        class="px-2.5 py-1 rounded font-medium transition {filterVariance === 'MATCH' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}"
      >
        Sesuai ({matchCount})
      </button>
    </div>
  </div>

  <!-- Audit Items Table -->
  <div class="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider">
          <tr>
            <th class="px-3 py-3 text-center w-10">No</th>
            <th class="px-3 py-3">SKU / Barcode</th>
            <th class="px-3 py-3">Nama Barang</th>
            <th class="px-3 py-3">Lokasi Rak</th>
            <th class="px-3 py-3 text-center">Stok Sistem</th>
            <th class="px-3 py-3 text-center">Hitung Fisik</th>
            <th class="px-3 py-3 text-center">Selisih</th>
            <th class="px-3 py-3">Alasan / Catatan</th>
            <th class="px-3 py-3 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#if filteredItems.length === 0}
            <tr>
              <td colspan="9" class="px-4 py-8 text-center text-gray-400">
                Tidak ada barang yang cocok dengan filter pencarian.
              </td>
            </tr>
          {:else}
            {#each filteredItems as it, idx}
              <tr class="hover:bg-slate-50 transition {it.variance !== 0 ? 'bg-amber-50/20' : ''}">
                <td class="px-3 py-2.5 text-center text-gray-400">{idx + 1}</td>
                <td class="px-3 py-2.5 font-mono text-gray-700">{it.item.sku || '-'}</td>
                <td class="px-3 py-2.5">
                  <span class="font-semibold text-gray-800">{it.item.name}</span>
                  <span class="block text-[11px] text-gray-400">{it.item.category?.name || '-'}</span>
                </td>
                <td class="px-3 py-2.5 text-gray-600">{it.item.location || '-'}</td>
                <td class="px-3 py-2.5 text-center font-semibold text-gray-700 bg-gray-50/80">{it.systemQty}</td>
                <td class="px-3 py-2.5 text-center font-bold text-gray-900 bg-blue-50/50">
                  {it.physicalQty}
                </td>
                <td class="px-3 py-2.5 text-center">
                  {#if it.variance > 0}
                    <span class="inline-block px-2 py-0.5 rounded font-bold text-blue-700 bg-blue-100">
                      +{it.variance}
                    </span>
                  {:else if it.variance < 0}
                    <span class="inline-block px-2 py-0.5 rounded font-bold text-rose-700 bg-rose-100">
                      {it.variance}
                    </span>
                  {:else}
                    <span class="inline-block px-2 py-0.5 rounded font-medium text-emerald-700 bg-emerald-100">
                      0 Cocok
                    </span>
                  {/if}
                </td>
                <td class="px-3 py-2.5 text-gray-600">
                  {#if it.reason}
                    <span class="font-medium text-gray-800">{it.reason}</span>
                    {#if it.notes}<span class="text-gray-400 block text-[11px]">{it.notes}</span>{/if}
                  {:else}
                    <span class="text-gray-400 italic text-[11px]">-</span>
                  {/if}
                </td>
                <td class="px-3 py-2.5 text-center">
                  <button
                    type="button"
                    onclick={() => openEditModal(it)}
                    disabled={opname.status === 'ADJUSTED'}
                    class="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded font-medium transition disabled:opacity-30"
                  >
                    Input Fisik
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Scanner Modal -->
{#if showScanner}
  <BarcodeScanner
    isModal={true}
    title="Pindai Barcode Barang Rak"
    onScan={handleScan}
    onClose={() => showScanner = false}
  />
{/if}

<!-- Edit Physical Count Modal -->
{#if editModalOpen && activeItem}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-sm bg-white rounded-lg p-5 shadow-xl animate-in fade-in zoom-in duration-150">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <div>
          <h3 class="font-bold text-gray-800 text-sm">Input Hitung Fisik</h3>
          <p class="text-xs text-gray-500">{activeItem.item.name}</p>
        </div>
        <button type="button" onclick={() => editModalOpen = false} class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="space-y-3 text-xs">
        <div class="flex justify-between items-center p-2.5 bg-gray-50 rounded border border-gray-200">
          <div>
            <span class="text-gray-500 block">Stok Sistem Saat Ini:</span>
            <span class="font-bold text-sm text-gray-800">{activeItem.systemQty} unit</span>
          </div>
          <div class="text-right">
            <span class="text-gray-500 block">Lokasi Rak:</span>
            <span class="font-medium text-gray-800">{activeItem.item.location || '-'}</span>
          </div>
        </div>

        <div>
          <label for="so-phys-qty" class="block font-semibold text-gray-700 mb-1">Jumlah Fisik di Rak *</label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={() => { if (physicalQtyInput > 0) physicalQtyInput--; }}
              class="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-base font-bold text-gray-700"
            >
              -
            </button>
            <input
              id="so-phys-qty"
              type="number"
              min="0"
              bind:value={physicalQtyInput}
              class="flex-1 text-center py-2 border border-gray-300 rounded text-base font-bold text-blue-700 focus:ring-1 focus:ring-[#3c8dbc]"
            />
            <button
              type="button"
              onclick={() => physicalQtyInput++}
              class="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-base font-bold text-gray-700"
            >
              +
            </button>
          </div>
        </div>

        <!-- Live Variance Indicator -->
        <div class="p-2 rounded text-center font-semibold {physicalQtyInput - activeItem.systemQty === 0 ? 'bg-emerald-50 text-emerald-700' : physicalQtyInput - activeItem.systemQty > 0 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}">
          Selisih: {physicalQtyInput - activeItem.systemQty > 0 ? `+${physicalQtyInput - activeItem.systemQty} (Lebih)` : physicalQtyInput - activeItem.systemQty < 0 ? `${physicalQtyInput - activeItem.systemQty} (Kurang)` : '0 (Sesuai)'}
        </div>

        {#if physicalQtyInput - activeItem.systemQty !== 0}
          <div>
            <label for="so-reason" class="block font-semibold text-gray-700 mb-1">Alasan Selisih *</label>
            <select
              id="so-reason"
              bind:value={reasonInput}
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            >
              <option value="">Pilih Alasan...</option>
              <option value="Rusak Belum Tercatat">Barang rusak fisik belum dibuang/afkir</option>
              <option value="Hilang / Selisih Tak Diketahui">Hilang / Tak ditemukan di rak</option>
              <option value="Salah Hitung Transaksi">Kesalahan input transaksi sebelumnya</option>
              <option value="Tertukar Item Lain">Tertukar dengan varian/SKU lain</option>
              <option value="Pengembalian Belum Masuk Sistem">Pengembalian fisik belum diinput</option>
              <option value="Lainnya">Alasan Lainnya (tulis di catatan)</option>
            </select>
          </div>
        {/if}

        <div>
          <label for="so-notes-item" class="block font-semibold text-gray-700 mb-1">Catatan Tambahan</label>
          <input
            id="so-notes-item"
            type="text"
            bind:value={notesInput}
            placeholder="Kondisi kotak, nomor rak, dll..."
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          />
        </div>

        <div class="pt-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onclick={() => editModalOpen = false}
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition"
          >
            Batal
          </button>
          <button
            type="button"
            onclick={savePhysicalCount}
            disabled={savingItem}
            class="px-4 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-semibold rounded shadow-sm transition disabled:opacity-50"
          >
            {savingItem ? 'Menyimpan...' : 'Simpan Hitungan'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Adjust Execution Approval Modal -->
{#if showAdjustModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-md bg-white rounded-lg p-5 shadow-xl animate-in fade-in zoom-in duration-150">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <h3 class="font-bold text-gray-800 text-sm flex items-center gap-2">
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Konfirmasi Penyesuaian Stok (Adjustment Approval)
        </h3>
        <button type="button" onclick={() => showAdjustModal = false} class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="space-y-3 text-xs text-gray-700">
        <p>Anda akan menyetujui dan mengeksekusi penyesuaian stok secara permanen ke inventaris:</p>
        
        <div class="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5">
          <div class="flex justify-between">
            <span class="text-gray-500">Jumlah Barang Berselisih:</span>
            <span class="font-bold text-rose-600">{surplusCount + deficitCount} barang</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Total Selisih Unit:</span>
            <span class="font-bold text-gray-800">{totalDiffUnits} unit</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Aksi Otomatis Sistem:</span>
            <span class="font-medium text-emerald-700">Menerbitkan Transaksi ADJUSTMENT</span>
          </div>
        </div>

        <p class="text-rose-600 text-[11px] font-medium">
          * Catatan: Saldo stok di gudang akan langsung disesuaikan dengan kuantitas fisik dan tidak dapat dibatalkan.
        </p>

        <div class="pt-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onclick={() => showAdjustModal = false}
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition"
          >
            Batal
          </button>
          <button
            type="button"
            onclick={executeAdjustment}
            disabled={adjusting}
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm transition disabled:opacity-50"
          >
            {adjusting ? 'Memproses Penyesuaian...' : 'Setujui & Eksekusi Sekarang'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
