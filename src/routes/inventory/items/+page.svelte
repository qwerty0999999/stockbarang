<script>
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let items = $state(data.items);
	let showModal = $state(false);
	let editItem = $state(null);
	let loading = $state(false);
	let error = $state('');
	let search = $state('');
	let selectedIds = $state([]);
	let showBatchModal = $state(false);
	let batchQuantity = $state(0);
	let batchType = $state('add');
	let batchLoading = $state(false);
	let batchError = $state('');

	let form = $state({ name: '', sku: '', location: '', minStock: 5, quantity: 0, price: 0, description: '' });

	function openAdd() {
		editItem = null;
		form = { name: '', sku: '', location: '', minStock: 5, quantity: 0, price: 0, description: '' };
		error = '';
		showModal = true;
	}

	function openEdit(item) {
		editItem = item;
		form = { 
			name: item.name, 
			sku: item.sku || '',
			location: item.location || '',
			minStock: item.minStock,
			quantity: item.quantity, 
			price: item.price, 
			description: item.description ?? '' 
		};
		error = '';
		showModal = true;
	}

	async function save(e) {
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
		if (!res.ok) { error = d.error; return; }
		showModal = false;
		await invalidateAll();
		items = data.items;
	}

	async function deleteItem(id) {
		if (!confirm('Hapus barang ini?')) return;
		await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
		await invalidateAll();
		items = data.items;
	}

	let filtered = $derived(
		items.filter((i) => 
			i.name.toLowerCase().includes(search.toLowerCase()) ||
			(i.sku && i.sku.toLowerCase().includes(search.toLowerCase())) ||
			(i.location && i.location.toLowerCase().includes(search.toLowerCase())) ||
			(i.category?.name && i.category.name.toLowerCase().includes(search.toLowerCase()))
		)
	);

	function formatRupiah(n) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
	}
</script>

<svelte:head><title>Barang – InventarisApp</title></svelte:head>

<div class="space-y-4">
	<!-- Page Header & Breadcrumb -->
	<div class="flex items-center justify-between pb-2 border-b border-gray-200">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Barang <span class="text-sm text-gray-500 font-light">Data Barang</span>
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
			<span class="text-gray-400">Dashboard</span>
		</div>
	</div>

	<!-- Main Box -->
	<div class="bg-white shadow rounded-none border-t-4 border-[#00C0EF]">
		<div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
			<h3 class="font-normal text-gray-800 text-base">Barang</h3>
			<button onclick={openAdd} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded shadow-sm flex items-center gap-1 transition-colors">
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
				</svg>
				Tambah Barang
			</button>
		</div>

		<div class="p-4">
			<!-- Search & Batch -->
			<div class="mb-4 flex flex-wrap gap-3 items-center justify-end">
				{#if selectedIds.length > 0}
					<button onclick={() => showBatchModal = true}
						class="px-3 py-1.5 bg-[#F39C12] hover:bg-[#E08E0B] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-1 mr-auto">
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
						</svg>
						Update Stok ({selectedIds.length})
					</button>
				{/if}
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold text-gray-700">Search:</span>
					<input type="text" bind:value={search} class="border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm w-48" />
				</div>
			</div>

			<!-- Table AdminLTE Style -->
			<div class="overflow-x-auto">
				<table class="w-full text-sm text-left border border-gray-200">
					<thead class="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-xs">
						<tr>
							<th class="p-3 border-r border-gray-200 w-10 text-center">
								<input type="checkbox" 
									checked={selectedIds.length === filtered.length && filtered.length > 0}
									onchange={(e) => {
									const checked = e.target.checked;
									selectedIds = checked ? filtered.map((i) => i.id) : [];
									}}
								/>
							</th>
							<th class="p-3 border-r border-gray-200 w-12 text-center">NO</th>
							<th class="p-3 border-r border-gray-200">NAMA</th>
							<th class="p-3 border-r border-gray-200">SPESIFIKASI / LOKASI</th>
							<th class="p-3 border-r border-gray-200 text-center">JUMLAH</th>
							<th class="p-3 border-r border-gray-200">HARGA</th>
							<th class="p-3 border-r border-gray-200">JENIS</th>
							<th class="p-3 border-r border-gray-200">KETERANGAN</th>
							<th class="p-3 text-center w-24">OPSI</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each filtered as item, index (item.id)}
							<tr class="hover:bg-gray-50 text-gray-700">
								<td class="p-3 border-r border-gray-200 text-center">
									<input type="checkbox" 
										checked={selectedIds.includes(item.id)}
										onchange={() => {
											const idx = selectedIds.indexOf(item.id);
											if (idx > -1) selectedIds.splice(idx, 1);
											else selectedIds = [...selectedIds, item.id];
										}}
									/>
								</td>
								<td class="p-3 border-r border-gray-200 text-center">{index + 1}</td>
								<td class="p-3 border-r border-gray-200 font-semibold">{item.name}</td>
								<td class="p-3 border-r border-gray-200">
									<div>{item.sku || '-'}</div>
									<div class="text-xs text-gray-500">{item.location || '-'}</div>
								</td>
								<td class="p-3 border-r border-gray-200 text-center">
									{item.quantity}
									{#if item.quantity <= item.minStock}
										<div class="text-[10px] text-red-500 font-bold leading-none mt-1">LOW</div>
									{/if}
								</td>
								<td class="p-3 border-r border-gray-200">{formatRupiah(item.price)}</td>
								<td class="p-3 border-r border-gray-200">{item.category?.name || '-'}</td>
								<td class="p-3 border-r border-gray-200">{item.description || '-'}</td>
								<td class="p-3 text-center">
									<div class="flex items-center justify-center gap-1">
										<button type="button" onclick={() => openEdit(item)} class="bg-[#F39C12] hover:bg-[#E08E0B] text-white p-1.5 rounded shadow-sm" title="Edit">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
											</svg>
										</button>
										<button type="button" onclick={() => deleteItem(item.id)} class="bg-[#DD4B39] hover:bg-[#D73925] text-white p-1.5 rounded shadow-sm" title="Hapus">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="9" class="p-6 text-center text-gray-500">
									{search ? 'Data tidak ditemukan' : 'Tidak ada data barang.'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<div class="mt-4 flex justify-between items-center text-sm text-gray-600">
				<div>Showing 1 to {filtered.length} of {filtered.length} entries</div>
				<div class="flex border border-gray-300 rounded overflow-hidden">
					<button class="px-3 py-1 bg-white hover:bg-gray-50 text-gray-500 border-r border-gray-300 disabled:opacity-50" disabled>Previous</button>
					<button class="px-3 py-1 bg-[#3C8DBC] text-white font-medium">1</button>
					<button class="px-3 py-1 bg-white hover:bg-gray-50 text-gray-500 border-l border-gray-300 disabled:opacity-50" disabled>Next</button>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Modal Form AdminLTE Style -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-lg overflow-hidden">
			<div class="bg-[#3C8DBC] px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal">{editItem ? 'Edit Barang' : 'Tambah Barang'}</h4>
				<button type="button" onclick={() => showModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={save} class="p-5 space-y-4">
				{#if error}
					<div class="bg-red-50 text-red-600 p-2 text-sm border-l-2 border-red-500 mb-3">{error}</div>
				{/if}
				<div>
					<label for="name" class="block text-sm font-bold text-gray-700 mb-1">Nama Barang</label>
					<input id="name" type="text" bind:value={form.name} required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="sku" class="block text-sm font-bold text-gray-700 mb-1">Spesifikasi (SKU)</label>
						<input id="sku" type="text" bind:value={form.sku} class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div>
						<label for="location" class="block text-sm font-bold text-gray-700 mb-1">Lokasi</label>
						<input id="location" type="text" bind:value={form.location} class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
				</div>
				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="qty" class="block text-sm font-bold text-gray-700 mb-1">Jumlah</label>
						<input id="qty" type="number" bind:value={form.quantity} min="0" required disabled={editItem !== null} class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm disabled:bg-gray-100" />
					</div>
					<div>
						<label for="minStock" class="block text-sm font-bold text-gray-700 mb-1">Min Stok</label>
						<input id="minStock" type="number" bind:value={form.minStock} min="0" required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div>
						<label for="price" class="block text-sm font-bold text-gray-700 mb-1">Harga Satuan</label>
						<input id="price" type="number" bind:value={form.price} min="0" required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
				</div>
				<div>
					<label for="desc" class="block text-sm font-bold text-gray-700 mb-1">Keterangan / Sumber Dana</label>
					<textarea id="desc" bind:value={form.description} rows="2" class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm resize-none"></textarea>
				</div>
				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => showModal = false} class="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-sm font-medium rounded-sm">Batal</button>
					<button type="submit" disabled={loading} class="px-4 py-2 bg-[#3C8DBC] hover:bg-[#367FA9] text-white text-sm font-medium rounded-sm disabled:opacity-70">
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
				<h4 class="font-normal">Update Stok ({selectedIds.length} Barang)</h4>
				<button type="button" onclick={() => { showBatchModal = false; batchError = ''; }} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<div class="p-5 space-y-4">
				{#if batchError}
					<div class="bg-red-50 text-red-600 p-2 text-sm border-l-2 border-red-500">{batchError}</div>
				{/if}
				<div>
					<label class="block text-sm font-bold text-gray-700 mb-1">Mode Update</label>
					<div class="flex gap-4">
						<label class="flex items-center gap-1.5 text-sm">
							<input type="radio" bind:group={batchType} value="add" name="bType" /> Tambah (+)
						</label>
						<label class="flex items-center gap-1.5 text-sm">
							<input type="radio" bind:group={batchType} value="set" name="bType" /> Set (=)
						</label>
					</div>
				</div>
				<div>
					<label for="batchQty" class="block text-sm font-bold text-gray-700 mb-1">Jumlah</label>
					<input id="batchQty" type="number" bind:value={batchQuantity} min="0" required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#F39C12] rounded-sm" />
				</div>
				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => { showBatchModal = false; batchError = ''; }} class="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-sm font-medium rounded-sm">Batal</button>
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
						showBatchModal = false;
						selectedIds = [];
						await invalidateAll();
						items = d.items;
					}} disabled={batchLoading} class="px-4 py-2 bg-[#F39C12] hover:bg-[#E08E0B] text-white text-sm font-medium rounded-sm disabled:opacity-70">
						{batchLoading ? 'Memproses...' : 'Update Stok'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
