<script>
	import { invalidateAll } from '$app/navigation';
	import { jsPDF } from 'jspdf';
	import autoTable from 'jspdf-autotable';

	let { data } = $props();
	let loans = $state(data.loans);
	let items = data.items;
	let showModal = $state(false);
	let loading = $state(false);
	let error = $state('');
	let search = $state('');

	let form = $state({
		itemId: '',
		borrowerName: '',
		quantity: 1,
		expectedReturnDate: '',
		notes: ''
	});

	function openAdd() {
		form = {
			itemId: items.length ? items[0].id.toString() : '',
			borrowerName: '',
			quantity: 1,
			expectedReturnDate: '',
			notes: ''
		};
		error = '';
		showModal = true;
	}

	async function save(e) {
		e.preventDefault();
		loading = true;
		error = '';
		
		const res = await fetch('/api/loans', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form)
		});

		const d = await res.json();
		loading = false;
		if (!res.ok) {
			error = d.error || 'Terjadi kesalahan';
			return;
		}

		showModal = false;
		await invalidateAll();
		loans = data.loans;
	}

	async function kembalikan(id) {
		if (!confirm('Tandai barang peminjaman ini telah dikembalikan?')) return;
		const res = await fetch(`/api/loans/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'DIKEMBALIKAN' })
		});
		const d = await res.json();
		if (!res.ok) {
			alert(d.error || 'Gagal memproses pengembalian');
			return;
		}
		await invalidateAll();
		loans = data.loans;
	}

	async function hapus(id) {
		if (!confirm('Hapus peminjaman ini? Jika status masih DIPINJAM, stok akan otomatis dikembalikan.')) return;
		const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
		const d = await res.json();
		if (!res.ok) {
			alert(d.error || 'Gagal menghapus data');
			return;
		}
		await invalidateAll();
		loans = data.loans;
	}

	let filtered = $derived(
		loans.filter((l) =>
			l.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
			l.item.name.toLowerCase().includes(search.toLowerCase()) ||
			l.loanCode.toLowerCase().includes(search.toLowerCase())
		)
	);

	function formatDate(d) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	// --- EXPORT PDF ---
	function exportPDF() {
		const doc = new jsPDF();
		doc.text('LAPORAN PEMINJAMAN BARANG', 14, 15);
		doc.setFontSize(10);
		doc.text(`Dicetak tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

		const tableData = filtered.map((l, idx) => [
			idx + 1,
			l.loanCode,
			l.borrowerName,
			l.item.name,
			l.quantity.toString(),
			formatDate(l.borrowDate),
			formatDate(l.expectedReturnDate),
			l.status
		]);

		autoTable(doc, {
			startY: 25,
			head: [['NO', 'KODE', 'PEMINJAM', 'BARANG', 'QTY', 'TGL PINJAM', 'TARGET KEMBALI', 'STATUS']],
			body: tableData
		});

		doc.save('Data_Peminjaman.pdf');
	}

	// --- PRINT VIEW ---
	function printData() {
		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		let tableRows = '';
		filtered.forEach((l, idx) => {
			tableRows += `
				<tr>
					<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
					<td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${l.loanCode}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">${l.borrowerName}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">${l.item.name}</td>
					<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${l.quantity}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">${formatDate(l.borrowDate)}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">${formatDate(l.expectedReturnDate)}</td>
					<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${l.status}</td>
				</tr>
			`;
		});

		printWindow.document.write(`
			<html>
				<head>
					<title>Cetak Data Peminjaman</title>
					<style>
						body { font-family: sans-serif; padding: 20px; }
						table { width: 100%; border-collapse: collapse; margin-top: 20px; }
						th { background-color: #f2f2f2; text-align: left; }
					</style>
				</head>
				<body>
					<h2>LAPORAN DATA PEMINJAMAN BARANG</h2>
					<p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
					<table>
						<thead>
							<tr>
								<th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 50px;">NO</th>
								<th style="border: 1px solid #ddd; padding: 8px;">KODE</th>
								<th style="border: 1px solid #ddd; padding: 8px;">PEMINJAM</th>
								<th style="border: 1px solid #ddd; padding: 8px;">BARANG</th>
								<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">QTY</th>
								<th style="border: 1px solid #ddd; padding: 8px;">TGL PINJAM</th>
								<th style="border: 1px solid #ddd; padding: 8px;">TARGET KEMBALI</th>
								<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">STATUS</th>
							</tr>
						</thead>
						<tbody>
							${tableRows}
						</tbody>
					</table>
					<script>
						window.onload = () => { window.print(); window.close(); }
					<\\/script>
				</body>
			</html>
		`);
		printWindow.document.close();
	}
</script>

<svelte:head><title>Peminjaman – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans">
	<!-- Page Header & Breadcrumb -->
	<div class="flex items-center justify-between pb-2 border-b border-gray-200">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Peminjaman <span class="text-sm text-gray-500 font-light">Data Peminjaman</span>
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
	<div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
		<div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
			<h3 class="font-normal text-gray-800 text-base">Peminjaman</h3>
			<div class="flex items-center gap-1">
				<button onclick={openAdd} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
					Tambah Peminjaman
				</button>
				<button onclick={exportPDF} class="bg-[#5CB85C] hover:bg-[#4CAE4C] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
					CETAK PDF
				</button>
				<button onclick={printData} class="bg-[#31708F] hover:bg-[#245269] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
					PRINT
				</button>
			</div>
		</div>

		<div class="p-4">
			<!-- Search Box -->
			<div class="mb-4 flex justify-end">
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold text-gray-700">Search:</span>
					<input type="text" bind:value={search} class="border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm w-48" />
				</div>
			</div>

			<!-- Table Loans -->
			<div class="overflow-x-auto">
				<table class="w-full text-sm text-left border border-gray-200">
					<thead class="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-xs">
						<tr>
							<th class="p-3 border-r border-gray-200 w-12 text-center">NO</th>
							<th class="p-3 border-r border-gray-200">KODE</th>
							<th class="p-3 border-r border-gray-200">NAMA PEMINJAM</th>
							<th class="p-3 border-r border-gray-200">NAMA BARANG</th>
							<th class="p-3 border-r border-gray-200 text-center">QTY</th>
							<th class="p-3 border-r border-gray-200">TANGGAL PINJAM</th>
							<th class="p-3 border-r border-gray-200">TARGET KEMBALI</th>
							<th class="p-3 border-r border-gray-200">REALISASI KEMBALI</th>
							<th class="p-3 border-r border-gray-200 text-center">STATUS</th>
							<th class="p-3 text-center w-36">OPSI</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each filtered as l, index (l.id)}
							<tr class="hover:bg-gray-50 text-gray-700">
								<td class="p-3 border-r border-gray-200 text-center">{index + 1}</td>
								<td class="p-3 border-r border-gray-200 font-bold">{l.loanCode}</td>
								<td class="p-3 border-r border-gray-200 font-semibold">{l.borrowerName}</td>
								<td class="p-3 border-r border-gray-200">{l.item?.name}</td>
								<td class="p-3 border-r border-gray-200 text-center">{l.quantity}</td>
								<td class="p-3 border-r border-gray-200">{formatDate(l.borrowDate)}</td>
								<td class="p-3 border-r border-gray-200">{formatDate(l.expectedReturnDate)}</td>
								<td class="p-3 border-r border-gray-200">{formatDate(l.actualReturnDate)}</td>
								<td class="p-3 border-r border-gray-200 text-center">
									{#if l.status === 'DIPINJAM'}
										<span class="bg-[#F0AD4E] text-white text-[10px] font-bold px-2 py-0.5 rounded">DIPINJAM</span>
									{:else}
										<span class="bg-[#5CB85C] text-white text-[10px] font-bold px-2 py-0.5 rounded">DIKEMBALIKAN</span>
									{/if}
								</td>
								<td class="p-3 text-center">
									<div class="flex items-center justify-center gap-1.5">
										{#if l.status === 'DIPINJAM'}
											<button onclick={() => kembalikan(l.id)} class="bg-[#5CB85C] hover:bg-[#4CAE4C] text-white text-xs px-2 py-1 rounded shadow-sm font-semibold transition-colors">
												Kembalikan
											</button>
										{/if}
										<button type="button" onclick={() => hapus(l.id)} class="bg-[#DD4B39] hover:bg-[#D73925] text-white p-1 rounded shadow-sm" title="Hapus">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="10" class="p-6 text-center text-gray-500">
									{search ? 'Data tidak ditemukan' : 'Tidak ada data peminjaman.'}
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

<!-- Modal Form Peminjaman -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-md overflow-hidden">
			<div class="bg-[#3C8DBC] px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal">Tambah Peminjaman Baru</h4>
				<button type="button" onclick={() => showModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={save} class="p-5 space-y-4">
				{#if error}
					<div class="bg-red-50 text-red-600 p-2 text-sm border-l-2 border-red-500 mb-3">{error}</div>
				{/if}
				<div>
					<label for="borrowerName" class="block text-sm font-bold text-gray-700 mb-1">Nama Peminjam</label>
					<input id="borrowerName" type="text" bind:value={form.borrowerName} required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>
				<div>
					<label for="itemId" class="block text-sm font-bold text-gray-700 mb-1">Pilih Barang</label>
					<select id="itemId" bind:value={form.itemId} required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
						{#each items as item}
							<option value={item.id.toString()}>{item.name} (Stok: {item.quantity})</option>
						{/each}
					</select>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="qty" class="block text-sm font-bold text-gray-700 mb-1">Jumlah</label>
						<input id="qty" type="number" bind:value={form.quantity} min="1" required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
					<div>
						<label for="targetDate" class="block text-sm font-bold text-gray-700 mb-1">Target Pengembalian</label>
						<input id="targetDate" type="date" bind:value={form.expectedReturnDate} class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
					</div>
				</div>
				<div>
					<label for="notes" class="block text-sm font-bold text-gray-700 mb-1">Catatan</label>
					<textarea id="notes" bind:value={form.notes} rows="2" placeholder="Opsional" class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm resize-none"></textarea>
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