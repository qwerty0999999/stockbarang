<script>
	import { invalidateAll } from '$app/navigation';
	import { jsPDF } from 'jspdf';
	import autoTable from 'jspdf-autotable';

	let { data } = $props();
	let suppliers = $state(data.suppliers);
	let showModal = $state(false);
	let editSupplier = $state(null);
	let loading = $state(false);
	let error = $state('');
	let search = $state('');

	let form = $state({ name: '', address: '', phone: '', email: '' });

	function openAdd() {
		editSupplier = null;
		form = { name: '', address: '', phone: '', email: '' };
		error = '';
		showModal = true;
	}

	function openEdit(supplier) {
		editSupplier = supplier;
		form = {
			name: supplier.name,
			address: supplier.address || '',
			phone: supplier.phone || '',
			email: supplier.email || ''
		};
		error = '';
		showModal = true;
	}

	async function save(e) {
		e.preventDefault();
		loading = true;
		error = '';
		const url = editSupplier ? `/api/suppliers/${editSupplier.id}` : '/api/suppliers';
		const method = editSupplier ? 'PUT' : 'POST';

		const res = await fetch(url, {
			method,
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
		suppliers = data.suppliers;
	}

	async function deleteSupplier(id) {
		if (!confirm('Hapus supplier ini?')) return;
		const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
		const d = await res.json();
		if (!res.ok) {
			alert(d.error || 'Gagal menghapus supplier');
			return;
		}
		await invalidateAll();
		suppliers = data.suppliers;
	}

	let filtered = $derived(
		suppliers.filter((s) =>
			s.name.toLowerCase().includes(search.toLowerCase()) ||
			(s.address && s.address.toLowerCase().includes(search.toLowerCase())) ||
			(s.phone && s.phone.toLowerCase().includes(search.toLowerCase()))
		)
	);

	// --- EXPORT PDF ---
	function exportPDF() {
		const doc = new jsPDF();
		doc.text('DATA SUPLIER INVENTARIS', 14, 15);
		doc.setFontSize(10);
		doc.text(`Dicetak tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

		const tableData = filtered.map((s, idx) => [
			idx + 1,
			s.name,
			s.address || '-',
			s.phone || '-',
			s.email || '-'
		]);

		autoTable(doc, {
			startY: 25,
			head: [['NO', 'NAMA SUPLIER', 'ALAMAT', 'TELEPON', 'EMAIL']],
			body: tableData
		});

		doc.save('Data_Suplier.pdf');
	}

	// --- PRINT WINDOW ---
	function printData() {
		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		let tableRows = '';
		filtered.forEach((s, idx) => {
			tableRows += `
				<tr>
					<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
					<td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${s.name}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">${s.address || '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">${s.phone || '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">${s.email || '-'}</td>
				</tr>
			`;
		});

		printWindow.document.write(`
			<html>
				<head>
					<title>Cetak Data Suplier</title>
					<style>
						body { font-family: sans-serif; padding: 20px; }
						table { width: 100%; border-collapse: collapse; margin-top: 20px; }
						th { background-color: #f2f2f2; text-align: left; }
					</style>
				</head>
				<body>
					<h2>DATA SUPLIER INVENTARIS</h2>
					<p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
					<table>
						<thead>
							<tr>
								<th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 50px;">NO</th>
								<th style="border: 1px solid #ddd; padding: 8px;">NAMA SUPLIER</th>
								<th style="border: 1px solid #ddd; padding: 8px;">ALAMAT</th>
								<th style="border: 1px solid #ddd; padding: 8px;">TELEPON</th>
								<th style="border: 1px solid #ddd; padding: 8px;">EMAIL</th>
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

<svelte:head><title>Suplier – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans">
	<!-- Page Header & Breadcrumb -->
	<div class="flex items-center justify-between pb-2 border-b border-gray-200">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Suplier <span class="text-sm text-gray-500 font-light">Data Suplier</span>
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

	<!-- Main Box (AdminLTE Box Style seperti di Gambar 3) -->
	<div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
		<div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
			<h3 class="font-normal text-gray-800 text-base">Suplier</h3>
			<div class="flex items-center gap-1">
				<button onclick={openAdd} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
					Tambah Suplier Baru
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

			<!-- Table Supplier -->
			<div class="overflow-x-auto">
				<table class="w-full text-sm text-left border border-gray-200">
					<thead class="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-xs">
						<tr>
							<th class="p-3 border-r border-gray-200 w-12 text-center">NO</th>
							<th class="p-3 border-r border-gray-200">NAMA SUPLIER</th>
							<th class="p-3 border-r border-gray-200">ALAMAT</th>
							<th class="p-3 border-r border-gray-200">TELEPON</th>
							<th class="p-3 border-r border-gray-200">EMAIL</th>
							<th class="p-3 text-center w-24">OPSI</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each filtered as s, index (s.id)}
							<tr class="hover:bg-gray-50 text-gray-700">
								<td class="p-3 border-r border-gray-200 text-center">{index + 1}</td>
								<td class="p-3 border-r border-gray-200 font-semibold">{s.name}</td>
								<td class="p-3 border-r border-gray-200">{s.address || '-'}</td>
								<td class="p-3 border-r border-gray-200">{s.phone || '-'}</td>
								<td class="p-3 border-r border-gray-200">{s.email || '-'}</td>
								<td class="p-3 text-center">
									<div class="flex items-center justify-center gap-1">
										<button type="button" onclick={() => openEdit(s)} class="bg-[#F39C12] hover:bg-[#E08E0B] text-white p-1.5 rounded shadow-sm" title="Edit">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
											</svg>
										</button>
										<button type="button" onclick={() => deleteSupplier(s.id)} class="bg-[#DD4B39] hover:bg-[#D73925] text-white p-1.5 rounded shadow-sm" title="Hapus">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="p-6 text-center text-gray-500">
									{search ? 'Data tidak ditemukan' : 'Tidak ada data supplier.'}
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

<!-- Modal Form Supplier -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-md overflow-hidden">
			<div class="bg-[#3C8DBC] px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal">{editSupplier ? 'Edit Suplier' : 'Tambah Suplier Baru'}</h4>
				<button type="button" onclick={() => showModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={save} class="p-5 space-y-4">
				{#if error}
					<div class="bg-red-50 text-red-600 p-2 text-sm border-l-2 border-red-500 mb-3">{error}</div>
				{/if}
				<div>
					<label for="name" class="block text-sm font-bold text-gray-700 mb-1">Nama Suplier</label>
					<input id="name" type="text" bind:value={form.name} required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>
				<div>
					<label for="address" class="block text-sm font-bold text-gray-700 mb-1">Alamat</label>
					<input id="address" type="text" bind:value={form.address} class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>
				<div>
					<label for="phone" class="block text-sm font-bold text-gray-700 mb-1">Telepon</label>
					<input id="phone" type="text" bind:value={form.phone} class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>
				<div>
					<label for="email" class="block text-sm font-bold text-gray-700 mb-1">Email</label>
					<input id="email" type="email" bind:value={form.email} class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
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