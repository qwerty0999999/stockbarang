<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';

	let { data } = $props();
	let items = $derived(data.items);
	let categories = $derived(data.categories || []);
	let suppliers = $derived(data.suppliers || []);
	let pagination = $derived(data.pagination || { page: 1, limit: 20, total: items.length, totalPages: 1 });

	let showModal = $state(false);
	let editItem: any = $state(null);
	let loading = $state(false);
	let error = $state('');
	let search = $state('');
	let showScanner = $state(false);

	$effect(() => {
		search = data.searchQuery || '';
	});

	let searchTimeout: any;
	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const url = new URL($page.url);
			if (search) {
				url.searchParams.set('search', search);
			} else {
				url.searchParams.delete('search');
			}
			url.searchParams.set('page', '1');
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}, 300);
	}

	function goToPage(p: number) {
		if (p < 1 || p > pagination.totalPages) return;
		const url = new URL($page.url);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { noScroll: true });
	}

	let selectedIds: number[] = $state([]);
	let showBatchModal = $state(false);
	let batchQuantity = $state(0);
	let batchType = $state('add');
	let batchLoading = $state(false);
	let batchError = $state('');

	let form = $state({
		name: '',
		sku: '',
		location: '',
		minStock: 5,
		quantity: 0,
		price: 0,
		description: '',
		categoryId: '',
		supplierId: ''
	});

	function openAdd() {
		editItem = null;
		form = {
			name: '',
			sku: '',
			location: '',
			minStock: 5,
			quantity: 0,
			price: 0,
			description: '',
			categoryId: '',
			supplierId: ''
		};
		error = '';
		showModal = true;
	}

	function openEdit(item: any) {
		editItem = item;
		form = { 
			name: item.name, 
			sku: item.sku || '',
			location: item.location || '',
			minStock: item.minStock,
			quantity: item.quantity, 
			price: item.price, 
			description: item.description ?? '',
			categoryId: item.categoryId ? item.categoryId.toString() : '',
			supplierId: item.supplierId ? item.supplierId.toString() : ''
		};
		error = '';
		showModal = true;
	}

	async function save(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		const url = editItem ? `/api/inventory/${editItem.id}` : '/api/inventory';
		const method = editItem ? 'PUT' : 'POST';
		
		const res = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form)
		});
		const d = await res.json();
		loading = false;
		if (!res.ok) { 
			error = d.error || 'Gagal menyimpan barang'; 
			return; 
		}
		toast.success(editItem ? 'Barang berhasil diperbarui' : 'Barang berhasil ditambahkan');
		showModal = false;
		await invalidateAll();
	}

	async function deleteItem(id: number) {
		if (!confirm('Yakin ingin menghapus barang ini?')) return;
		const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
		const d = await res.json();
		if (!res.ok) {
			toast.error(d.error || 'Gagal menghapus barang');
			return;
		}
		toast.success('Barang berhasil dihapus');
		await invalidateAll();
	}

	function toggleSelectAll(e: Event) {
		const checked = (e.target as HTMLInputElement).checked;
		if (checked) {
			selectedIds = items.map((i: any) => i.id);
		} else {
			selectedIds = [];
		}
	}

	function toggleSelect(id: number) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter(x => x !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	function formatRupiah(n: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
	}

	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || !input.files[0]) return;
		const file = input.files[0];
		const formData = new FormData();
		formData.append('file', file);
		formData.append('type', 'items');
		try {
			const res = await fetch('/api/import-export', { method: 'POST', body: formData });
			const result = await res.json();
			if (res.ok) {
				toast.success(`Berhasil import ${result.count} barang`);
				await invalidateAll();
			} else {
				toast.error(result.error || 'Import gagal');
			}
		} catch (err) {
			toast.error('Terjadi kesalahan saat import data');
		}
		input.value = '';
	}

	function handleBarcodeScanned(code: string) {
		search = code;
		showScanner = false;
		handleSearch();
		toast.info(`Mencari kode: ${code}`);
	}
</script>

<svelte:head><title>Data Barang Konsumsi – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans">
	<!-- Page Header & Breadcrumb -->
	<div class="flex items-center justify-between pb-2 border-b border-gray-200">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Data Barang Konsumsi <span class="text-sm text-gray-500 font-light">Stok Barang Habis Pakai</span>
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
			<span class="text-gray-400">Data Barang</span>
		</div>
	</div>

	<!-- Main Box AdminLTE Style -->
	<div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
		<div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<button onclick={openAdd} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
					Tambah Barang
				</button>
				{#if selectedIds.length > 0}
					<button onclick={() => { showBatchModal = true; batchQuantity = 0; }} class="bg-[#F39C12] hover:bg-[#E08E0B] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
						Update Stok ({selectedIds.length})
					</button>
					<a href={`/inventory/labels?ids=${selectedIds.join(',')}`} class="bg-[#00A65A] hover:bg-[#008D4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
						Cetak Label ({selectedIds.length})
					</a>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<button onclick={() => showScanner = !showScanner} class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
					{showScanner ? 'Tutup Scanner' : 'Scan Barcode'}
				</button>
				<input type="file" id="csvItemInput" accept=".csv" class="hidden" onchange={handleImport} />
				<button onclick={() => document.getElementById('csvItemInput')?.click()} class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 text-xs font-semibold rounded-sm">
					Import CSV
				</button>
				<a href="/api/import-export?type=items" class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 text-xs font-semibold rounded-sm">
					Export CSV
				</a>
				<a href="/inventory/items/print" class="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
					Cetak
				</a>
			</div>
		</div>

		{#if showScanner}
			<div class="p-4 bg-gray-50 border-b border-gray-200 flex flex-col items-center">
				<h4 class="text-sm font-semibold text-gray-700 mb-2">Arahkan kamera ke Barcode / QR Code Barang</h4>
				<BarcodeScanner onScan={handleBarcodeScanned} />
			</div>
		{/if}

		<div class="p-4">
			<!-- Search Bar -->
			<div class="mb-4 flex justify-between items-center">
				<div class="text-xs text-gray-500">
					Total: <span class="font-semibold">{pagination.total}</span> barang terdaftar
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold text-gray-700">Search:</span>
					<input 
						type="text" 
						bind:value={search} 
						oninput={handleSearch}
						placeholder="Nama, SKU, Lokasi..."
						class="border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm w-56" 
					/>
				</div>
			</div>

			<!-- Table -->
			<div class="overflow-x-auto border border-gray-200">
				<table class="w-full text-left border-collapse text-sm">
					<thead>
						<tr class="bg-gray-100 text-gray-700 border-b border-gray-200 text-xs">
							<th class="p-2.5 text-center w-8">
								<input type="checkbox" onchange={toggleSelectAll} checked={items.length > 0 && selectedIds.length === items.length} />
							</th>
							<th class="p-2.5 text-center w-12 font-bold border-r border-gray-200">NO</th>
							<th class="p-2.5 font-bold border-r border-gray-200">KODE / SKU</th>
							<th class="p-2.5 font-bold border-r border-gray-200">NAMA BARANG</th>
							<th class="p-2.5 font-bold border-r border-gray-200">KATEGORI</th>
							<th class="p-2.5 font-bold border-r border-gray-200">LOKASI</th>
							<th class="p-2.5 text-right font-bold border-r border-gray-200">HARGA SATUAN</th>
							<th class="p-2.5 text-center font-bold border-r border-gray-200">STOK</th>
							<th class="p-2.5 text-center font-bold">AKSI</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each items as item, idx}
							<tr class="hover:bg-gray-50 transition-colors {item.quantity <= item.minStock ? 'bg-red-50/50' : ''}">
								<td class="p-2.5 text-center">
									<input type="checkbox" checked={selectedIds.includes(item.id)} onchange={() => toggleSelect(item.id)} />
								</td>
								<td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{((pagination.page - 1) * pagination.limit) + idx + 1}</td>
								<td class="p-2.5 font-mono text-xs border-r border-gray-100 font-semibold text-gray-700">{item.sku || '-'}</td>
								<td class="p-2.5 font-medium text-gray-900 border-r border-gray-100">
									{item.name}
									{#if item.quantity <= item.minStock}
										<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
											Stok Menipis
										</span>
									{/if}
								</td>
								<td class="p-2.5 text-gray-600 border-r border-gray-100">{item.category?.name || '-'}</td>
								<td class="p-2.5 text-gray-600 border-r border-gray-100">{item.location || '-'}</td>
								<td class="p-2.5 text-right text-gray-800 border-r border-gray-100 font-mono">{formatRupiah(item.price)}</td>
								<td class="p-2.5 text-center border-r border-gray-100">
									<span class="inline-flex px-2 py-0.5 rounded text-xs font-bold {item.quantity <= item.minStock ? 'bg-red-600 text-white' : 'bg-green-100 text-green-800'}">
										{item.quantity}
									</span>
									<span class="text-[10px] text-gray-400 block mt-0.5">Min: {item.minStock}</span>
								</td>
								<td class="p-2.5 text-center">
									<div class="flex items-center justify-center gap-1.5">
										<a href={`/api/label?id=${item.id}`} target="_blank" title="Cetak Label Barcode" class="text-emerald-600 hover:text-emerald-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
										</a>
										<button onclick={() => openEdit(item)} title="Edit" class="text-blue-600 hover:text-blue-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
										</button>
										<button onclick={() => deleteItem(item.id)} title="Hapus" class="text-red-600 hover:text-red-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="9" class="p-8 text-center text-gray-500">
									{search ? 'Tidak ada data barang yang sesuai dengan pencarian.' : 'Belum ada data barang konsumsi.'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="mt-4 flex flex-wrap justify-between items-center text-sm text-gray-600 gap-2">
				<div>
					Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
				</div>
				<div class="flex border border-gray-300 rounded overflow-hidden">
					<button type="button" onclick={() => goToPage(pagination.page - 1)} class="px-3 py-1 bg-white hover:bg-gray-50 text-gray-500 border-r border-gray-300 disabled:opacity-50" disabled={pagination.page <= 1}>Previous</button>
					<span class="px-3 py-1 bg-[#3C8DBC] text-white font-medium">{pagination.page}</span>
					<button type="button" onclick={() => goToPage(pagination.page + 1)} class="px-3 py-1 bg-white hover:bg-gray-50 text-gray-500 border-l border-gray-300 disabled:opacity-50" disabled={pagination.page >= pagination.totalPages}>Next</button>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Modal Form Tambah / Edit Barang -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-lg overflow-hidden">
			<div class="bg-[#3C8DBC] px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal">{editItem ? 'Edit Barang' : 'Tambah Barang Baru'}</h4>
				<button type="button" aria-label="Close" onclick={() => showModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={save} class="p-5 space-y-3">
				{#if error}
					<div class="bg-red-50 text-red-600 p-2 text-sm border-l-2 border-red-500">{error}</div>
				{/if}
				<div>
					<label for="name" class="block text-xs font-bold text-gray-700 mb-1">Nama Barang *</label>
					<input id="name" type="text" bind:value={form.name} required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="sku" class="block text-xs font-bold text-gray-700 mb-1">SKU / Kode Barang</label>
						<input id="sku" type="text" bind:value={form.sku} placeholder="Auto atau manual" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div>
						<label for="location" class="block text-xs font-bold text-gray-700 mb-1">Lokasi Penyimpanan</label>
						<input id="location" type="text" bind:value={form.location} placeholder="Rak A1, Gudang 1..." class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="category" class="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
						<select id="category" bind:value={form.categoryId} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
							<option value="">-- Pilih Kategori --</option>
							{#each categories as cat}
								<option value={cat.id.toString()}>{cat.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="supplier" class="block text-xs font-bold text-gray-700 mb-1">Supplier Utama</label>
						<select id="supplier" bind:value={form.supplierId} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
							<option value="">-- Pilih Supplier --</option>
							{#each suppliers as sup}
								<option value={sup.id.toString()}>{sup.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="qty" class="block text-xs font-bold text-gray-700 mb-1">Stok Awal</label>
						<input id="qty" type="number" bind:value={form.quantity} min="0" required disabled={editItem !== null} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm disabled:bg-gray-100" />
					</div>
					<div>
						<label for="minStock" class="block text-xs font-bold text-gray-700 mb-1">Min. Stok Alert</label>
						<input id="minStock" type="number" bind:value={form.minStock} min="0" required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div>
						<label for="price" class="block text-xs font-bold text-gray-700 mb-1">Harga Satuan (Rp)</label>
						<input id="price" type="number" bind:value={form.price} min="0" required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
				</div>
				<div>
					<label for="desc" class="block text-xs font-bold text-gray-700 mb-1">Keterangan Tambahan</label>
					<textarea id="desc" bind:value={form.description} rows="2" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm resize-none"></textarea>
				</div>
				<div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
					<button type="button" onclick={() => showModal = false} class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-medium rounded-sm">Batal</button>
					<button type="submit" disabled={loading} class="px-4 py-1.5 bg-[#3C8DBC] hover:bg-[#367FA9] text-white text-xs font-semibold rounded-sm disabled:opacity-70">
						{loading ? 'Menyimpan...' : 'Simpan'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Batch Modal (Stok Update) -->
{#if showBatchModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-sm overflow-hidden">
			<div class="bg-[#F39C12] px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal text-sm">Update Stok Massal ({selectedIds.length} Barang)</h4>
				<button type="button" aria-label="Close" onclick={() => { showBatchModal = false; batchError = ''; }} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<div class="p-5 space-y-4">
				{#if batchError}
					<div class="bg-red-50 text-red-600 p-2 text-xs border-l-2 border-red-500">{batchError}</div>
				{/if}
				<div>
					<span class="block text-xs font-bold text-gray-700 mb-1">Mode Perubahan</span>
					<div class="flex gap-4">
						<label class="flex items-center gap-1.5 text-xs">
							<input type="radio" bind:group={batchType} value="add" name="bType" /> Tambah (+)
						</label>
						<label class="flex items-center gap-1.5 text-xs">
							<input type="radio" bind:group={batchType} value="set" name="bType" /> Set Langsung (=)
						</label>
					</div>
				</div>
				<div>
					<label for="batchQty" class="block text-xs font-bold text-gray-700 mb-1">Jumlah</label>
					<input id="batchQty" type="number" bind:value={batchQuantity} min="0" required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#F39C12] rounded-sm" />
				</div>
				<div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
					<button type="button" onclick={() => { showBatchModal = false; batchError = ''; }} class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-medium rounded-sm">Batal</button>
					<button type="button" onclick={async () => {
						batchLoading = true;
						batchError = '';
						const res = await fetch('/api/inventory/batch', {
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ ids: selectedIds, quantity: batchQuantity, type: batchType })
						});
						const d = await res.json();
						batchLoading = false;
						if (!res.ok) { batchError = d.error; return; }
						toast.success('Stok berhasil diperbarui');
						showBatchModal = false;
						selectedIds = [];
						await invalidateAll();
					}} disabled={batchLoading} class="px-4 py-1.5 bg-[#F39C12] hover:bg-[#E08E0B] text-white text-xs font-semibold rounded-sm disabled:opacity-70">
						{batchLoading ? 'Memproses...' : 'Terapkan Stok'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}