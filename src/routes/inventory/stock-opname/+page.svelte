<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';

  let { data } = $props();
  let opnames = $derived(data.opnames);
  let locations = $derived(data.locations || []);
  let categories = $derived(data.categories || []);
  let pagination = $derived(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });

  let search = $state('');
  let statusFilter = $state('');

  $effect(() => {
    search = data.filters.search || '';
    statusFilter = data.filters.status || '';
  });

  let searchTimeout: any;
  function applyFilters() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const url = new URL($page.url);
      if (search) url.searchParams.set('search', search); else url.searchParams.delete('search');
      if (statusFilter) url.searchParams.set('status', statusFilter); else url.searchParams.delete('status');
      url.searchParams.set('page', '1');
      goto(url.toString(), { keepFocus: true, noScroll: true });
    }, 300);
  }

  function resetFilters() {
    search = '';
    statusFilter = '';
    goto('/inventory/stock-opname');
  }

  // Create Modal State
  let showCreateModal = $state(false);
  let loading = $state(false);
  let form = $state({
    title: `Stock Opname – ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
    locationId: '',
    categoryId: '',
    notes: ''
  });

  function openCreate() {
    form = {
      title: `Stock Opname – ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
      locationId: '',
      categoryId: '',
      notes: ''
    };
    showCreateModal = true;
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    loading = true;
    try {
      const res = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          locationId: form.locationId ? parseInt(form.locationId) : null,
          categoryId: form.categoryId ? parseInt(form.categoryId) : null,
          notes: form.notes
        })
      });

      const resData = await res.json();
      if (res.ok) {
        toast.success('Sesi Stock Opname berhasil dibuka!');
        showCreateModal = false;
        goto(`/inventory/stock-opname/${resData.id}`);
      } else {
        toast.error(resData.error || 'Gagal membuka sesi');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      loading = false;
    }
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<svelte:head>
  <title>Stock Opname & Rekonsiliasi Gudang – InventarisApp</title>
</svelte:head>

<div class="space-y-4">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
    <div>
      <h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
        Stock Opname <span class="text-sm text-gray-500 font-light">Audit & Rekonsiliasi Stok Gudang</span>
      </h1>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={openCreate}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white text-sm font-semibold rounded shadow-sm transition"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Buka Sesi Opname Baru
      </button>
    </div>
  </div>

  <!-- Summary Banner -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
    <div class="bg-white border border-gray-200 rounded p-4 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <div>
        <p class="text-xs text-gray-500 uppercase font-semibold">Total Sesi Audit</p>
        <p class="text-xl font-bold text-gray-800">{pagination.total}</p>
      </div>
    </div>
    <div class="bg-white border border-gray-200 rounded p-4 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <div>
        <p class="text-xs text-gray-500 uppercase font-semibold">Sedang Berjalan</p>
        <p class="text-xl font-bold text-amber-600">{opnames.filter(o => o.status === 'IN_PROGRESS').length}</p>
      </div>
    </div>
    <div class="bg-white border border-gray-200 rounded p-4 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <div>
        <p class="text-xs text-gray-500 uppercase font-semibold">Selesai Dihitung</p>
        <p class="text-xl font-bold text-indigo-600">{opnames.filter(o => o.status === 'COMPLETED').length}</p>
      </div>
    </div>
    <div class="bg-white border border-gray-200 rounded p-4 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      </div>
      <div>
        <p class="text-xs text-gray-500 uppercase font-semibold">Telah Disesuaikan</p>
        <p class="text-xl font-bold text-emerald-600">{opnames.filter(o => o.status === 'ADJUSTED').length}</p>
      </div>
    </div>
  </div>

  <!-- Filter & Search Bar -->
  <div class="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
    <div class="flex flex-wrap gap-2 items-center flex-1">
      <div class="relative min-w-[240px] flex-1 max-w-sm">
        <input
          type="text"
          placeholder="Cari kode opname atau judul..."
          bind:value={search}
          oninput={applyFilters}
          class="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc] focus:border-[#3c8dbc]"
        />
        <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>

      <select
        bind:value={statusFilter}
        onchange={applyFilters}
        class="text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
      >
        <option value="">Semua Status</option>
        <option value="IN_PROGRESS">Sedang Berjalan (IN_PROGRESS)</option>
        <option value="COMPLETED">Selesai Hitung (COMPLETED)</option>
        <option value="ADJUSTED">Penyesuaian Dieksekusi (ADJUSTED)</option>
      </select>

      {#if search || statusFilter}
        <button
          type="button"
          onclick={resetFilters}
          class="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
        >
          Reset Filter
        </button>
      {/if}
    </div>
  </div>

  <!-- Table Sesi Opname -->
  <div class="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider">
          <tr>
            <th class="px-4 py-3">Kode Opname</th>
            <th class="px-4 py-3">Judul & Cakupan</th>
            <th class="px-4 py-3">Tanggal</th>
            <th class="px-4 py-3">Auditor</th>
            <th class="px-4 py-3 text-center">Jumlah Item</th>
            <th class="px-4 py-3 text-center">Selisih Unit</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#if opnames.length === 0}
            <tr>
              <td colspan="8" class="px-4 py-8 text-center text-gray-400">
                Belum ada sesi stock opname. Klik "Buka Sesi Opname Baru" untuk memulai audit stok gudang.
              </td>
            </tr>
          {:else}
            {#each opnames as op}
              <tr class="hover:bg-blue-50/40 transition">
                <td class="px-4 py-3 font-mono font-bold text-blue-700">
                  <a href={`/inventory/stock-opname/${op.id}`} class="hover:underline">
                    {op.opnameCode}
                  </a>
                </td>
                <td class="px-4 py-3">
                  <p class="font-semibold text-gray-800 text-sm">{op.title}</p>
                  <p class="text-gray-500 text-[11px]">
                    Lokasi: {op.location?.name || 'Seluruh Gudang'} • Kategori: {op.category?.name || 'Semua Kategori'}
                  </p>
                </td>
                <td class="px-4 py-3 text-gray-600">{formatDate(op.date)}</td>
                <td class="px-4 py-3 font-medium text-gray-700">{op.auditor?.username || '-'}</td>
                <td class="px-4 py-3 text-center font-bold text-gray-700">{op._count?.items || op.totalItems}</td>
                <td class="px-4 py-3 text-center">
                  {#if op.totalVariance > 0}
                    <span class="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                      {op.totalVariance} selisih
                    </span>
                  {:else}
                    <span class="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                      Cocok (0)
                    </span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold {op.status === 'ADJUSTED' ? 'bg-emerald-100 text-emerald-800' : op.status === 'COMPLETED' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}">
                    {op.status === 'ADJUSTED' ? 'DIREKONSILIASI' : op.status === 'COMPLETED' ? 'SELESAI HITUNG' : 'DALAM AUDIT'}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <a
                    href={`/inventory/stock-opname/${op.id}`}
                    class="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3c8dbc] hover:bg-[#367fa9] text-white rounded font-medium transition"
                  >
                    Buka Audit
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </a>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Buka Sesi Baru -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-md bg-white rounded-lg p-5 shadow-xl animate-in fade-in zoom-in duration-150">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <h3 class="font-bold text-gray-800 text-base flex items-center gap-2">
          <svg class="w-5 h-5 text-[#3c8dbc]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Buka Sesi Stock Opname Baru
        </h3>
        <button type="button" onclick={() => showCreateModal = false} class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <form onsubmit={handleCreate} class="space-y-3 text-xs">
        <div>
          <label for="so-title" class="block font-semibold text-gray-700 mb-1">Judul / Nama Sesi Audit *</label>
          <input
            id="so-title"
            type="text"
            required
            bind:value={form.title}
            class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="so-location" class="block font-semibold text-gray-700 mb-1">Lokasi Gudang</label>
            <select
              id="so-location"
              bind:value={form.locationId}
              class="w-full px-2.5 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            >
              <option value="">Semua Lokasi</option>
              {#each locations as loc}
                <option value={loc.id}>{loc.name}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="so-cat" class="block font-semibold text-gray-700 mb-1">Kategori Barang</label>
            <select
              id="so-cat"
              bind:value={form.categoryId}
              class="w-full px-2.5 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            >
              <option value="">Semua Kategori</option>
              {#each categories as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div>
          <label for="so-notes" class="block font-semibold text-gray-700 mb-1">Catatan Tambahan</label>
          <textarea
            id="so-notes"
            rows="2"
            bind:value={form.notes}
            placeholder="Instruksi audit fisik rak atau tim..."
            class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          ></textarea>
        </div>

        <div class="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-[11px] flex items-start gap-2">
          <svg class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
          <span>Sistem akan mengunci saldo stok buku saat ini dan menyediakan checklist pemindaian barcode fisik rak.</span>
        </div>

        <div class="pt-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onclick={() => showCreateModal = false}
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            class="px-4 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-semibold rounded shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Mempersiapkan...' : 'Buka Sesi Audit'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
