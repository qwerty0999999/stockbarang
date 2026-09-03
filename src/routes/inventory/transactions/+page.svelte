<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let { data } = $props();
	let transactions = $derived(data.transactions);
	let items = $derived(data.items);
	let suppliers = $derived(data.suppliers || []);
	
	let showModal = $state(false);
	let loading = $state(false);
	let error = $state('');
	let search = $state('');

	let activeType = $derived($page.url.searchParams.get('type') || 'MASUK');

	let form = $state({ itemId: '', type: 'MASUK', quantity: 1, reference: '', notes: '', supplierId: '' });

	function openModal() {
		form = { itemId: items.length ? items[0].id.toString() : '', type: activeType, quantity: 1, reference: '', notes: '', supplierId: '' };
		error = '';
		showModal = true;
	}

	async function save(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		
		const res = await fetch('/api/transactions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...form, itemId: parseInt(form.itemId), quantity: parseInt(form.quantity.toString()) })
		});
		
		const d = await res.json();
		loading = false;
		
		if (!res.ok) { error = d.error || 'Gagal menyimpan transaksi'; return; }
		
		showModal = false;
		await invalidateAll();
	}

	let filtered = $derived(
		transactions.filter((t: any) => {
			const matchName = t.item?.name.toLowerCase().includes(search.toLowerCase());
			const matchType = t.type === activeType;
			return matchName && matchType;
		})
	);

	function formatDate(d: string | Date | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', { 
			day: '2-digit', month: 'short', year: 'numeric' 
		});
	}
</script>

<svelte:head><title>Barang {activeType === 'MASUK' ? 'Masuk' : 'Keluar'} – InventarisApp</title></svelte:head>

<div class="space-y-4 font-sans">
	<!-- Page Header & Breadcrumb -->
	<div class="flex items-center justify-between pb-2 border-b border-gray-200">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Barang {activeType === 'MASUK' ? 'Masuk' : 'Keluar'} 
				<span class="text-sm text-gray-500 font-light">Data Transaksi Barang {activeType === 'MASUK' ? 'Masuk' : 'Keluar'}</span>
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

	<!-- Main Box AdminLTE Style -->
	<div class="bg-white shadow rounded-none border-t-4 border-[#3C8DBC]">
		<div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
			<h3 class="font-normal text-gray-800 text-base">Data Barang {activeType === 'MASUK' ? 'Masuk' : 'Keluar'}</h3>
			<button onclick={openModal} class="bg-[#3CA2E0] hover:bg-[#3692CA] text-white px-3 py-1.5 text-xs font-semibold rounded-sm shadow-sm flex items-center gap-1 transition-colors">
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
				Tambah Barang {activeType === 'MASUK' ? 'Masuk' : 'Keluar'}
			</button>
		</div>

		<div class="p-4">
			<!-- Search Box -->
			<div class="mb-4 flex justify-end">
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold text-gray-700">Search:</span>
					<input type="text" bind:value={search} class="border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm w-48" />
				</div>
			</div>

			<!-- Table Transaksi AdminLTE Style -->
			<div class="overflow-x-auto">
				<table class="w-full text-sm text-left border border-gray-200">
					<thead class="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-xs">
						<tr>
							<th class="p-3 border-r border-gray-200 w-12 text-center">NO</th>
							<th class="p-3 border-r border-gray-200">TANGGAL</th>
							<th class="p-3 border-r border-gray-200">NAMA BARANG</th>
							<th class="p-3 border-r border-gray-200 text-center">JUMLAH</th>
							<th class="p-3 border-r border-gray-200">REFERENSI / PENGIRIM / PENERIMA</th>
							<th class="p-3 border-r border-gray-200">CATATAN</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each filtered as tx, index (tx.id)}
							<tr class="hover:bg-gray-50 text-gray-700">
								<td class="p-3 border-r border-gray-200 text-center">{index + 1}</td>
								<td class="p-3 border-r border-gray-200 font-semibold">{formatDate(tx.createdAt)}</td>
								<td class="p-3 border-r border-gray-200 font-bold">{tx.item?.name}</td>
								<td class="p-3 border-r border-gray-200 text-center font-bold {activeType === 'MASUK' ? 'text-green-600' : 'text-red-600'}">
									{activeType === 'MASUK' ? '+' : '-'}{tx.quantity}
								</td>
								<td class="p-3 border-r border-gray-200">{tx.reference || '-'}</td>
								<td class="p-3 border-r border-gray-200">{tx.notes || '-'}</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="p-6 text-center text-gray-500">
									{search ? 'Data tidak ditemukan' : `Belum ada riwayat transaksi barang ${activeType.toLowerCase()}.`}
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

<!-- Modal Form Transaksi AdminLTE Style -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
		<div class="bg-white rounded-none shadow-xl w-full max-w-md overflow-hidden">
			<div class="bg-[#3C8DBC] px-4 py-3 flex items-center justify-between text-white">
				<h4 class="font-normal">Catat Barang {activeType === 'MASUK' ? 'Masuk' : 'Keluar'}</h4>
				<button type="button" aria-label="Close" onclick={() => showModal = false} class="text-white hover:text-gray-200">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
			<form onsubmit={save} class="p-5 space-y-4">
				{#if error}
					<div class="bg-red-50 text-red-600 p-2 text-sm border-l-2 border-red-500 mb-3">{error}</div>
				{/if}
				<div>
					<label for="itemId" class="block text-sm font-bold text-gray-700 mb-1">Pilih Barang</label>
					<select id="itemId" bind:value={form.itemId} required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm bg-white">
						{#each items as item}
							<option value={item.id.toString()}>{item.name} (Stok: {item.quantity})</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="qty" class="block text-sm font-bold text-gray-700 mb-1">Jumlah</label>
					<input id="qty" type="number" bind:value={form.quantity} min="1" required class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>
				<div>
					<label for="reference" class="block text-sm font-bold text-gray-700 mb-1">
						{activeType === 'MASUK' ? 'Supplier / Pengirim' : 'Tujuan / Penerima'}
					</label>
					<input id="reference" type="text" bind:value={form.reference} placeholder="Opsional" class="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm" />
				</div>
				<div>
					<label for="notes" class="block text-sm font-bold text-gray-700 mb-1">Catatan Tambahan</label>
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
