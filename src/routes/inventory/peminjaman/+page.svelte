<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { jsPDF } from 'jspdf';
	import autoTable from 'jspdf-autotable';
	import * as XLSX from 'xlsx';
	import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';

	let { data } = $props();
	let loans = $derived(data.loans);
	let items = $derived(data.items);
	let assets = $derived(data.assets);
	let borrowers = $derived(data.borrowers || []);
	let stats = $derived(data.stats);

	let showModal = $state(false);
	let showReturnModal = $state(false);
	let showScannerReturn = $state(false);
	let showScannerLoanItem = $state(false);
	let selectedLoanToReturn: any = $state(null);
	let loading = $state(false);
	let error = $state('');
	let search = $state('');
	let statusFilter = $state('ALL'); // ALL, DIPINJAM, TERLAMBAT, DIKEMBALIKAN

	// Loan Form
	let targetType = $state<'asset' | 'item'>('asset');
	let form = $state({
		loanCode: '',
		borrowerId: '',
		borrowerName: '',
		targetType: 'asset',
		assetId: '',
		itemId: '',
		quantity: 1,
		expectedReturnDate: '',
		conditionBefore: 'BAIK',
		notes: ''
	});

	// Return Form (Validation of condition upon return)
	let returnForm = $state({
		conditionAfter: 'BAIK',
		notes: ''
	});

	function openAdd() {
		form = {
			loanCode: `LN-${Date.now().toString().slice(-6)}`,
			borrowerId: borrowers.length ? borrowers[0].id.toString() : '',
			borrowerName: '',
			targetType: assets.length ? 'asset' : 'item',
			assetId: assets.length ? assets[0].id.toString() : '',
			itemId: items.length ? items[0].id.toString() : '',
			quantity: 1,
			expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 hari default
			conditionBefore: 'BAIK',
			notes: ''
		};
		targetType = form.targetType as 'asset' | 'item';
		error = '';
		showModal = true;
	}

	function openReturnModal(loan: any) {
		selectedLoanToReturn = loan;
		returnForm = {
			conditionAfter: loan.conditionBefore || 'BAIK',
			notes: ''
		};
		showReturnModal = true;
	}

	function handleScanReturn(code: string) {
		const q = code.trim().toLowerCase();
		// Cari di daftar peminjaman yang aktif / belum kembali
		const activeLoans = loans.filter((l: any) => l.status !== 'DIKEMBALIKAN');
		const match = activeLoans.find((l: any) => {
			return (
				l.loanCode?.toLowerCase() === q ||
				l.asset?.assetCode?.toLowerCase() === q ||
				l.asset?.serialNumber?.toLowerCase() === q ||
				l.item?.sku?.toLowerCase() === q ||
				l.item?.barcode?.toLowerCase() === q
			);
		});

		if (match) {
			showScannerReturn = false;
			toast.success(`Ditemukan peminjaman: ${match.loanCode} (${match.borrower?.name || match.borrowerName || 'Peminjam'})`);
			openReturnModal(match);
		} else {
			toast.error(`Tidak ditemukan peminjaman aktif untuk kode/barcode "${code}"`);
		}
	}

	function handleScanLoanItem(code: string) {
		const q = code.trim().toLowerCase();
		// 1. Cek di daftar aset
		const foundAsset = assets.find((a: any) => 
			a.assetCode?.toLowerCase() === q || 
			a.serialNumber?.toLowerCase() === q ||
			a.name?.toLowerCase() === q
		);
		if (foundAsset) {
			targetType = 'asset';
			form.targetType = 'asset';
			form.assetId = foundAsset.id.toString();
			showScannerLoanItem = false;
			toast.success(`Aset terpilih: ${foundAsset.name} [${foundAsset.assetCode}]`);
			return;
		}

		// 2. Cek di daftar barang konsumsi
		const foundItem = items.find((i: any) => 
			i.sku?.toLowerCase() === q || 
			i.barcode?.toLowerCase() === q ||
			i.name?.toLowerCase() === q
		);
		if (foundItem) {
			targetType = 'item';
			form.targetType = 'item';
			form.itemId = foundItem.id.toString();
			showScannerLoanItem = false;
			toast.success(`Barang terpilih: ${foundItem.name}`);
			return;
		}

		toast.error(`Barcode "${code}" tidak ditemukan pada aset maupun barang yang tersedia.`);
	}

	async function saveLoan(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const payload: any = {
			loanCode: form.loanCode,
			borrowerId: form.borrowerId ? parseInt(form.borrowerId) : null,
			borrowerName: form.borrowerName || null,
			quantity: targetType === 'asset' ? 1 : parseInt(form.quantity.toString()),
			expectedReturnDate: form.expectedReturnDate || null,
			conditionBefore: form.conditionBefore,
			notes: form.notes || null,
			assetId: targetType === 'asset' && form.assetId ? parseInt(form.assetId) : null,
			itemId: targetType === 'item' && form.itemId ? parseInt(form.itemId) : null
		};

		const res = await fetch('/api/loans', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		const d = await res.json();
		loading = false;
		if (!res.ok) {
			error = d.error || 'Terjadi kesalahan saat memproses peminjaman';
			return;
		}

		toast.success('Peminjaman barang berhasil dicatat');
		showModal = false;
		await invalidateAll();
	}

	async function processReturn(e: Event) {
		e.preventDefault();
		if (!selectedLoanToReturn) return;
		loading = true;

		const res = await fetch(`/api/loans/${selectedLoanToReturn.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				status: 'DIKEMBALIKAN',
				conditionAfter: returnForm.conditionAfter,
				notes: returnForm.notes ? `${selectedLoanToReturn.notes ? selectedLoanToReturn.notes + ' | ' : ''}Ket Pengembalian: ${returnForm.notes}` : selectedLoanToReturn.notes
			})
		});

		const d = await res.json();
		loading = false;
		if (!res.ok) {
			toast.error(d.error || 'Gagal memproses pengembalian');
			return;
		}

		toast.success('Barang telah berhasil dikembalikan');
		showReturnModal = false;
		await invalidateAll();
	}

	async function hapus(id: number) {
		if (!confirm('Hapus peminjaman ini? Jika status masih DIPINJAM, barang/aset akan otomatis dikembalikan.')) return;
		const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
		const d = await res.json();
		if (!res.ok) {
			toast.error(d.error || 'Gagal menghapus data');
			return;
		}
		toast.success('Data peminjaman berhasil dihapus');
		await invalidateAll();
	}

	let filtered = $derived(
		loans.filter((l: any) => {
			const bName = l.borrower?.name || l.borrowerName || '';
			const iName = l.item?.name || l.asset?.name || '';
			const code = l.loanCode || '';
			const matchesSearch = bName.toLowerCase().includes(search.toLowerCase()) ||
				iName.toLowerCase().includes(search.toLowerCase()) ||
				code.toLowerCase().includes(search.toLowerCase());

			let matchesStatus = true;
			if (statusFilter === 'DIPINJAM') {
				matchesStatus = l.status === 'DIPINJAM' && !l.isOverdue;
			} else if (statusFilter === 'TERLAMBAT') {
				matchesStatus = l.isOverdue;
			} else if (statusFilter === 'DIKEMBALIKAN') {
				matchesStatus = l.status === 'DIKEMBALIKAN';
			}

			return matchesSearch && matchesStatus;
		})
	);

	function formatDate(d: string | Date | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	// --- EXPORT PDF ---
	function exportPDF() {
		const doc = new jsPDF('landscape');
		doc.setFontSize(14);
		doc.text('LAPORAN PEMINJAMAN BARANG & ASET', 14, 15);
		doc.setFontSize(9);
		doc.text(`Dicetak tanggal: ${new Date().toLocaleDateString('id-ID')} | Total: ${filtered.length} transaksi`, 14, 21);

		const tableData = filtered.map((l: any, idx: number) => [
			idx + 1,
			l.loanCode,
			l.borrower?.name || l.borrowerName || '-',
			l.asset ? `[ASET] ${l.asset.name} (${l.asset.assetCode})` : (l.item ? `[KONSUMSI] ${l.item.name}` : '-'),
			l.quantity.toString(),
			formatDate(l.borrowDate),
			formatDate(l.expectedReturnDate),
			formatDate(l.actualReturnDate),
			l.isOverdue ? 'TERLAMBAT' : l.status,
			`${l.conditionBefore || '-'} -> ${l.conditionAfter || '-'}`
		]);

		autoTable(doc, {
			startY: 25,
			head: [['NO', 'KODE', 'PEMINJAM', 'BARANG / ASET', 'QTY', 'TGL PINJAM', 'TARGET KEMBALI', 'REALISASI', 'STATUS', 'KONDISI']],
			body: tableData,
			styles: { fontSize: 8 }
		});

		doc.save(`Laporan_Peminjaman_${new Date().toISOString().split('T')[0]}.pdf`);
		toast.success('Laporan peminjaman berhasil diexport ke PDF');
	}

	// --- EXPORT EXCEL ---
	function exportExcel() {
		const wsData = [
			['NO', 'KODE PINJAM', 'PEMINJAM', 'TIPE PEMINJAM', 'BARANG/ASET', 'TIPE BARANG', 'JUMLAH', 'TGL PINJAM', 'TARGET KEMBALI', 'REALISASI KEMBALI', 'STATUS', 'KONDISI AWAL', 'KONDISI AKHIR', 'CATATAN'],
			...filtered.map((l: any, idx: number) => [
				idx + 1,
				l.loanCode,
				l.borrower?.name || l.borrowerName || '-',
				l.borrower?.type === 'external' ? 'Eksternal' : 'Internal',
				l.asset ? l.asset.name : (l.item ? l.item.name : '-'),
				l.asset ? 'Aset Tetap' : 'Barang Konsumsi',
				l.quantity,
				formatDate(l.borrowDate),
				formatDate(l.expectedReturnDate),
				formatDate(l.actualReturnDate),
				l.isOverdue ? 'TERLAMBAT' : l.status,
				l.conditionBefore || '-',
				l.conditionAfter || '-',
				l.notes || '-'
			])
		];

		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.aoa_to_sheet(wsData);
		XLSX.utils.book_append_sheet(wb, ws, 'Peminjaman');
		XLSX.writeFile(wb, `Laporan_Peminjaman_${new Date().toISOString().split('T')[0]}.xlsx`);
		toast.success('Laporan peminjaman berhasil diexport ke Excel');
	}
</script>

<svelte:head><title>Peminjaman Barang & Aset – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans">
	<!-- Page Header & Breadcrumb -->
	<div class="flex flex-wrap items-center justify-between pb-2 border-b border-gray-200 gap-2">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Peminjaman Barang & Aset <span class="text-sm text-gray-500 font-light">Sirkulasi & Pengembalian</span>
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
			<span class="text-gray-400">Peminjaman</span>
		</div>
	</div>

	<!-- Alert Peringatan Keterlambatan Otomatis (PRD 5.2) -->
	{#if stats.overdueCount > 0}
		<div class="bg-red-50 border-l-4 border-red-500 p-3 rounded-none shadow-sm flex items-center justify-between">
			<div class="flex items-center gap-2.5">
				<svg class="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
				<div>
					<span class="font-bold text-red-800 text-sm">Peringatan Keterlambatan Peminjaman!</span>
					<p class="text-xs text-red-700">Terdapat <strong>{stats.overdueCount}</strong> barang/aset yang telah melewati batas waktu pengembalian dan belum dikembalikan.</p>
				</div>
			</div>
			<button onclick={() => statusFilter = 'TERLAMBAT'} class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs font-semibold rounded-sm">
				Lihat Terlambat
			</button>
		</div>
	{/if}

	<!-- KPI Summary Widgets AdminLTE Style -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-[#00C0EF] text-white p-4 rounded-none shadow-sm flex items-center justify-between">
			<div>
				<div class="text-2xl font-bold">{stats.total}</div>
				<div class="text-xs uppercase font-semibold">Total Peminjaman</div>
			</div>
			<svg class="w-10 h-10 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
		</div>
		<div class="bg-[#3C8DBC] text-white p-4 rounded-none shadow-sm flex items-center justify-between">
			<div>
				<div class="text-2xl font-bold">{stats.activeCount}</div>
				<div class="text-xs uppercase font-semibold">Aktif Dipinjam</div>
			</div>
			<svg class="w-10 h-10 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
		</div>
		<div class="bg-[#DD4B39] text-white p-4 rounded-none shadow-sm flex items-center justify-between">
			<div>
				<div class="text-2xl font-bold">{stats.overdueCount}</div>
				<div class="text-xs uppercase font-semibold">Terlambat Kembali</div>
			</div>
			<svg class="w-10 h-10 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
		</div>
		<div class="bg-[#00A65A] text-white p-4 rounded-none shadow-sm flex items-center justify-between">
			<div>
				<div class="text-2xl font-bold">{stats.returnedCount}</div>
				<div class="text-xs uppercase font-semibold">Sudah Kembali</div>
			</div>
			<svg class="w-10 h-10 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 13l4 4L19 7"/></svg>
		</div>
	</div>

	<!-- Main Box AdminLTE Style -->
	<div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
		<div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<button onclick={openAdd} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
					Catat Peminjaman
				</button>
				<button onclick={() => showScannerReturn = true} class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1.5 transition-colors" title="Scan Barcode / QR untuk Pengembalian Cepat">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
					Scan Kembali Cepat
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

			<!-- Status Filter Pills -->
			<div class="flex items-center gap-1 text-xs">
				<button 
					onclick={() => statusFilter = 'ALL'} 
					class="px-2.5 py-1 rounded-sm font-semibold {statusFilter === 'ALL' ? 'bg-[#3C8DBC] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
					Semua ({loans.length})
				</button>
				<button 
					onclick={() => statusFilter = 'DIPINJAM'} 
					class="px-2.5 py-1 rounded-sm font-semibold {statusFilter === 'DIPINJAM' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
					Aktif ({stats.activeCount - stats.overdueCount})
				</button>
				<button 
					onclick={() => statusFilter = 'TERLAMBAT'} 
					class="px-2.5 py-1 rounded-sm font-semibold {statusFilter === 'TERLAMBAT' ? 'bg-red-600 text-white' : 'bg-gray-100 text-red-600 hover:bg-gray-200'}">
					Terlambat ({stats.overdueCount})
				</button>
				<button 
					onclick={() => statusFilter = 'DIKEMBALIKAN'} 
					class="px-2.5 py-1 rounded-sm font-semibold {statusFilter === 'DIKEMBALIKAN' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
					Dikembalikan ({stats.returnedCount})
				</button>
			</div>
		</div>

		<div class="p-4">
			<!-- Search Bar -->
			<div class="mb-4 flex justify-between items-center">
				<div class="text-xs text-gray-500">
					Menampilkan <span class="font-semibold">{filtered.length}</span> transaksi peminjaman
				</div>
				<div class="flex items-center gap-2">
					<span class="text-xs font-semibold text-gray-700">Search:</span>
					<input type="text" bind:value={search} placeholder="Nama peminjam, barang, kode..." class="border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-[#3C8DBC] rounded-sm w-56" />
				</div>
			</div>

			<!-- Table -->
			<div class="overflow-x-auto border border-gray-200">
				<table class="w-full text-left border-collapse text-sm">
					<thead>
						<tr class="bg-gray-100 text-gray-700 border-b border-gray-200 text-xs">
							<th class="p-2.5 text-center w-10 font-bold border-r border-gray-200">NO</th>
							<th class="p-2.5 font-bold border-r border-gray-200">KODE PINJAM</th>
							<th class="p-2.5 font-bold border-r border-gray-200">DATA PEMINJAM</th>
							<th class="p-2.5 font-bold border-r border-gray-200">BARANG / ASET</th>
							<th class="p-2.5 text-center font-bold border-r border-gray-200">QTY</th>
							<th class="p-2.5 font-bold border-r border-gray-200">TGL PINJAM</th>
							<th class="p-2.5 font-bold border-r border-gray-200">TARGET KEMBALI</th>
							<th class="p-2.5 text-center font-bold border-r border-gray-200">KONDISI PINJAM / KEMBALI</th>
							<th class="p-2.5 text-center font-bold border-r border-gray-200">STATUS</th>
							<th class="p-2.5 text-center font-bold">AKSI</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each filtered as l, idx}
							<tr class="hover:bg-gray-50 transition-colors {l.isOverdue ? 'bg-red-50/60' : ''}">
								<td class="p-2.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
								<td class="p-2.5 font-mono text-xs font-bold text-[#3C8DBC] border-r border-gray-100">
									{l.loanCode}
								</td>
								<td class="p-2.5 text-gray-900 border-r border-gray-100">
									<div class="font-semibold text-xs">{l.borrower?.name || l.borrowerName || '-'}</div>
									{#if l.borrower?.department}
										<div class="text-[11px] text-gray-500">{l.borrower.department} ({l.borrower.type === 'external' ? 'Eksternal' : 'Internal'})</div>
									{/if}
								</td>
								<td class="p-2.5 border-r border-gray-100">
									{#if l.asset}
										<div class="font-medium text-xs text-purple-900 flex items-center gap-1">
											<span class="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-[10px] font-bold">ASET</span>
											{l.asset.name}
										</div>
										<div class="text-[11px] text-gray-400 font-mono">Tag: {l.asset.assetCode}</div>
									{:else if l.item}
										<div class="font-medium text-xs text-blue-900 flex items-center gap-1">
											<span class="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-[10px] font-bold">KONSUMSI</span>
											{l.item.name}
										</div>
										<div class="text-[11px] text-gray-400 font-mono">{l.item.sku || 'Tanpa SKU'}</div>
									{:else}
										<span class="text-gray-400">-</span>
									{/if}
								</td>
								<td class="p-2.5 text-center border-r border-gray-100 font-semibold">{l.quantity}</td>
								<td class="p-2.5 text-xs text-gray-600 border-r border-gray-100">{formatDate(l.borrowDate)}</td>
								<td class="p-2.5 text-xs border-r border-gray-100">
									<span class="{l.isOverdue ? 'font-bold text-red-600' : 'text-gray-700'}">
										{formatDate(l.expectedReturnDate)}
									</span>
									{#if l.isOverdue}
										<span class="text-[10px] text-red-700 font-bold block">Terlambat!</span>
									{/if}
								</td>
								<td class="p-2.5 text-center text-xs border-r border-gray-100">
									<span class="text-gray-600 font-medium">{l.conditionBefore || 'BAIK'}</span>
									<span class="text-gray-400 mx-1">&rarr;</span>
									<span class="font-bold {l.conditionAfter === 'BAIK' ? 'text-green-700' : (l.conditionAfter ? 'text-red-700' : 'text-gray-400')}">
										{l.conditionAfter || '(Belum kembali)'}
									</span>
								</td>
								<td class="p-2.5 text-center border-r border-gray-100">
									{#if l.status === 'DIKEMBALIKAN'}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">
											DIKEMBALIKAN
										</span>
										<div class="text-[10px] text-gray-400 mt-0.5">{formatDate(l.actualReturnDate)}</div>
									{:else if l.isOverdue}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white animate-pulse">
											TERLAMBAT
										</span>
									{:else}
										<span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white">
											DIPINJAM
										</span>
									{/if}
								</td>
								<td class="p-2.5 text-center">
									<div class="flex items-center justify-center gap-1.5">
										{#if l.status === 'DIPINJAM'}
											<button onclick={() => openReturnModal(l)} class="bg-[#00A65A] hover:bg-[#008D4C] text-white px-2 py-1 text-xs font-semibold rounded-sm shadow-sm" title="Validasi Pengembalian Barang">
												Kembalikan
											</button>
										{/if}
										<a href="/inventory/bast?loanId={l.id}" class="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-0.5" title="Terbitkan Berita Acara Serah Terima (BAST)">
											BAST
										</a>
										<button onclick={() => hapus(l.id)} title="Hapus Data" aria-label="Hapus Peminjaman" class="text-red-600 hover:text-red-800 p-1">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="10" class="p-8 text-center text-gray-500">
									{search ? 'Tidak ada data peminjaman yang cocok dengan pencarian.' : 'Belum ada data peminjaman.'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- MODAL CATAT PEMINJAMAN BARANG / ASET -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
			<div class="bg-[#3C8DBC] px-4 py-3 flex items-center justify-between text-white flex-shrink-0">
				<h4 class="font-normal text-sm">Catat Peminjaman Barang / Aset</h4>
				<button type="button" aria-label="Close" onclick={() => showModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={saveLoan} class="p-5 space-y-3 overflow-y-auto">
				{#if error}
					<div class="bg-red-50 text-red-600 p-2 text-xs border-l-2 border-red-500">{error}</div>
				{/if}

				<div>
					<label for="loanCode" class="block text-xs font-bold text-gray-700 mb-1">Nomor / Kode Peminjaman *</label>
					<input id="loanCode" type="text" bind:value={form.loanCode} required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm font-mono" />
				</div>

				<!-- Pilih Profil Peminjam atau Input Manual -->
				<div>
					<label for="borrowerId" class="block text-xs font-bold text-gray-700 mb-1">Pilih Data Peminjam (Master Profil)</label>
					<select id="borrowerId" bind:value={form.borrowerId} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
						<option value="">-- Input Manual / Peminjam Lain --</option>
						{#each borrowers as b}
							<option value={b.id.toString()}>{b.name} ({b.department || b.type})</option>
						{/each}
					</select>
				</div>
				{#if !form.borrowerId}
					<div>
						<label for="borrowerName" class="block text-xs font-bold text-gray-700 mb-1">Nama Peminjam Manual *</label>
						<input id="borrowerName" type="text" bind:value={form.borrowerName} required placeholder="Masukkan nama peminjam" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
				{/if}

				<!-- Tipe Barang yang Dipinjam (Aset Tetap vs Konsumsi) -->
				<div>
					<span class="block text-xs font-bold text-gray-700 mb-1">Jenis Objek yang Dipinjam *</span>
					<div class="flex gap-4 p-2 bg-gray-50 border rounded-sm">
						<label class="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
							<input type="radio" bind:group={targetType} value="asset" name="targetT" /> Aset Tetap / Buku Induk
						</label>
						<label class="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
							<input type="radio" bind:group={targetType} value="item" name="targetT" /> Barang Konsumsi (Stok)
						</label>
					</div>
				</div>

				{#if targetType === 'asset'}
					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="assetId" class="block text-xs font-bold text-gray-700">Pilih Unit Aset Tersedia *</label>
							<button type="button" onclick={() => showScannerLoanItem = true} class="text-xs text-[#3C8DBC] hover:underline flex items-center gap-1 font-semibold">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
								Scan Barcode Aset
							</button>
						</div>
						<select id="assetId" bind:value={form.assetId} required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
							{#each assets as a}
								<option value={a.id.toString()}>{a.name} [{a.assetCode}] - Kondisi: {a.condition}</option>
							{:else}
								<option value="" disabled>Tidak ada aset dengan status TERSEDIA</option>
							{/each}
						</select>
					</div>
				{:else}
					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="itemId" class="block text-xs font-bold text-gray-700">Pilih Barang Konsumsi *</label>
							<button type="button" onclick={() => showScannerLoanItem = true} class="text-xs text-[#3C8DBC] hover:underline flex items-center gap-1 font-semibold">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
								Scan Barcode Barang
							</button>
						</div>
						<select id="itemId" bind:value={form.itemId} required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
							{#each items as i}
								<option value={i.id.toString()}>{i.name} (Tersedia: {i.quantity})</option>
							{:else}
								<option value="" disabled>Tidak ada barang yang memiliki stok</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="qty" class="block text-xs font-bold text-gray-700 mb-1">Jumlah Pinjam *</label>
						<input id="qty" type="number" bind:value={form.quantity} min="1" required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="targetDate" class="block text-xs font-bold text-gray-700 mb-1">Rencana Batas Kembali *</label>
						<input id="targetDate" type="date" bind:value={form.expectedReturnDate} required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div>
						<label for="condBefore" class="block text-xs font-bold text-gray-700 mb-1">Kondisi Fisik Saat Dipinjam</label>
						<select id="condBefore" bind:value={form.conditionBefore} class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white font-semibold">
							<option value="BAIK">Baik</option>
							<option value="RUSAK_RINGAN">Rusak Ringan</option>
						</select>
					</div>
				</div>

				<div>
					<label for="notes" class="block text-xs font-bold text-gray-700 mb-1">Keperluan / Catatan Peminjaman</label>
					<textarea id="notes" bind:value={form.notes} rows="2" placeholder="Contoh: Dipinjam untuk tugas lapangan dinas luar kota" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm resize-none"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-gray-100 flex-shrink-0">
					<button type="button" onclick={() => showModal = false} class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-medium rounded-sm">Batal</button>
					<button type="submit" disabled={loading} class="px-4 py-1.5 bg-[#3C8DBC] hover:bg-[#367FA9] text-white text-xs font-semibold rounded-sm disabled:opacity-70">
						{loading ? 'Menyimpan...' : 'Simpan Peminjaman'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL VALIDASI PENGEMBALIAN BARANG (PRD 5.2) -->
{#if showReturnModal && selectedLoanToReturn}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-md overflow-hidden">
			<div class="bg-[#00A65A] px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal text-sm">Validasi Pengembalian Barang</h4>
				<button type="button" aria-label="Close" onclick={() => showReturnModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={processReturn} class="p-5 space-y-3">
				<div class="bg-emerald-50 p-3 rounded text-xs border border-emerald-100 space-y-1">
					<div class="font-bold text-emerald-900">Kode: {selectedLoanToReturn.loanCode}</div>
					<div class="text-emerald-800">Peminjam: <strong>{selectedLoanToReturn.borrower?.name || selectedLoanToReturn.borrowerName}</strong></div>
					<div class="text-emerald-800">
						Objek: <strong>{selectedLoanToReturn.asset ? selectedLoanToReturn.asset.name : selectedLoanToReturn.item?.name}</strong>
					</div>
					<div class="text-emerald-700">Kondisi Saat Dipinjam: <strong>{selectedLoanToReturn.conditionBefore || 'BAIK'}</strong></div>
				</div>

				<div>
					<label for="condAfter" class="block text-xs font-bold text-gray-700 mb-1">
						Validasi Kondisi Fisik Saat Dikembalikan *
					</label>
					<select id="condAfter" bind:value={returnForm.conditionAfter} required class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-600 rounded-sm bg-white font-semibold">
						<option value="BAIK">Baik (Tanpa Kerusakan)</option>
						<option value="RUSAK_RINGAN">Rusak Ringan (Ada baret/lecet kecil)</option>
						<option value="RUSAK_BERAT">Rusak Berat (Tidak berfungsi / pecah)</option>
						<option value="HILANG">Hilang (Tidak dapat dikembalikan)</option>
					</select>
					<p class="text-[11px] text-gray-500 mt-1">Status dan kondisi aset di Buku Induk akan otomatis diperbarui sesuai validasi ini.</p>
				</div>

				<div>
					<label for="returnNotes" class="block text-xs font-bold text-gray-700 mb-1">Catatan Pengembalian (Opsional)</label>
					<textarea id="returnNotes" bind:value={returnForm.notes} rows="2" placeholder="Catatan kelengkapan, charger, aksesoris, dll" class="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-600 rounded-sm resize-none"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
					<button type="button" onclick={() => showReturnModal = false} class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-medium rounded-sm">Batal</button>
					<button type="submit" disabled={loading} class="px-4 py-1.5 bg-[#00A65A] hover:bg-[#008D4C] text-white text-xs font-semibold rounded-sm disabled:opacity-70">
						{loading ? 'Memproses...' : 'Konfirmasi Pengembalian'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL SCANNER PENGEMBALIAN CEPAT -->
{#if showScannerReturn}
	<BarcodeScanner 
		onScan={handleScanReturn} 
		onClose={() => showScannerReturn = false} 
	/>
{/if}

<!-- MODAL SCANNER INPUT BARANG / ASET PEMINJAMAN -->
{#if showScannerLoanItem}
	<BarcodeScanner 
		onScan={handleScanLoanItem} 
		onClose={() => showScannerLoanItem = false} 
	/>
{/if}