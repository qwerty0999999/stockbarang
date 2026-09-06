<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';

  let { data } = $props();
  let requisitions = $derived(data.requisitions);
  let availableItems = $derived(data.availableItems || []);
  let availableAssets = $derived(data.availableAssets || []);
  let userRole = $derived(data.userRole);
  let currentUser = $derived(data.currentUser);
  let pendingCount = $derived(data.pendingCount || 0);
  let pagination = $derived(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });

  // Filters
  let search = $state('');
  let statusFilter = $state('');
  let typeFilter = $state('');
  let activeTab = $state<'REQS' | 'CATALOG'>('REQS');

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
    goto('/inventory/requisitions');
  }

  // Modal Ajukan Permohonan
  let showCreateModal = $state(false);
  let loading = $state(false);
  let form = $state({
    type: 'CONSUMABLE', // CONSUMABLE atau ASSET_LOAN
    reason: '',
    department: '',
    neededDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [
      { itemId: '', assetId: '', quantity: 1, notes: '' }
    ]
  });

  function openCreate() {
    form = {
      type: 'CONSUMABLE',
      reason: '',
      department: '',
      neededDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        { itemId: availableItems.length ? availableItems[0].id.toString() : '', assetId: '', quantity: 1, notes: '' }
      ]
    };
    showCreateModal = true;
  }

  function addItemRow() {
    if (form.type === 'CONSUMABLE') {
      form.items.push({ itemId: availableItems.length ? availableItems[0].id.toString() : '', assetId: '', quantity: 1, notes: '' });
    } else {
      form.items.push({ itemId: '', assetId: availableAssets.length ? availableAssets[0].id.toString() : '', quantity: 1, notes: '' });
    }
  }

  function removeItemRow(index: number) {
    if (form.items.length > 1) {
      form.items.splice(index, 1);
    }
  }

  function switchType(newType: 'CONSUMABLE' | 'ASSET_LOAN') {
    form.type = newType;
    form.items = [
      newType === 'CONSUMABLE' 
        ? { itemId: availableItems.length ? availableItems[0].id.toString() : '', assetId: '', quantity: 1, notes: '' }
        : { itemId: '', assetId: availableAssets.length ? availableAssets[0].id.toString() : '', quantity: 1, notes: '' }
    ];
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    loading = true;

    try {
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success('Permohonan barang berhasil diajukan! Menunggu persetujuan manajer.');
        showCreateModal = false;
        await invalidateAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal mengajukan permohonan');
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem');
    } finally {
      loading = false;
    }
  }

  // Approval Modal State
  let showApprovalModal = $state(false);
  let activeReq = $state<any>(null);
  let approvalAction = $state<'APPROVE' | 'REJECT'>('APPROVE');
  let approvalNotes = $state('');

  function openApproval(req: any, action: 'APPROVE' | 'REJECT') {
    activeReq = req;
    approvalAction = action;
    approvalNotes = '';
    showApprovalModal = true;
  }

  async function handleApprovalSubmit(e: Event) {
    e.preventDefault();
    if (!activeReq) return;
    loading = true;

    try {
      const res = await fetch(`/api/requisitions/${activeReq.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approvalAction,
          approvalNotes
        })
      });

      const resData = await res.json();
      if (res.ok) {
        toast.success(resData.message || 'Status persetujuan berhasil diperbarui');
        showApprovalModal = false;
        await invalidateAll();
      } else {
        toast.error(resData.error || 'Gagal memproses persetujuan');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  // Fulfill / Serah Terima
  async function handleFulfill(req: any) {
    if (!confirm(`Konfirmasi serah terima barang untuk permohonan ${req.requisitionCode}? Stok gudang / pinjaman aset akan langsung dicatat secara otomatis.`)) return;

    try {
      const res = await fetch(`/api/requisitions/${req.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const resData = await res.json();
      if (res.ok) {
        toast.success(resData.message || 'Serah terima permohonan berhasil diproses!');
        await invalidateAll();
      } else {
        toast.error(resData.error || 'Gagal menyerahterimakan permohonan');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(req: any) {
    if (!confirm(`Hapus permohonan ${req.requisitionCode}?`)) return;
    try {
      const res = await fetch(`/api/requisitions/${req.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Permohonan berhasil dihapus');
        await invalidateAll();
      } else {
        toast.error('Gagal menghapus permohonan');
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
  <title>Permohonan Barang & Approval – InventarisApp</title>
</svelte:head>

<div class="space-y-4">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
    <div>
      <h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
        Permohonan Barang <span class="text-sm text-gray-500 font-light">Employee Self-Service & Approval Flow</span>
      </h1>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={openCreate}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white text-sm font-semibold rounded shadow-sm transition"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Ajukan Permohonan Baru
      </button>
    </div>
  </div>

  <!-- KPI Summary Banner -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div class="bg-white border border-gray-200 rounded p-3.5 shadow-sm">
      <span class="text-xs text-gray-500 uppercase font-semibold">Total Permohonan</span>
      <p class="text-xl font-bold text-gray-800 mt-1">{pagination.total}</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3.5 shadow-sm">
      <span class="text-xs text-amber-600 uppercase font-semibold">Menunggu Approval</span>
      <p class="text-xl font-bold text-amber-600 mt-1">{pendingCount}</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3.5 shadow-sm">
      <span class="text-xs text-blue-600 uppercase font-semibold">Disetujui (Approved)</span>
      <p class="text-xl font-bold text-blue-600 mt-1">{requisitions.filter(r => r.status === 'APPROVED').length}</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3.5 shadow-sm">
      <span class="text-xs text-emerald-600 uppercase font-semibold">Selesai Diserahkan</span>
      <p class="text-xl font-bold text-emerald-600 mt-1">{requisitions.filter(r => r.status === 'COMPLETED').length}</p>
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="border-b border-gray-200 flex gap-4 text-xs font-semibold">
    <button
      type="button"
      onclick={() => activeTab = 'REQS'}
      class="pb-2.5 border-b-2 transition {activeTab === 'REQS' ? 'border-[#3c8dbc] text-[#3c8dbc]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
    >
      Daftar Permohonan {userRole === 'karyawan' ? 'Saya' : 'Semua'} ({pagination.total})
    </button>
    <button
      type="button"
      onclick={() => activeTab = 'CATALOG'}
      class="pb-2.5 border-b-2 transition {activeTab === 'CATALOG' ? 'border-[#3c8dbc] text-[#3c8dbc]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
    >
      Katalog Barang & Aset Tersedia ({availableItems.length + availableAssets.length})
    </button>
  </div>

  {#if activeTab === 'REQS'}
    <!-- Filters -->
    <div class="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-wrap gap-2.5 items-center justify-between">
      <div class="flex flex-wrap gap-2 items-center flex-1">
        <div class="relative min-w-[240px] flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Cari no permohonan, alasan, staf, atau divisi..."
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
          <option value="PENDING_APPROVAL">Menunggu Persetujuan (PENDING)</option>
          <option value="APPROVED">Disetujui (APPROVED)</option>
          <option value="REJECTED">Ditolak (REJECTED)</option>
          <option value="COMPLETED">Selesai Serah Terima (COMPLETED)</option>
        </select>

        <select
          bind:value={typeFilter}
          onchange={applyFilters}
          class="text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
        >
          <option value="">Semua Tipe</option>
          <option value="CONSUMABLE">Barang Konsumsi (ATK)</option>
          <option value="ASSET_LOAN">Peminjaman Aset Tetap</option>
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

    <!-- Table Requisitions -->
    <div class="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3">No. Permohonan</th>
              <th class="px-4 py-3">Pemohon & Divisi</th>
              <th class="px-4 py-3">Tipe & Keperluan</th>
              <th class="px-4 py-3">Rincian Barang</th>
              <th class="px-4 py-3">Tgl Dibutuhkan</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-center">Aksi / Approval</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#if requisitions.length === 0}
              <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-400">
                  Belum ada permohonan yang diajukan.
                </td>
              </tr>
            {:else}
              {#each requisitions as req}
                <tr class="hover:bg-slate-50 transition">
                  <td class="px-4 py-3 font-mono font-bold text-blue-700">{req.requisitionCode}</td>
                  <td class="px-4 py-3">
                    <span class="font-semibold text-gray-800 text-sm block">{req.requester?.username}</span>
                    <span class="text-gray-400 text-[11px] block">{req.department || 'Staff'}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold {req.type === 'CONSUMABLE' ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'}">
                      {req.type === 'CONSUMABLE' ? 'KONSUMSI / ATK' : 'PINJAM ASET'}
                    </span>
                    <p class="font-medium text-gray-800 text-xs mt-1">{req.reason}</p>
                  </td>
                  <td class="px-4 py-3">
                    <ul class="space-y-0.5">
                      {#each req.items as it}
                        <li class="text-gray-700">
                          • <strong>{it.item?.name || it.asset?.name}</strong>: {it.quantity} unit
                          {#if it.notes}<span class="text-gray-400 text-[10px]">({it.notes})</span>{/if}
                        </li>
                      {/each}
                    </ul>
                  </td>
                  <td class="px-4 py-3 text-gray-600">{formatDate(req.neededDate)}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold {req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : req.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' : req.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}">
                      {req.status === 'COMPLETED' ? 'SELESAI' : req.status === 'APPROVED' ? 'DISETUJUI' : req.status === 'PENDING_APPROVAL' ? 'MENUNGGU APPROVAL' : 'DITOLAK'}
                    </span>
                    {#if req.approvedBy}
                      <span class="block text-[10px] text-gray-400 mt-0.5">Oleh: {req.approvedBy.username}</span>
                    {/if}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <!-- Action for Admin/Dev on PENDING -->
                      {#if (userRole === 'admin' || userRole === 'dev') && req.status === 'PENDING_APPROVAL'}
                        <button
                          type="button"
                          onclick={() => openApproval(req, 'APPROVE')}
                          class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-[11px] transition"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          onclick={() => openApproval(req, 'REJECT')}
                          class="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded text-[11px] transition"
                        >
                          Tolak
                        </button>
                      {/if}

                      <!-- Action for Staff Gudang on APPROVED -->
                      {#if (userRole === 'admin' || userRole === 'dev' || userRole === 'manajemen') && req.status === 'APPROVED'}
                        <button
                          type="button"
                          onclick={() => handleFulfill(req)}
                          class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded text-[11px] transition"
                          title="Eksekusi serah terima barang ke pemohon"
                        >
                          Serah Terima
                        </button>
                      {/if}

                      {#if req.status !== 'COMPLETED'}
                        <button
                          type="button"
                          onclick={() => handleDelete(req)}
                          class="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                          title="Hapus"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <!-- Tab Katalog Barang & Aset -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Konsumsi / ATK -->
      <div class="bg-white rounded border border-gray-200 shadow-sm p-4 space-y-3">
        <h3 class="font-bold text-gray-800 text-sm flex items-center gap-2">
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V7"/></svg>
          Stok Barang Konsumsi (ATK) Tersedia
        </h3>
        <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {#each availableItems as it}
            <div class="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span class="font-semibold text-gray-900 block">{it.name}</span>
                <span class="text-gray-400 text-[11px]">SKU: {it.sku || '-'} • Lokasi: {it.location || 'Gudang'}</span>
              </div>
              <span class="font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                Sisa: {it.quantity}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Aset Tetap -->
      <div class="bg-white rounded border border-gray-200 shadow-sm p-4 space-y-3">
        <h3 class="font-bold text-gray-800 text-sm flex items-center gap-2">
          <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          Aset Tetap Tersedia untuk Dipinjam
        </h3>
        <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {#each availableAssets as ast}
            <div class="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span class="font-semibold text-gray-900 block">{ast.name}</span>
                <span class="text-gray-400 text-[11px] font-mono">{ast.assetCode} • Lokasi: {ast.location?.name || '-'}</span>
              </div>
              <span class="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                {ast.condition}
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Modal Ajukan Permohonan -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-lg bg-white rounded-lg p-5 shadow-xl animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <div>
          <h3 class="font-bold text-gray-800 text-base">Ajukan Permohonan Barang / Aset</h3>
          <p class="text-xs text-gray-500">Permohonan akan ditinjau dan disetujui oleh manajer</p>
        </div>
        <button type="button" onclick={() => showCreateModal = false} class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <form onsubmit={handleCreate} class="space-y-3.5 text-xs">
        <!-- Tipe Permohonan Pill -->
        <div>
          <label class="block font-semibold text-gray-700 mb-1">Tipe Permohonan *</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onclick={() => switchType('CONSUMABLE')}
              class="py-2 px-3 rounded font-semibold border transition {form.type === 'CONSUMABLE' ? 'bg-sky-50 border-sky-500 text-sky-700' : 'bg-white border-gray-200 text-gray-600'}"
            >
              Barang Konsumsi / ATK
            </button>
            <button
              type="button"
              onclick={() => switchType('ASSET_LOAN')}
              class="py-2 px-3 rounded font-semibold border transition {form.type === 'ASSET_LOAN' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200 text-gray-600'}"
            >
              Peminjaman Aset Tetap
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="req-dept" class="block font-semibold text-gray-700 mb-1">Departemen / Divisi *</label>
            <input
              id="req-dept"
              type="text"
              required
              bind:value={form.department}
              placeholder="Contoh: Divisi IT, Keuangan, Operasional"
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            />
          </div>
          <div>
            <label for="req-date" class="block font-semibold text-gray-700 mb-1">Tanggal Dibutuhkan</label>
            <input
              id="req-date"
              type="date"
              required
              bind:value={form.neededDate}
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            />
          </div>
        </div>

        <div>
          <label for="req-reason" class="block font-semibold text-gray-700 mb-1">Alasan / Keperluan Permohonan *</label>
          <textarea
            id="req-reason"
            required
            rows="2"
            bind:value={form.reason}
            placeholder="Tuliskan tujuan pemakaian barang atau aset..."
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          ></textarea>
        </div>

        <!-- Dynamic Items List -->
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-gray-700 uppercase text-[11px]">Daftar Barang yang Diajukan</span>
            <button
              type="button"
              onclick={addItemRow}
              class="text-[11px] text-blue-600 font-semibold hover:underline"
            >
              + Tambah Item
            </button>
          </div>

          {#each form.items as it, idx}
            <div class="flex items-center gap-2 pt-1 border-t border-slate-200 first:border-0 first:pt-0">
              <div class="flex-1">
                {#if form.type === 'CONSUMABLE'}
                  <select
                    bind:value={it.itemId}
                    class="w-full px-2 py-1 border border-gray-300 rounded bg-white text-xs"
                  >
                    {#each availableItems as ai}
                      <option value={ai.id}>{ai.name} (Sisa: {ai.quantity})</option>
                    {/each}
                  </select>
                {:else}
                  <select
                    bind:value={it.assetId}
                    class="w-full px-2 py-1 border border-gray-300 rounded bg-white text-xs"
                  >
                    {#each availableAssets as aa}
                      <option value={aa.id}>{aa.name} ({aa.assetCode})</option>
                    {/each}
                  </select>
                {/if}
              </div>

              {#if form.type === 'CONSUMABLE'}
                <div class="w-20">
                  <input
                    type="number"
                    min="1"
                    bind:value={it.quantity}
                    placeholder="Qty"
                    class="w-full px-2 py-1 border border-gray-300 rounded bg-white text-xs text-center"
                  />
                </div>
              {/if}

              {#if form.items.length > 1}
                <button
                  type="button"
                  onclick={() => removeItemRow(idx)}
                  class="text-rose-500 hover:text-rose-700 p-1"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              {/if}
            </div>
          {/each}
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
            {loading ? 'Mengirim...' : 'Kirim Permohonan'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal Approval Admin -->
{#if showApprovalModal && activeReq}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-sm bg-white rounded-lg p-5 shadow-xl animate-in fade-in zoom-in duration-150">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <div>
          <h3 class="font-bold text-gray-800 text-sm">
            {approvalAction === 'APPROVE' ? 'Setujui Permohonan' : 'Tolak Permohonan'}
          </h3>
          <p class="text-xs text-gray-500">{activeReq.requisitionCode} - {activeReq.requester?.username}</p>
        </div>
        <button type="button" onclick={() => showApprovalModal = false} class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <form onsubmit={handleApprovalSubmit} class="space-y-3 text-xs">
        <div>
          <label for="appr-notes" class="block font-semibold text-gray-700 mb-1">
            {approvalAction === 'APPROVE' ? 'Catatan Persetujuan (Opsional)' : 'Alasan Penolakan *'}
          </label>
          <textarea
            id="appr-notes"
            required={approvalAction === 'REJECT'}
            rows="3"
            bind:value={approvalNotes}
            placeholder={approvalAction === 'APPROVE' ? 'Disetujui untuk pemenuhan gudang...' : 'Stok tidak tersedia atau belum diizinkan...'}
            class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          ></textarea>
        </div>

        <div class="pt-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onclick={() => showApprovalModal = false}
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            class="px-4 py-1.5 font-bold text-white rounded shadow-sm transition disabled:opacity-50 {approvalAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}"
          >
            {loading ? 'Menyimpan...' : (approvalAction === 'APPROVE' ? 'Setujui Permohonan' : 'Tolak Permohonan')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
