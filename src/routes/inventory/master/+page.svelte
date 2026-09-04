<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let { data } = $props();
	let categories = $derived(data.categories || []);
	let brands = $derived(data.brands || []);
	let locations = $derived(data.locations || []);
	let borrowers = $derived(data.borrowers || []);

	let activeTab = $state<'categories' | 'brands' | 'locations' | 'borrowers'>('categories');
	let search = $state('');

	// Modal State
	let showModal = $state(false);
	let modalType = $state<'category' | 'brand' | 'location' | 'borrower'>('category');
	let editItem: any = $state(null);
	let loading = $state(false);
	let error = $state('');

	// Form State
	let formName = $state('');
	let formDesc = $state('');
	let formType = $state('internal');
	let formDept = $state('');
	let formPhone = $state('');
	let formEmail = $state('');

	function openAdd(type: 'category' | 'brand' | 'location' | 'borrower') {
		modalType = type;
		editItem = null;
		formName = '';
		formDesc = '';
		formType = 'internal';
		formDept = '';
		formPhone = '';
		formEmail = '';
		error = '';
		showModal = true;
	}

	function openEdit(type: 'category' | 'brand' | 'location' | 'borrower', item: any) {
		modalType = type;
		editItem = item;
		formName = item.name;
		formDesc = item.description || '';
		formType = item.type || 'internal';
		formDept = item.department || '';
		formPhone = item.phone || '';
		formEmail = item.email || '';
		error = '';
		showModal = true;
	}

	async function save(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		let endpoint = '';
		let body: any = { name: formName };

		if (modalType === 'category') {
			endpoint = editItem ? `/api/categories/${editItem.id}` : '/api/categories';
			body.description = formDesc;
		} else if (modalType === 'brand') {
			endpoint = editItem ? `/api/brands/${editItem.id}` : '/api/brands';
			body.description = formDesc;
		} else if (modalType === 'location') {
			endpoint = editItem ? `/api/locations/${editItem.id}` : '/api/locations';
			body.description = formDesc;
		} else if (modalType === 'borrower') {
			endpoint = editItem ? `/api/borrowers/${editItem.id}` : '/api/borrowers';
			body.type = formType;
			body.department = formDept;
			body.phone = formPhone;
			body.email = formEmail;
		}

		const res = await fetch(endpoint, {
			method: editItem ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		const d = await res.json();
		loading = false;
		if (!res.ok) {
			error = d.error || 'Gagal menyimpan data';
			return;
		}

		toast.success('Data berhasil disimpan');
		showModal = false;
		await invalidateAll();
	}

	async function deleteItem(type: 'category' | 'brand' | 'location' | 'borrower', id: number) {
		if (!confirm('Yakin ingin menghapus data master ini?')) return;
		let endpoint = '';
		if (type === 'category') endpoint = `/api/categories/${id}`;
		else if (type === 'brand') endpoint = `/api/brands/${id}`;
		else if (type === 'location') endpoint = `/api/locations/${id}`;
		else if (type === 'borrower') endpoint = `/api/borrowers/${id}`;

		const res = await fetch(endpoint, { method: 'DELETE' });
		const d = await res.json();
		if (!res.ok) {
			toast.error(d.error || 'Gagal menghapus data');
			return;
		}
		toast.success('Data berhasil dihapus');
		await invalidateAll();
	}

	let filteredCategories = $derived(
		categories.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
	);
	let filteredBrands = $derived(
		brands.filter((b: any) => b.name.toLowerCase().includes(search.toLowerCase()))
	);
	let filteredLocations = $derived(
		locations.filter((l: any) => l.name.toLowerCase().includes(search.toLowerCase()))
	);
	let filteredBorrowers = $derived(
		borrowers.filter((b: any) => 
			b.name.toLowerCase().includes(search.toLowerCase()) ||
			(b.department && b.department.toLowerCase().includes(search.toLowerCase()))
		)
	);
</script>

<svelte:head><title>Master Data – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans">
	<!-- Page Header & Breadcrumb -->
	<div class="flex items-center justify-between pb-2 border-b border-gray-200">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Master Data <span class="text-sm text-gray-500 font-light">Kategori, Merek, Lokasi, dan Peminjam</span>
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
			<span class="text-gray-400">Master Data</span>
		</div>
	</div>

	<!-- Tabs Header -->
	<div class="flex border-b border-gray-200 bg-white">
		<button 
			onclick={() => { activeTab = 'categories'; search = ''; }}
			class="px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 {activeTab === 'categories' ? 'border-[#3C8DBC] text-[#3C8DBC] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900'}">
			<span>Kategori Barang & Aset</span>
			<span class="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{categories.length}</span>
		</button>
		<button 
			onclick={() => { activeTab = 'brands'; search = ''; }}
			class="px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 {activeTab === 'brands' ? 'border-[#3C8DBC] text-[#3C8DBC] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900'}">
			<span>Merek / Brand</span>
			<span class="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{brands.length}</span>
		</button>
		<button 
			onclick={() => { activeTab = 'locations'; search = ''; }}
			class="px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 {activeTab === 'locations' ? 'border-[#3C8DBC] text-[#3C8DBC] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900'}">
			<span>Lokasi / Ruangan</span>
			<span class="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{locations.length}</span>
		</button>
		<button 
			onclick={() => { activeTab = 'borrowers'; search = ''; }}
			class="px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 {activeTab === 'borrowers' ? 'border-[#3C8DBC] text-[#3C8DBC] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900'}">
			<span>Data Peminjam / Karyawan</span>
			<span class="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{borrowers.length}</span>
		</button>
	</div>

	<!-- Main Box AdminLTE Style -->
	<div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
		<div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
			<div>
				{#if activeTab === 'categories'}
					<button onclick={() => openAdd('category')} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
						Tambah Kategori
					</button>
				{:else if activeTab === 'brands'}
					<button onclick={() => openAdd('brand')} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
						Tambah Merek
					</button>
				{:else if activeTab === 'locations'}
					<button onclick={() => openAdd('location')} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
						Tambah Lokasi / Ruangan
					</button>
				{:else}
					<button onclick={() => openAdd('borrower')} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
						Tambah Data Peminjam
					</button>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold text-gray-700">Search:</span>
				<input type="text" bind:value={search} placeholder="Cari nama..." class="border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-[#3C8DBC] rounded-sm w-44" />
			</div>
		</div>

		<div class="p-4">
			{#if activeTab === 'categories'}
				<div class="overflow-x-auto border border-gray-200">
					<table class="w-full text-left border-collapse text-sm">
						<thead>
							<tr class="bg-gray-100 text-gray-700 border-b border-gray-200 text-xs">
								<th class="p-2.5 text-center w-12 font-bold border-r border-gray-200">NO</th>
								<th class="p-2.5 font-bold border-r border-gray-200">NAMA KATEGORI</th>
								<th class="p-2.5 font-bold border-r border-gray-200">DESKRIPSI</th>
								<th class="p-2.5 text-center font-bold border-r border-gray-200">BARANG KONSUMSI</th>
								<th class="p-2.5 text-center font-bold border-r border-gray-200">ASET TETAP</th>
								<th class="p-2.5 text-center font-bold">AKSI</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredCategories as item, idx}
								<tr class="hover:bg-gray-50">
									<td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
									<td class="p-2.5 font-bold text-gray-900 border-r border-gray-100">{item.name}</td>
									<td class="p-2.5 text-gray-600 text-xs border-r border-gray-100">{item.description || '-'}</td>
									<td class="p-2.5 text-center border-r border-gray-100">
										<span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-semibold">{item._count?.items ?? 0}</span>
									</td>
									<td class="p-2.5 text-center border-r border-gray-100">
										<span class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-semibold">{item._count?.assets ?? 0}</span>
									</td>
									<td class="p-2.5 text-center">
										<div class="flex items-center justify-center gap-2">
											<button onclick={() => openEdit('category', item)} title="Edit" aria-label="Edit Kategori" class="text-blue-600 hover:text-blue-800 p-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
											</button>
											<button onclick={() => deleteItem('category', item.id)} title="Hapus" aria-label="Hapus Kategori" class="text-red-600 hover:text-red-800 p-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{:else}
								<tr><td colspan="6" class="p-6 text-center text-gray-500">Belum ada kategori.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

			{:else if activeTab === 'brands'}
				<div class="overflow-x-auto border border-gray-200">
					<table class="w-full text-left border-collapse text-sm">
						<thead>
							<tr class="bg-gray-100 text-gray-700 border-b border-gray-200 text-xs">
								<th class="p-2.5 text-center w-12 font-bold border-r border-gray-200">NO</th>
								<th class="p-2.5 font-bold border-r border-gray-200">NAMA MEREK</th>
								<th class="p-2.5 font-bold border-r border-gray-200">DESKRIPSI</th>
								<th class="p-2.5 text-center font-bold border-r border-gray-200">TOTAL ASET</th>
								<th class="p-2.5 text-center font-bold">AKSI</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredBrands as item, idx}
								<tr class="hover:bg-gray-50">
									<td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
									<td class="p-2.5 font-bold text-gray-900 border-r border-gray-100">{item.name}</td>
									<td class="p-2.5 text-gray-600 text-xs border-r border-gray-100">{item.description || '-'}</td>
									<td class="p-2.5 text-center border-r border-gray-100">
										<span class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-semibold">{item._count?.assets ?? 0} unit</span>
									</td>
									<td class="p-2.5 text-center">
										<div class="flex items-center justify-center gap-2">
											<button onclick={() => openEdit('brand', item)} title="Edit Merek" aria-label="Edit Merek" class="text-blue-600 hover:text-blue-800 p-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
											</button>
											<button onclick={() => deleteItem('brand', item.id)} title="Hapus Merek" aria-label="Hapus Merek" class="text-red-600 hover:text-red-800 p-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{:else}
								<tr><td colspan="5" class="p-6 text-center text-gray-500">Belum ada merek terdaftar.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

			{:else if activeTab === 'locations'}
				<div class="overflow-x-auto border border-gray-200">
					<table class="w-full text-left border-collapse text-sm">
						<thead>
							<tr class="bg-gray-100 text-gray-700 border-b border-gray-200 text-xs">
								<th class="p-2.5 text-center w-12 font-bold border-r border-gray-200">NO</th>
								<th class="p-2.5 font-bold border-r border-gray-200">NAMA LOKASI / RUANGAN</th>
								<th class="p-2.5 font-bold border-r border-gray-200">KETERANGAN RUANGAN</th>
								<th class="p-2.5 text-center font-bold border-r border-gray-200">ASET DITEMPATKAN</th>
								<th class="p-2.5 text-center font-bold">AKSI</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredLocations as item, idx}
								<tr class="hover:bg-gray-50">
									<td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
									<td class="p-2.5 font-bold text-gray-900 border-r border-gray-100">{item.name}</td>
									<td class="p-2.5 text-gray-600 text-xs border-r border-gray-100">{item.description || '-'}</td>
									<td class="p-2.5 text-center border-r border-gray-100">
										<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-semibold">{item._count?.assets ?? 0} unit</span>
									</td>
									<td class="p-2.5 text-center">
										<div class="flex items-center justify-center gap-2">
											<button onclick={() => openEdit('location', item)} title="Edit Lokasi" aria-label="Edit Lokasi" class="text-blue-600 hover:text-blue-800 p-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
											</button>
											<button onclick={() => deleteItem('location', item.id)} title="Hapus Lokasi" aria-label="Hapus Lokasi" class="text-red-600 hover:text-red-800 p-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{:else}
								<tr><td colspan="5" class="p-6 text-center text-gray-500">Belum ada lokasi/ruangan.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

			{:else}
				<div class="overflow-x-auto border border-gray-200">
					<table class="w-full text-left border-collapse text-sm">
						<thead>
							<tr class="bg-gray-100 text-gray-700 border-b border-gray-200 text-xs">
								<th class="p-2.5 text-center w-12 font-bold border-r border-gray-200">NO</th>
								<th class="p-2.5 font-bold border-r border-gray-200">NAMA PEMINJAM</th>
								<th class="p-2.5 font-bold border-r border-gray-200">TIPE</th>
								<th class="p-2.5 font-bold border-r border-gray-200">DEPARTEMEN / DIVISI</th>
								<th class="p-2.5 font-bold border-r border-gray-200">KONTAK (TELP/EMAIL)</th>
								<th class="p-2.5 text-center font-bold border-r border-gray-200">PINJAM AKTIF</th>
								<th class="p-2.5 text-center font-bold">AKSI</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredBorrowers as item, idx}
								<tr class="hover:bg-gray-50">
									<td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
									<td class="p-2.5 font-bold text-gray-900 border-r border-gray-100">{item.name}</td>
									<td class="p-2.5 border-r border-gray-100 text-xs">
										<span class="inline-block px-2 py-0.5 rounded font-semibold {item.type === 'internal' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}">
											{item.type === 'internal' ? 'Karyawan Internal' : 'Pihak Eksternal'}
										</span>
									</td>
									<td class="p-2.5 text-gray-700 border-r border-gray-100 text-xs">{item.department || '-'}</td>
									<td class="p-2.5 text-gray-600 border-r border-gray-100 text-xs">
										<div>{item.phone || '-'}</div>
										{#if item.email}<div class="text-gray-400">{item.email}</div>{/if}
									</td>
									<td class="p-2.5 text-center border-r border-gray-100">
										{#if item.loans && item.loans.length > 0}
											<span class="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-xs">
												{item.loans.length} item aktif
											</span>
										{:else}
											<span class="text-gray-400 text-xs">Tidak ada</span>
										{/if}
									</td>
									<td class="p-2.5 text-center">
										<div class="flex items-center justify-center gap-2">
											<button onclick={() => openEdit('borrower', item)} title="Edit Peminjam" aria-label="Edit Peminjam" class="text-blue-600 hover:text-blue-800 p-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
											</button>
											<button onclick={() => deleteItem('borrower', item.id)} title="Hapus Peminjam" aria-label="Hapus Peminjam" class="text-red-600 hover:text-red-800 p-1">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{:else}
								<tr><td colspan="7" class="p-6 text-center text-gray-500">Belum ada data peminjam/karyawan.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Modal Tambah / Edit Master Data -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-md overflow-hidden">
			<div class="bg-[#3C8DBC] px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal text-sm">
					{editItem ? 'Edit Data' : 'Tambah Data'} 
					{#if modalType === 'category'}Kategori{:else if modalType === 'brand'}Merek{:else if modalType === 'location'}Lokasi / Ruangan{:else}Peminjam / Karyawan{/if}
				</h4>
				<button type="button" aria-label="Close" onclick={() => showModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={save} class="p-5 space-y-3">
				{#if error}
					<div class="bg-red-50 text-red-600 p-2 text-xs border-l-2 border-red-500">{error}</div>
				{/if}

				<div>
					<label for="fName" class="block text-xs font-bold text-gray-700 mb-1">
						{#if modalType === 'borrower'}Nama Peminjam / Karyawan *{:else}Nama *{/if}
					</label>
					<input id="fName" type="text" bind:value={formName} required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>

				{#if modalType === 'borrower'}
					<div>
						<label for="fType" class="block text-xs font-bold text-gray-700 mb-1">Tipe Peminjam</label>
						<select id="fType" bind:value={formType} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
							<option value="internal">Karyawan Internal</option>
							<option value="external">Pihak Luar / Eksternal</option>
						</select>
					</div>
					<div>
						<label for="fDept" class="block text-xs font-bold text-gray-700 mb-1">Departemen / Divisi / Instansi</label>
						<input id="fDept" type="text" bind:value={formDept} placeholder="Contoh: IT, HR, Marketing" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="fPhone" class="block text-xs font-bold text-gray-700 mb-1">No. WhatsApp / HP</label>
							<input id="fPhone" type="text" bind:value={formPhone} placeholder="08..." class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
						</div>
						<div>
							<label for="fEmail" class="block text-xs font-bold text-gray-700 mb-1">Email</label>
							<input id="fEmail" type="email" bind:value={formEmail} placeholder="user@company.com" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
						</div>
					</div>
				{:else}
					<div>
						<label for="fDesc" class="block text-xs font-bold text-gray-700 mb-1">Deskripsi / Keterangan</label>
						<textarea id="fDesc" bind:value={formDesc} rows="2" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm resize-none"></textarea>
					</div>
				{/if}

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
