<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';
  import { formatRupiah } from '$lib/depreciation';

  let { data } = $props();
  let maintenances = $derived(data.maintenances);
  let assets = $derived(data.assets || []);
  let totalCost = $derived(data.totalCost || 0);
  let pagination = $derived(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });

  // Filters
  let search = $state('');
  let statusFilter = $state('');
  let typeFilter = $state('');

  $effect(() => {
    search = data.filters.search || '';
    statusFilter = data.filters.status || '';
    typeFilter = data.filters.type || '';
  });

  let filterTimeout: any;
  function applyFilters() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      const url = new URL($page.url);
      if (search) url.searchParams.set('search', search); else url.searchParams.delete('search');
      if (statusFilter) url.searchParams.set('status', statusFilter); else url.searchParams.delete('status');
      if (typeFilter) url.searchParams.set('type', typeFilter); else url.searchParams.delete('type');
      url.searchParams.set('page', '1');
      goto(url.toString(), { keepFocus: true, noScroll: true });
    }, 300);
  }

  function resetFilters() {
    search = '';
    statusFilter = '';
    typeFilter = '';
    goto('/inventory/maintenance');
  }

  // Modal State Tambah Servis
  let showModal = $state(false);
  let loading = $state(false);
  let form = $state({
    assetId: '',
    maintenanceDate: new Date().toISOString().split('T')[0],
    type: 'RUTIN',
    status: 'IN_PROGRESS',
    cost: 0,
    vendor: '',
    technician: '',
    invoiceNumber: '',
    description: '',
    setAssetUnderMaintenance: true
  });

  // Modal Selesaikan Servis
  let completeModalOpen = $state(false);
  let activeMaintenance = $state<any>(null);
  let completeForm = $state({
    cost: 0,
    invoiceNumber: '',
    resultNotes: '',
    completionDate: new Date().toISOString().split('T')[0]
  });

  function openAdd() {
    form = {
      assetId: '',
      maintenanceDate: new Date().toISOString().split('T')[0],
      type: 'RUTIN',
      status: 'IN_PROGRESS',
      cost: 0,
      vendor: '',
      technician: '',
      invoiceNumber: '',
      description: '',
      setAssetUnderMaintenance: true
    };
    showModal = true;
  }

  function openComplete(m: any) {
    activeMaintenance = m;
    completeForm = {
      cost: m.cost || 0,
      invoiceNumber: m.invoiceNumber || '',
      resultNotes: m.resultNotes || '',
      completionDate: new Date().toISOString().split('T')[0]
    };
    completeModalOpen = true;
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    loading = true;
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success('Log pemeliharaan berhasil dicatat!');
        showModal = false;
        await invalidateAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan data');
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem');
    } finally {
      loading = false;
    }
  }

  async function handleCompleteSubmit(e: Event) {
    e.preventDefault();
    if (!activeMaintenance) return;
    loading = true;

    try {
      const res = await fetch(`/api/maintenance/${activeMaintenance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          cost: completeForm.cost,
          invoiceNumber: completeForm.invoiceNumber,
          resultNotes: completeForm.resultNotes,
          completionDate: completeForm.completionDate
        })
      });

      if (res.ok) {
        toast.success('Servis ditandai selesai! Status aset kembali TERSEDIA.');
        completeModalOpen = false;
        await invalidateAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyelesaikan servis');
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem');
    } finally {
      loading = false;
    }
  }

  async function handleDelete(m: any) {
    if (!confirm(`Hapus catatan servis ${m.maintenanceCode}?`)) return;
    try {
      const res = await fetch(`/api/maintenance/${m.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Catatan servis berhasil dihapus');
        await invalidateAll();
      } else {
        toast.error('Gagal menghapus catatan servis');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function formatDate(d: string | Date | null) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<svelte:head>
  <title>Pemeliharaan & Servis Aset – InventarisApp</title>
</svelte:head>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
    <div>
      <h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
        Pemeliharaan Aset <span class="text-sm text-gray-500 font-light">Service & Maintenance Log</span>
      </h1>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={openAdd}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white text-sm font-semibold rounded shadow-sm transition"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Jadwalkan / Catat Servis
      </button>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div class="bg-white border border-gray-200 rounded p-3.5 shadow-sm">
      <span class="text-xs text-gray-500 uppercase font-semibold">Total Riwayat Servis</span>
      <p class="text-xl font-bold text-gray-800 mt-1">{pagination.total}</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3.5 shadow-sm">
      <span class="text-xs text-amber-600 uppercase font-semibold">Sedang Dikerjakan</span>
      <p class="text-xl font-bold text-amber-600 mt-1">
        {maintenances.filter(m => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED').length}
      </p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3.5 shadow-sm">
      <span class="text-xs text-emerald-600 uppercase font-semibold">Selesai Diperbaiki</span>
      <p class="text-xl font-bold text-emerald-600 mt-1">
        {maintenances.filter(m => m.status === 'COMPLETED').length}
      </p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3.5 shadow-sm">
      <span class="text-xs text-purple-600 uppercase font-semibold">Total Biaya Servis</span>
      <p class="text-xl font-bold text-purple-700 mt-1">{formatRupiah(totalCost)}</p>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-wrap gap-2.5 items-center justify-between">
    <div class="flex flex-wrap gap-2 items-center flex-1">
      <div class="relative min-w-[240px] flex-1 max-w-sm">
        <input
          type="text"
          placeholder="Cari kode servis, nama aset, atau vendor..."
          bind:value={search}
          oninput={applyFilters}
          class="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
        />
        <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>

      <select
        bind:value={statusFilter}
        onchange={applyFilters}
        class="text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
      >
        <option value="">Semua Status</option>
        <option value="IN_PROGRESS">Sedang Dikerjakan (IN_PROGRESS)</option>
        <option value="SCHEDULED">Terjadwal (SCHEDULED)</option>
        <option value="COMPLETED">Selesai (COMPLETED)</option>
        <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
      </select>

      <select
        bind:value={typeFilter}
        onchange={applyFilters}
        class="text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
      >
        <option value="">Semua Tipe</option>
        <option value="RUTIN">Servis Rutin</option>
        <option value="PERBAIKAN">Perbaikan Kerusakan</option>
        <option value="INSPEKSI">Inspeksi & Kalibrasi</option>
      </select>

      {#if search || statusFilter || typeFilter}
        <button
          type="button"
          onclick={resetFilters}
          class="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
        >
          Reset
        </button>
      {/if}
    </div>
  </div>

  <!-- Table -->
  <div class="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider">
          <tr>
            <th class="px-4 py-3">Kode Servis</th>
            <th class="px-4 py-3">Aset Tetap</th>
            <th class="px-4 py-3">Jenis & Vendor</th>
            <th class="px-4 py-3">Tanggal Servis</th>
            <th class="px-4 py-3">Biaya Perbaikan</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#if maintenances.length === 0}
            <tr>
              <td colspan="7" class="px-4 py-8 text-center text-gray-400">
                Belum ada log pemeliharaan aset. Klik "Jadwalkan / Catat Servis" untuk menambahkan.
              </td>
            </tr>
          {:else}
            {#each maintenances as m}
              <tr class="hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono font-bold text-blue-700">{m.maintenanceCode}</td>
                <td class="px-4 py-3">
                  <span class="font-semibold text-gray-800 text-sm">{m.asset?.name}</span>
                  <span class="block font-mono text-[11px] text-gray-500">{m.asset?.assetCode}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-block font-semibold px-2 py-0.5 rounded text-[10px] {m.type === 'PERBAIKAN' ? 'bg-rose-100 text-rose-800' : m.type === 'INSPEKSI' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'}">
                    {m.type}
                  </span>
                  <span class="block text-gray-600 mt-0.5">{m.vendor || m.technician || 'Internal Teknisi'}</span>
                </td>
                <td class="px-4 py-3 text-gray-600">
                  <span>Mulai: {formatDate(m.maintenanceDate)}</span>
                  {#if m.completionDate}
                    <span class="block text-[11px] text-emerald-600 font-medium">Selesai: {formatDate(m.completionDate)}</span>
                  {/if}
                </td>
                <td class="px-4 py-3 font-semibold text-gray-800">{formatRupiah(m.cost)}</td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold {m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : m.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : m.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}">
                    {m.status === 'COMPLETED' ? 'SELESAI' : m.status === 'IN_PROGRESS' ? 'DIKERJAKAN' : m.status === 'SCHEDULED' ? 'TERJADWAL' : 'BATAL'}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    {#if m.status !== 'COMPLETED' && m.status !== 'CANCELLED'}
                      <button
                        type="button"
                        onclick={() => openComplete(m)}
                        class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition"
                      >
                        Selesaikan
                      </button>
                    {/if}
                    <button
                      type="button"
                      onclick={() => handleDelete(m)}
                      class="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                      title="Hapus"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Tambah Servis -->
{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-lg bg-white rounded-lg p-5 shadow-xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <h3 class="font-bold text-gray-800 text-base">Jadwalkan / Catat Servis Aset</h3>
        <button type="button" onclick={() => showModal = false} class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <form onsubmit={handleSave} class="space-y-3 text-xs">
        <div>
          <label for="mnt-asset" class="block font-semibold text-gray-700 mb-1">Pilih Aset *</label>
          <select
            id="mnt-asset"
            required
            bind:value={form.assetId}
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          >
            <option value="">-- Pilih Aset Tetap --</option>
            {#each assets as a}
              <option value={a.id}>{a.assetCode} - {a.name} ({a.status})</option>
            {/each}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="mnt-type" class="block font-semibold text-gray-700 mb-1">Jenis Pemeliharaan</label>
            <select
              id="mnt-type"
              bind:value={form.type}
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            >
              <option value="RUTIN">Servis Rutin</option>
              <option value="PERBAIKAN">Perbaikan Kerusakan</option>
              <option value="INSPEKSI">Inspeksi & Kalibrasi</option>
            </select>
          </div>
          <div>
            <label for="mnt-status" class="block font-semibold text-gray-700 mb-1">Status Awal</label>
            <select
              id="mnt-status"
              bind:value={form.status}
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            >
              <option value="IN_PROGRESS">Sedang Dikerjakan</option>
              <option value="SCHEDULED">Terjadwal</option>
              <option value="COMPLETED">Langsung Selesai</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="mnt-date" class="block font-semibold text-gray-700 mb-1">Tanggal Mulai Servis</label>
            <input
              id="mnt-date"
              type="date"
              bind:value={form.maintenanceDate}
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            />
          </div>
          <div>
            <label for="mnt-cost" class="block font-semibold text-gray-700 mb-1">Estimasi / Biaya (Rp)</label>
            <input
              id="mnt-cost"
              type="number"
              min="0"
              bind:value={form.cost}
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="mnt-vendor" class="block font-semibold text-gray-700 mb-1">Vendor Bengkel / Teknisi</label>
            <input
              id="mnt-vendor"
              type="text"
              bind:value={form.vendor}
              placeholder="Contoh: CV. Teknik Servis IT"
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            />
          </div>
          <div>
            <label for="mnt-inv" class="block font-semibold text-gray-700 mb-1">No. Faktur / Invoice</label>
            <input
              id="mnt-inv"
              type="text"
              bind:value={form.invoiceNumber}
              placeholder="Contoh: INV-2026/09/88"
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            />
          </div>
        </div>

        <div>
          <label for="mnt-desc" class="block font-semibold text-gray-700 mb-1">Deskripsi / Keluhan Kerusakan</label>
          <textarea
            id="mnt-desc"
            rows="2"
            bind:value={form.description}
            placeholder="Kendala fisik aset, komponen yang harus diganti..."
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          ></textarea>
        </div>

        <div class="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
          <input
            id="chk-under-mnt"
            type="checkbox"
            bind:checked={form.setAssetUnderMaintenance}
            class="rounded text-amber-600 focus:ring-amber-500"
          />
          <label for="chk-under-mnt">Ubah status aset menjadi <strong>UNDER_MAINTENANCE</strong> agar tidak dapat dipinjam selama servis.</label>
        </div>

        <div class="pt-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onclick={() => showModal = false}
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            class="px-4 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-semibold rounded shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Data Servis'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal Selesaikan Servis -->
{#if completeModalOpen && activeMaintenance}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-sm bg-white rounded-lg p-5 shadow-xl animate-in fade-in zoom-in duration-150">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <div>
          <h3 class="font-bold text-gray-800 text-sm">Selesaikan Servis Aset</h3>
          <p class="text-xs text-gray-500">{activeMaintenance.asset?.name} ({activeMaintenance.maintenanceCode})</p>
        </div>
        <button type="button" onclick={() => completeModalOpen = false} class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <form onsubmit={handleCompleteSubmit} class="space-y-3 text-xs">
        <div>
          <label for="cmp-date" class="block font-semibold text-gray-700 mb-1">Tanggal Selesai Reparasi</label>
          <input
            id="cmp-date"
            type="date"
            required
            bind:value={completeForm.completionDate}
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          />
        </div>

        <div>
          <label for="cmp-cost" class="block font-semibold text-gray-700 mb-1">Total Biaya Riil (Rp)</label>
          <input
            id="cmp-cost"
            type="number"
            min="0"
            bind:value={completeForm.cost}
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          />
        </div>

        <div>
          <label for="cmp-inv" class="block font-semibold text-gray-700 mb-1">Nomor Faktur / Kuitansi</label>
          <input
            id="cmp-inv"
            type="text"
            bind:value={completeForm.invoiceNumber}
            placeholder="Nomor faktur bengkel/vendor..."
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          />
        </div>

        <div>
          <label for="cmp-notes" class="block font-semibold text-gray-700 mb-1">Hasil Perbaikan / Tindakan</label>
          <textarea
            id="cmp-notes"
            rows="2"
            bind:value={completeForm.resultNotes}
            placeholder="Part yang diganti, kondisi terkini..."
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          ></textarea>
        </div>

        <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px]">
          Status aset akan otomatis dikembalikan menjadi <strong>TERSEDIA</strong> dan siap digunakan/dipinjam kembali.
        </div>

        <div class="pt-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onclick={() => completeModalOpen = false}
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Tandai Selesai'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
