<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { jsPDF } from 'jspdf';
	import autoTable from 'jspdf-autotable';
	import * as XLSX from 'xlsx';
	import { calculateStraightLineDepreciation, formatRupiah } from '$lib/depreciation';
	import QuickAssetLookupModal from '$lib/components/QuickAssetLookupModal.svelte';

	let { data } = $props();
	let assets = $derived(data.assets);
	let categories = $derived(data.categories || []);
	let brands = $derived(data.brands || []);
	let locations = $derived(data.locations || []);
	let suppliers = $derived(data.suppliers || []);
	let stats = $derived(data.stats);
	let pagination = $derived(data.pagination || { page: 1, limit: 20, total: assets.length, totalPages: 1 });

	// Filter state
	let search = $state('');
	let categoryFilter = $state('');
	let locationFilter = $state('');
	let conditionFilter = $state('');
	let statusFilter = $state('');

	$effect(() => {
		search = data.filters.search || '';
		categoryFilter = data.filters.categoryId || '';
		locationFilter = data.filters.locationId || '';
		conditionFilter = data.filters.condition || '';
		statusFilter = data.filters.status || '';
	});

	let searchTimeout: any;
	function applyFilters() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const url = new URL($page.url);
			if (search) url.searchParams.set('search', search); else url.searchParams.delete('search');
			if (categoryFilter) url.searchParams.set('categoryId', categoryFilter); else url.searchParams.delete('categoryId');
			if (locationFilter) url.searchParams.set('locationId', locationFilter); else url.searchParams.delete('locationId');
			if (conditionFilter) url.searchParams.set('condition', conditionFilter); else url.searchParams.delete('condition');
			if (statusFilter) url.searchParams.set('status', statusFilter); else url.searchParams.delete('status');
			url.searchParams.set('page', '1');
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}, 300);
	}

	function resetFilters() {
		search = '';
		categoryFilter = '';
		locationFilter = '';
		conditionFilter = '';
		statusFilter = '';
		goto('/inventory/assets');
	}

	function goToPage(p: number) {
		if (p < 1 || p > pagination.totalPages) return;
		const url = new URL($page.url);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { noScroll: true });
	}

	// Modal State
	let showModal = $state(false);
	let editAsset: any = $state(null);
	let loading = $state(false);
	let error = $state('');

	// Quick Lookup & Depreciation Modal States
	let showQuickLookup = $state(false);
	let showDepreciationModal = $state(false);
	let activeDepAsset = $state<any>(null);

	let form = $state({
		assetCode: '',
		serialNumber: '',
		name: '',
		condition: 'BAIK',
		status: 'TERSEDIA',
		pic: '',
		purchaseDate: '',
		price: 0,
		salvageValue: 0,
		usefulLifeMonths: 60,
		description: '',
		categoryId: '',
		brandId: '',
		locationId: '',
		supplierId: ''
	});

	function openAdd() {
		editAsset = null;
		form = {
			assetCode: `AST-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
			serialNumber: '',
			name: '',
			condition: 'BAIK',
			status: 'TERSEDIA',
			pic: '',
			purchaseDate: new Date().toISOString().split('T')[0],
			price: 0,
			salvageValue: 0,
			usefulLifeMonths: 60,
			description: '',
			categoryId: '',
			brandId: '',
			locationId: '',
			supplierId: ''
		};
		error = '';
		showModal = true;
	}

	function openEdit(asset: any) {
		editAsset = asset;
		form = {
			assetCode: asset.assetCode,
			serialNumber: asset.serialNumber || '',
			name: asset.name,
			condition: asset.condition || 'BAIK',
			status: asset.status || 'TERSEDIA',
			pic: asset.pic || '',
			purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
			price: asset.price || 0,
			salvageValue: asset.salvageValue || 0,
			usefulLifeMonths: asset.usefulLifeMonths || 60,
			description: asset.description || '',
			categoryId: asset.categoryId ? asset.categoryId.toString() : '',
			brandId: asset.brandId ? asset.brandId.toString() : '',
			locationId: asset.locationId ? asset.locationId.toString() : '',
			supplierId: asset.supplierId ? asset.supplierId.toString() : ''
		};
		error = '';
		showModal = true;
	}

	function openDepreciationModal(asset: any) {
		activeDepAsset = asset;
		showDepreciationModal = true;
	}

	async function save(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		const url = editAsset ? `/api/assets/${editAsset.id}` : '/api/assets';
		const method = editAsset ? 'PUT' : 'POST';

		const payload: any = {
			...form,
			price: form.price ? parseFloat(form.price.toString()) : null,
			salvageValue: form.salvageValue ? parseFloat(form.salvageValue.toString()) : 0,
			usefulLifeMonths: form.usefulLifeMonths ? parseInt(form.usefulLifeMonths.toString()) : 60,
			purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : null,
			categoryId: form.categoryId ? parseInt(form.categoryId) : null,
			brandId: form.brandId ? parseInt(form.brandId) : null,
			locationId: form.locationId ? parseInt(form.locationId) : null,
			supplierId: form.supplierId ? parseInt(form.supplierId) : null
		};

		const res = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		const d = await res.json();
		loading = false;
		if (!res.ok) {
			error = d.error || 'Gagal menyimpan aset';
			return;
		}

		toast.success(editAsset ? 'Aset berhasil diperbarui' : 'Aset berhasil dicatat ke Buku Induk');
		showModal = false;
		await invalidateAll();
	}

	async function deleteAsset(id: number) {
		if (!confirm('Yakin ingin menghapus aset ini dari Buku Induk?')) return;
		const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
		const d = await res.json();
		if (!res.ok) {
			toast.error(d.error || 'Gagal menghapus aset');
			return;
		}
		toast.success('Aset berhasil dihapus');
		await invalidateAll();
	}

	// Modal Mutasi Aset (Perpindahan Lokasi / PIC)
	let showMoveModal = $state(false);
	let movingAsset: any = $state(null);
	let moveLoading = $state(false);
	let moveError = $state('');
	let moveForm = $state({
		toLocationId: '',
		toPic: '',
		reason: ''
	});

	function openMove(asset: any) {
		movingAsset = asset;
		moveForm = {
			toLocationId: asset.locationId ? asset.locationId.toString() : '',
			toPic: asset.pic || '',
			reason: ''
		};
		moveError = '';
		showMoveModal = true;
	}

	async function submitMove(e: Event) {
		e.preventDefault();
		if (!movingAsset) return;
		moveLoading = true;
		moveError = '';

		const res = await fetch(`/api/assets/${movingAsset.id}/move`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(moveForm)
		});

		const d = await res.json();
		moveLoading = false;
		if (!res.ok) {
			moveError = d.error || 'Gagal memproses mutasi perpindahan aset';
			return;
		}

		toast.success('Mutasi / perpindahan aset berhasil dicatat!');
		showMoveModal = false;
		await invalidateAll();
	}

	// Modal Detail & Riwayat Aset
	let showDetailModal = $state(false);
	let detailAsset: any = $state(null);
	let detailLoading = $state(false);

	async function openDetail(assetId: number) {
		detailLoading = true;
		showDetailModal = true;
		try {
			const res = await fetch(`/api/assets/${assetId}`);
			if (res.ok) {
				detailAsset = await res.json();
			} else {
				toast.error('Gagal mengambil detail aset');
				showDetailModal = false;
			}
		} catch (err) {
			toast.error('Terjadi kesalahan');
			showDetailModal = false;
		}
		detailLoading = false;
	}

	function formatDate(d: string | Date | null | undefined) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	// EXPORT EXCEL
	function exportExcel() {
		const wsData = [
			['NO', 'KODE ASET', 'SERIAL NUMBER', 'NAMA ASET', 'KATEGORI', 'MEREK', 'LOKASI', 'PIC', 'TGL PEROLEHAN', 'NILAI (RP)', 'KONDISI', 'STATUS', 'SUPPLIER'],
			...assets.map((a: any, idx: number) => [
				idx + 1,
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
				a.status,
				a.supplier?.name || '-'
			])
		];

		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.aoa_to_sheet(wsData);
		XLSX.utils.book_append_sheet(wb, ws, 'Buku Induk Aset');
		XLSX.writeFile(wb, `Buku_Induk_Aset_${new Date().toISOString().split('T')[0]}.xlsx`);
		toast.success('Buku Induk Inventaris berhasil diexport ke Excel');
	}

	// EXPORT PDF
	function exportPDF() {
		const doc = new jsPDF('landscape');
		doc.setFontSize(14);
		doc.text('BUKU INDUK INVENTARIS (HOUSEHOLD REGISTER)', 14, 15);
		doc.setFontSize(10);
		doc.text(`Dicetak tanggal: ${new Date().toLocaleDateString('id-ID')} | Total Aset: ${assets.length}`, 14, 22);

		const tableData = assets.map((a: any, idx: number) => [
			idx + 1,
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
			startY: 26,
			head: [['NO', 'KODE ASET', 'NAMA ASET', 'KATEGORI', 'LOKASI', 'PIC', 'TGL BELI', 'NILAI', 'KONDISI', 'STATUS']],
			body: tableData,
			styles: { fontSize: 8 }
		});

		doc.save(`Buku_Induk_Aset_${new Date().toISOString().split('T')[0]}.pdf`);
		toast.success('Buku Induk Inventaris berhasil diexport ke PDF');
	}
</script>

<svelte:head><title>Buku Induk Inventaris (Household Register) – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans">
	<!-- Page Header & Breadcrumb -->
	<div class="flex flex-wrap items-center justify-between pb-2 border-b border-gray-200 gap-2">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Buku Induk Inventaris <span class="text-sm text-gray-500 font-light">Household Register (Aset Tetap)</span>
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
			<span class="text-gray-400">Buku Induk</span>
		</div>
	</div>

	<!-- KPI Summary Widgets AdminLTE Style -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
		<div class="bg-[#00C0EF] text-white p-3.5 rounded-none shadow-sm flex items-center justify-between">
			<div>
				<div class="text-2xl font-bold">{stats.total}</div>
				<div class="text-[11px] uppercase font-semibold">Total Unit Aset</div>
			</div>
			<svg class="w-8 h-8 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
		</div>
		<div class="bg-[#00A65A] text-white p-3.5 rounded-none shadow-sm flex items-center justify-between">
			<div>
				<div class="text-2xl font-bold">{stats.countAvailable}</div>
				<div class="text-[11px] uppercase font-semibold">Aset Tersedia</div>
			</div>
			<svg class="w-8 h-8 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
		</div>
		<div class="bg-[#F39C12] text-white p-3.5 rounded-none shadow-sm flex items-center justify-between">
			<div>
				<div class="text-2xl font-bold">{stats.countLoaned}</div>
				<div class="text-[11px] uppercase font-semibold">Sedang Dipinjam</div>
			</div>
			<svg class="w-8 h-8 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
		</div>
		<div class="bg-amber-600 text-white p-3.5 rounded-none shadow-sm flex items-center justify-between">
			<div>
				<div class="text-2xl font-bold">{stats.countMaintenance || 0}</div>
				<div class="text-[11px] uppercase font-semibold">Under Maintenance</div>
			</div>
			<svg class="w-8 h-8 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
		</div>
		<div class="bg-[#DD4B39] text-white p-3.5 rounded-none shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
			<div>
				<div class="text-2xl font-bold">{stats.countDamaged}</div>
				<div class="text-[11px] uppercase font-semibold">Rusak / Hilang</div>
			</div>
			<svg class="w-8 h-8 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
		</div>
	</div>

	<!-- Main Table Box AdminLTE Style -->
	<div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
		<!-- Header Actions -->
		<div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<button onclick={openAdd} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
					Catat Aset Baru
				</button>
				<button onclick={() => showQuickLookup = true} class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
					Quick Scan Aset
				</button>
				<button onclick={exportExcel} class="bg-[#00A65A] hover:bg-[#008D4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
					Export Excel
				</button>
				<button onclick={exportPDF} class="bg-[#DD4B39] hover:bg-[#C23321] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
					Export PDF
				</button>
			</div>

			<div class="text-xs text-gray-500">
				Total Nilai Aset: <span class="font-bold text-gray-800 font-mono">{formatRupiah(stats.totalAssetValue)}</span>
			</div>
		</div>

		<!-- Filter Bar -->
		<div class="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-3 text-xs">
			<div class="flex-1 min-w-[180px]">
				<input 
					type="text" 
					bind:value={search} 
					oninput={applyFilters} 
					placeholder="Cari nama, kode aset, SN, PIC..." 
					class="w-full border border-gray-300 px-2.5 py-1.5 text-xs rounded-sm focus:outline-none focus:border-[#3C8DBC]"
				/>
			</div>
			<div>
				<select bind:value={categoryFilter} onchange={applyFilters} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
					<option value="">Semua Kategori</option>
					{#each categories as cat}
						<option value={cat.id.toString()}>{cat.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<select bind:value={locationFilter} onchange={applyFilters} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
					<option value="">Semua Lokasi / Ruangan</option>
					{#each locations as loc}
						<option value={loc.id.toString()}>{loc.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<select bind:value={conditionFilter} onchange={applyFilters} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
					<option value="">Semua Kondisi</option>
					<option value="BAIK">Baik</option>
					<option value="RUSAK_RINGAN">Rusak Ringan</option>
					<option value="RUSAK_BERAT">Rusak Berat</option>
					<option value="HILANG">Hilang</option>
				</select>
			</div>
			<div>
				<select bind:value={statusFilter} onchange={applyFilters} class="border border-gray-300 px-2 py-1.5 text-xs rounded-sm bg-white">
					<option value="">Semua Status</option>
					<option value="TERSEDIA">Tersedia</option>
					<option value="DIPINJAM">Dipinjam</option>
					<option value="UNDER_MAINTENANCE">Under Maintenance</option>
					<option value="MUTASI">Mutasi</option>
					<option value="AFKIR">Afkir</option>
				</select>
			</div>
			{#if search || categoryFilter || locationFilter || conditionFilter || statusFilter}
				<button onclick={resetFilters} class="text-red-600 hover:underline font-semibold">
					Reset Filter
				</button>
			{/if}
		</div>

		<!-- Table -->
		<div class="p-4">
			<div class="overflow-x-auto border border-gray-200">
				<table class="w-full text-left border-collapse text-sm">
					<thead>
						<tr class="bg-gray-100 text-gray-700 border-b border-gray-200 text-xs">
							<th class="p-2.5 text-center w-10 font-bold border-r border-gray-200">NO</th>
							<th class="p-2.5 font-bold border-r border-gray-200">KODE & SN</th>
							<th class="p-2.5 font-bold border-r border-gray-200">NAMA ASET</th>
							<th class="p-2.5 font-bold border-r border-gray-200">KATEGORI / MEREK</th>
							<th class="p-2.5 font-bold border-r border-gray-200">LOKASI / RUANGAN</th>
							<th class="p-2.5 font-bold border-r border-gray-200">PENANGGUNG JAWAB (PIC)</th>
							<th class="p-2.5 text-right font-bold border-r border-gray-200">NILAI BUKU KINI</th>
							<th class="p-2.5 text-center font-bold border-r border-gray-200">KONDISI</th>
							<th class="p-2.5 text-center font-bold border-r border-gray-200">STATUS</th>
							<th class="p-2.5 text-center font-bold">AKSI</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each assets as asset, idx}
							{@const dep = calculateStraightLineDepreciation(asset.price, asset.salvageValue, asset.usefulLifeMonths, asset.purchaseDate)}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="p-2.5 text-center text-gray-500 border-r border-gray-100">
									{((pagination.page - 1) * pagination.limit) + idx + 1}
								</td>
								<td class="p-2.5 border-r border-gray-100">
									<span class="font-mono font-bold text-xs text-[#3C8DBC] block">{asset.assetCode}</span>
									<span class="font-mono text-[11px] text-gray-400 block">{asset.serialNumber ? `SN: ${asset.serialNumber}` : 'Tanpa SN'}</span>
								</td>
								<td class="p-2.5 font-medium text-gray-900 border-r border-gray-100">
									<button onclick={() => openDetail(asset.id)} class="text-left font-semibold hover:text-[#3C8DBC] hover:underline">
										{asset.name}
									</button>
									<span class="text-xs text-gray-400 block font-mono mt-0.5">{formatRupiah(asset.price)}</span>
								</td>
								<td class="p-2.5 text-xs text-gray-600 border-r border-gray-100">
									<span class="font-medium text-gray-800 block">{asset.category?.name || '-'}</span>
									<span class="text-gray-400 block">{asset.brand?.name || '-'}</span>
								</td>
								<td class="p-2.5 text-xs border-r border-gray-100 font-semibold text-gray-700">
									{asset.location?.name || 'Belum diatur'}
								</td>
								<td class="p-2.5 text-xs border-r border-gray-100 text-gray-700">
									{asset.pic || '-'}
								</td>
								<td class="p-2.5 text-right border-r border-gray-100">
									<span class="font-bold text-xs text-emerald-700 font-mono block">{formatRupiah(dep.currentBookValue)}</span>
									<span class="text-[10px] text-gray-400 block font-mono">Susut: {formatRupiah(dep.accumulatedDepreciation)}</span>
								</td>
								<td class="p-2.5 text-center border-r border-gray-100">
									{#if asset.condition === 'BAIK'}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">BAIK</span>
									{:else if asset.condition === 'RUSAK_RINGAN'}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-800">RUSAK RINGAN</span>
									{:else if asset.condition === 'RUSAK_BERAT'}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800">RUSAK BERAT</span>
									{:else}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">HILANG</span>
									{/if}
								</td>
								<td class="p-2.5 text-center border-r border-gray-100">
									{#if asset.status === 'TERSEDIA'}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white">TERSEDIA</span>
									{:else if asset.status === 'DIPINJAM'}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white">DIPINJAM</span>
									{:else if asset.status === 'UNDER_MAINTENANCE'}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white">MAINTENANCE</span>
									{:else if asset.status === 'MUTASI'}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-purple-600 text-white">MUTASI</span>
									{:else}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-gray-500 text-white">AFKIR</span>
									{/if}
								</td>
								<td class="p-2.5 text-center">
									<div class="flex items-center justify-center gap-1">
										<!-- Tombol Hitung Depresiasi & Servis -->
										<button onclick={() => openDepreciationModal(asset)} title="Kalkulator Depresiasi & Valuasi" class="text-indigo-600 hover:text-indigo-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
										</button>
										<!-- Tombol Mutasi Perpindahan -->
										<button onclick={() => openMove(asset)} title="Mutasi / Pindah Lokasi & PIC" class="text-purple-600 hover:text-purple-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
										</button>
										<!-- Tombol Detail & Riwayat -->
										<button onclick={() => openDetail(asset.id)} title="Detail & Riwayat Mutasi" class="text-teal-600 hover:text-teal-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
										</button>
										<!-- Cetak Label QR / Barcode -->
										<a href={`/api/label?assetId=${asset.id}`} target="_blank" title="Cetak Label Aset" class="text-emerald-600 hover:text-emerald-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
										</a>
										<!-- Edit -->
										<button onclick={() => openEdit(asset)} title="Edit Aset" class="text-blue-600 hover:text-blue-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
										</button>
										<!-- Hapus -->
										<button onclick={() => deleteAsset(asset.id)} title="Hapus Aset" class="text-red-600 hover:text-red-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="9" class="p-8 text-center text-gray-500">
									Belum ada aset tetap tercatat dalam Buku Induk Inventaris.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="mt-4 flex flex-wrap justify-between items-center text-sm text-gray-600 gap-2">
				<div>
					Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} unit
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

<!-- MODAL TAMBAH / EDIT ASET -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
			<div class="bg-[#3C8DBC] px-4 py-3 flex items-center justify-between text-white flex-shrink-0">
				<h4 class="font-normal">{editAsset ? 'Edit Data Aset (Buku Induk)' : 'Pencatatan Aset Baru (Buku Induk)'}</h4>
				<button type="button" aria-label="Close" onclick={() => showModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={save} class="p-5 space-y-3 overflow-y-auto">
				{#if error}
					<div class="bg-red-50 text-red-600 p-2 text-sm border-l-2 border-red-500">{error}</div>
				{/if}

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="assetCode" class="block text-xs font-bold text-gray-700 mb-1">Kode Inventaris / Tag Aset *</label>
						<input id="assetCode" type="text" bind:value={form.assetCode} required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm font-mono" />
					</div>
					<div>
						<label for="serialNumber" class="block text-xs font-bold text-gray-700 mb-1">Serial Number (SN)</label>
						<input id="serialNumber" type="text" bind:value={form.serialNumber} placeholder="SN Pabrikan / Perangkat" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm font-mono" />
					</div>
				</div>

				<div>
					<label for="name" class="block text-xs font-bold text-gray-700 mb-1">Nama Aset / Barang *</label>
					<input id="name" type="text" bind:value={form.name} required placeholder="Contoh: Laptop ThinkPad T14 Gen 3" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>

				<div class="grid grid-cols-3 gap-3">
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
						<label for="brand" class="block text-xs font-bold text-gray-700 mb-1">Merek / Brand</label>
						<select id="brand" bind:value={form.brandId} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
							<option value="">-- Pilih Merek --</option>
							{#each brands as b}
								<option value={b.id.toString()}>{b.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="location" class="block text-xs font-bold text-gray-700 mb-1">Lokasi Penempatan</label>
						<select id="location" bind:value={form.locationId} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
							<option value="">-- Pilih Ruangan/Lokasi --</option>
							{#each locations as loc}
								<option value={loc.id.toString()}>{loc.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="pic" class="block text-xs font-bold text-gray-700 mb-1">Penanggung Jawab (PIC)</label>
						<input id="pic" type="text" bind:value={form.pic} placeholder="Nama karyawan / staf penanggung jawab" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div>
						<label for="supplier" class="block text-xs font-bold text-gray-700 mb-1">Vendor / Asal Usul Perolehan</label>
						<select id="supplier" bind:value={form.supplierId} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
							<option value="">-- Pilih Supplier/Vendor --</option>
							{#each suppliers as sup}
								<option value={sup.id.toString()}>{sup.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="purchaseDate" class="block text-xs font-bold text-gray-700 mb-1">Tanggal Perolehan</label>
						<input id="purchaseDate" type="date" bind:value={form.purchaseDate} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div>
						<label for="price" class="block text-xs font-bold text-gray-700 mb-1">Nilai Perolehan / Harga (Rp)</label>
						<input id="price" type="number" bind:value={form.price} min="0" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-200">
					<div>
						<label for="salvageValue" class="block text-[11px] font-bold text-gray-700 mb-1">Nilai Sisa / Residu (Rp)</label>
						<input id="salvageValue" type="number" bind:value={form.salvageValue} min="0" placeholder="0" class="w-full border border-gray-300 px-2.5 py-1 text-xs focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white" />
					</div>
					<div>
						<label for="usefulLifeMonths" class="block text-[11px] font-bold text-gray-700 mb-1">Masa Manfaat (Bulan)</label>
						<input id="usefulLifeMonths" type="number" bind:value={form.usefulLifeMonths} min="1" placeholder="60 (5 tahun)" class="w-full border border-gray-300 px-2.5 py-1 text-xs focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="condition" class="block text-xs font-bold text-gray-700 mb-1">Kondisi Fisik Aset</label>
						<select id="condition" bind:value={form.condition} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white font-semibold">
							<option value="BAIK">Baik</option>
							<option value="RUSAK_RINGAN">Rusak Ringan</option>
							<option value="RUSAK_BERAT">Rusak Berat</option>
							<option value="HILANG">Hilang</option>
						</select>
					</div>
					<div>
						<label for="status" class="block text-xs font-bold text-gray-700 mb-1">Status Ketersediaan</label>
						<select id="status" bind:value={form.status} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white font-semibold">
							<option value="TERSEDIA">Tersedia</option>
							<option value="DIPINJAM">Dipinjam</option>
							<option value="UNDER_MAINTENANCE">Dalam Pemeliharaan (UNDER_MAINTENANCE)</option>
							<option value="MUTASI">Mutasi</option>
							<option value="AFKIR">Afkir</option>
						</select>
					</div>
				</div>

				<div>
					<label for="desc" class="block text-xs font-bold text-gray-700 mb-1">Keterangan / Spesifikasi</label>
					<textarea id="desc" bind:value={form.description} rows="2" placeholder="Catatan spesifikasi, kelengkapan, dll" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm resize-none"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-gray-100 flex-shrink-0">
					<button type="button" onclick={() => showModal = false} class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-medium rounded-sm">Batal</button>
					<button type="submit" disabled={loading} class="px-4 py-1.5 bg-[#3C8DBC] hover:bg-[#367FA9] text-white text-xs font-semibold rounded-sm disabled:opacity-70">
						{loading ? 'Menyimpan...' : 'Simpan ke Buku Induk'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL MUTASI PERPINDAHAN ASET (LOKASI / PIC) -->
{#if showMoveModal && movingAsset}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-md overflow-hidden">
			<div class="bg-purple-700 px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal text-sm">Mutasi / Perpindahan Aset</h4>
				<button type="button" aria-label="Close" onclick={() => showMoveModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={submitMove} class="p-5 space-y-3">
				{#if moveError}
					<div class="bg-red-50 text-red-600 p-2 text-xs border-l-2 border-red-500">{moveError}</div>
				{/if}
				<div class="bg-purple-50 p-3 rounded text-xs border border-purple-100 space-y-1">
					<div class="font-bold text-purple-900">{movingAsset.name} ({movingAsset.assetCode})</div>
					<div class="text-purple-700">Lokasi Sekarang: <strong>{movingAsset.location?.name || 'Belum diatur'}</strong></div>
					<div class="text-purple-700">PIC Sekarang: <strong>{movingAsset.pic || 'Belum ada'}</strong></div>
				</div>

				<div>
					<label for="toLoc" class="block text-xs font-bold text-gray-700 mb-1">Pindah ke Lokasi / Ruangan Baru</label>
					<select id="toLoc" bind:value={moveForm.toLocationId} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-purple-600 rounded-sm bg-white">
						<option value="">-- Tetap Lokasi Saat Ini --</option>
						{#each locations as loc}
							<option value={loc.id.toString()}>{loc.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="toPic" class="block text-xs font-bold text-gray-700 mb-1">Diserahkan ke PIC Baru</label>
					<input id="toPic" type="text" bind:value={moveForm.toPic} placeholder="Nama penanggung jawab baru" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-purple-600 rounded-sm" />
				</div>

				<div>
					<label for="moveReason" class="block text-xs font-bold text-gray-700 mb-1">Alasan Perpindahan / Mutasi *</label>
					<textarea id="moveReason" bind:value={moveForm.reason} required rows="2" placeholder="Contoh: Dipindahkan untuk kebutuhan divisi marketing" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-purple-600 rounded-sm resize-none"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
					<button type="button" onclick={() => showMoveModal = false} class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-medium rounded-sm">Batal</button>
					<button type="submit" disabled={moveLoading} class="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-sm disabled:opacity-70">
						{moveLoading ? 'Memproses...' : 'Catat Perpindahan'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL DETAIL & RIWAYAT ASET -->
{#if showDetailModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
			<div class="bg-teal-700 px-4 py-3 flex items-center justify-between text-white flex-shrink-0">
				<h4 class="font-normal">Detail & Riwayat Aset Tetap</h4>
				<button type="button" aria-label="Close" onclick={() => showDetailModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>

			<div class="p-5 overflow-y-auto space-y-4">
				{#if detailLoading}
					<div class="p-8 text-center text-gray-500">Memuat data aset...</div>
				{:else if detailAsset}
					<!-- Profile Box -->
					<div class="border border-gray-200 p-4 bg-gray-50 rounded-sm grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
						<div>
							<span class="text-gray-400 block">Kode Aset:</span>
							<span class="font-mono font-bold text-teal-800 text-sm">{detailAsset.assetCode}</span>
						</div>
						<div>
							<span class="text-gray-400 block">Serial Number:</span>
							<span class="font-mono font-semibold">{detailAsset.serialNumber || '-'}</span>
						</div>
						<div>
							<span class="text-gray-400 block">Nama Aset:</span>
							<span class="font-bold text-gray-900">{detailAsset.name}</span>
						</div>
						<div>
							<span class="text-gray-400 block">Kategori / Merek:</span>
							<span class="font-medium">{detailAsset.category?.name || '-'} / {detailAsset.brand?.name || '-'}</span>
						</div>
						<div>
							<span class="text-gray-400 block">Lokasi:</span>
							<span class="font-bold text-gray-800">{detailAsset.location?.name || '-'}</span>
						</div>
						<div>
							<span class="text-gray-400 block">PIC Saat Ini:</span>
							<span class="font-semibold text-gray-900">{detailAsset.pic || '-'}</span>
						</div>
						<div>
							<span class="text-gray-400 block">Tanggal Perolehan:</span>
							<span>{formatDate(detailAsset.purchaseDate)}</span>
						</div>
						<div>
							<span class="text-gray-400 block">Nilai Perolehan:</span>
							<span class="font-mono font-semibold">{formatRupiah(detailAsset.price)}</span>
						</div>
						<div>
							<span class="text-gray-400 block">Status / Kondisi:</span>
							<span class="font-bold">{detailAsset.status} / {detailAsset.condition}</span>
						</div>
					</div>

					<!-- Riwayat Perpindahan Aset (Movement History) -->
					<div>
						<h5 class="font-bold text-xs uppercase text-gray-700 tracking-wider mb-2 flex items-center gap-1.5">
							<svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
							Riwayat Mutasi & Perpindahan Aset
						</h5>
						{#if detailAsset.movements && detailAsset.movements.length > 0}
							<div class="border border-gray-200 rounded-sm overflow-hidden">
								<table class="w-full text-xs text-left">
									<thead class="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
										<tr>
											<th class="p-2">Waktu</th>
											<th class="p-2">Dari Lokasi</th>
											<th class="p-2">Ke Lokasi</th>
											<th class="p-2">PIC Baru</th>
											<th class="p-2">Alasan</th>
											<th class="p-2">Petugas</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-100">
										{#each detailAsset.movements as m}
											<tr class="hover:bg-gray-50">
												<td class="p-2 text-gray-500 whitespace-nowrap">{formatDate(m.createdAt)}</td>
												<td class="p-2 text-gray-700">{m.fromLocation || '-'}</td>
												<td class="p-2 font-semibold text-purple-800">{m.toLocation || '-'}</td>
												<td class="p-2 font-semibold text-gray-800">{m.toPic || '-'}</td>
												<td class="p-2 text-gray-600">{m.reason || '-'}</td>
												<td class="p-2 text-gray-500">{m.user?.username || '-'}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<div class="text-xs text-gray-500 p-3 bg-gray-50 border border-dashed rounded text-center">
								Belum ada riwayat mutasi/perpindahan untuk aset ini.
							</div>
						{/if}
					</div>

					<!-- Riwayat Peminjaman Aset -->
					<div>
						<h5 class="font-bold text-xs uppercase text-gray-700 tracking-wider mb-2 flex items-center gap-1.5">
							<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
							Riwayat Peminjaman Aset
						</h5>
						{#if detailAsset.loans && detailAsset.loans.length > 0}
							<div class="border border-gray-200 rounded-sm overflow-hidden">
								<table class="w-full text-xs text-left">
									<thead class="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
										<tr>
											<th class="p-2">Kode Pinjam</th>
											<th class="p-2">Peminjam</th>
											<th class="p-2">Tgl Pinjam</th>
											<th class="p-2">Tgl Kembali</th>
											<th class="p-2">Status</th>
											<th class="p-2">Kondisi Balik</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-100">
										{#each detailAsset.loans as l}
											<tr class="hover:bg-gray-50">
												<td class="p-2 font-mono font-bold text-[#3C8DBC]">{l.loanCode}</td>
												<td class="p-2 font-semibold text-gray-800">{l.borrower?.name || l.borrowerName || '-'}</td>
												<td class="p-2 text-gray-600">{formatDate(l.borrowDate)}</td>
												<td class="p-2 text-gray-600">{formatDate(l.actualReturnDate || l.expectedReturnDate)}</td>
												<td class="p-2 font-bold {l.status === 'DIKEMBALIKAN' ? 'text-green-700' : 'text-blue-700'}">{l.status}</td>
												<td class="p-2">{l.conditionAfter || '-'}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<div class="text-xs text-gray-500 p-3 bg-gray-50 border border-dashed rounded text-center">
								Belum ada riwayat peminjaman untuk aset ini.
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="p-3 border-t border-gray-200 bg-gray-50 flex justify-end flex-shrink-0">
				<button type="button" onclick={() => showDetailModal = false} class="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-sm">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL QUICK ASSET LOOKUP -->
{#if showQuickLookup}
	<QuickAssetLookupModal onClose={() => showQuickLookup = false} />
{/if}

<!-- MODAL RINCIAN DEPRESIASI & VALUASI ASET -->
{#if showDepreciationModal && activeDepAsset}
	{@const dep = calculateStraightLineDepreciation(activeDepAsset.price, activeDepAsset.salvageValue, activeDepAsset.usefulLifeMonths, activeDepAsset.purchaseDate)}
	<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[1050] p-4 backdrop-blur-sm">
		<div class="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
			<div class="bg-indigo-700 px-5 py-3.5 flex items-center justify-between text-white">
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
					<h4 class="font-bold text-sm">Kalkulator Depresiasi Garis Lurus (Straight-Line)</h4>
				</div>
				<button type="button" aria-label="Close" onclick={() => showDepreciationModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>

			<div class="p-5 space-y-4 text-xs text-gray-700">
				<!-- Asset Summary -->
				<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
					<span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{activeDepAsset.assetCode}</span>
					<h3 class="font-bold text-base text-gray-900 mt-1">{activeDepAsset.name}</h3>
					<p class="text-gray-500 text-xs">
						Tanggal Perolehan: <strong>{activeDepAsset.purchaseDate ? formatDate(activeDepAsset.purchaseDate) : 'Belum diatur'}</strong>
					</p>
				</div>

				<!-- Parameters Grid -->
				<div class="grid grid-cols-2 gap-2.5">
					<div class="p-2.5 bg-gray-50 rounded border border-gray-100">
						<span class="text-gray-400 block text-[11px]">Harga Perolehan (Cost)</span>
						<span class="font-bold text-sm text-gray-800">{formatRupiah(dep.initialCost)}</span>
					</div>
					<div class="p-2.5 bg-gray-50 rounded border border-gray-100">
						<span class="text-gray-400 block text-[11px]">Nilai Sisa (Salvage Value)</span>
						<span class="font-bold text-sm text-gray-800">{formatRupiah(dep.salvageValue)}</span>
					</div>
					<div class="p-2.5 bg-gray-50 rounded border border-gray-100">
						<span class="text-gray-400 block text-[11px]">Masa Manfaat</span>
						<span class="font-bold text-sm text-gray-800">{dep.usefulLifeMonths} Bulan ({dep.usefulLifeYears} Thn)</span>
					</div>
					<div class="p-2.5 bg-gray-50 rounded border border-gray-100">
						<span class="text-gray-400 block text-[11px]">Penyusutan / Bulan</span>
						<span class="font-bold text-sm text-indigo-600">{formatRupiah(dep.monthlyDepreciation)}</span>
					</div>
				</div>

				<!-- Valuation Card -->
				<div class="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl space-y-3">
					<div class="flex justify-between items-center">
						<span class="font-bold text-gray-700 uppercase tracking-wide text-xs">Nilai Buku Saat Ini (Current Book Value)</span>
						<span class="font-bold text-lg text-emerald-700 font-mono">{formatRupiah(dep.currentBookValue)}</span>
					</div>

					<div class="flex justify-between items-center text-xs">
						<span class="text-gray-500">Akumulasi Penyusutan:</span>
						<span class="font-bold text-rose-600 font-mono">-{formatRupiah(dep.accumulatedDepreciation)}</span>
					</div>

					<!-- Progress bar -->
					<div>
						<div class="flex justify-between text-[11px] text-gray-500 mb-1">
							<span>Penyusutan: {dep.depreciationPercentage}%</span>
							<span>Umur: {dep.monthsUsed} / {dep.usefulLifeMonths} Bln</span>
						</div>
						<div class="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
							<div class="h-full bg-indigo-600 rounded-full transition-all" style="width: {dep.depreciationPercentage}%"></div>
						</div>
					</div>
				</div>

				<!-- Navigation to maintenance -->
				<div class="pt-2 flex justify-between items-center">
					<a
						href={`/inventory/maintenance?search=${activeDepAsset.assetCode}`}
						class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
						Lihat Riwayat Pemeliharaan & Servis Aset Ini &rarr;
					</a>

					<button
						type="button"
						onclick={() => showDepreciationModal = false}
						class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded text-xs transition"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
