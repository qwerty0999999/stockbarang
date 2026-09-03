<script lang="ts">
	import { onMount } from 'svelte';
	
	let { data } = $props();
	let items = $derived(data.items);

	function formatRupiah(n: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
	}

	onMount(() => {
		// Auto print saat halaman selesai dimuat
		setTimeout(() => {
			window.print();
		}, 500);
	});
</script>

<svelte:head>
	<title>Cetak Daftar Barang</title>
</svelte:head>

<div class="print-container">
	<div class="header">
		<h2>Laporan Stok Barang</h2>
		<p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
	</div>

	<table class="print-table">
		<thead>
			<tr>
				<th>NO</th>
				<th>NAMA</th>
				<th>SPESIFIKASI / LOKASI</th>
				<th>JUMLAH</th>
				<th>HARGA</th>
				<th>KATEGORI</th>
			</tr>
		</thead>
		<tbody>
			{#each items as item, index}
				<tr>
					<td class="center">{index + 1}</td>
					<td>{item.name}</td>
					<td>
						<div>{item.sku || '-'}</div>
						<div class="text-small">{item.location || '-'}</div>
					</td>
					<td class="center">{item.quantity}</td>
					<td>{formatRupiah(item.price)}</td>
					<td>{item.category?.name || '-'}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" class="center">Tidak ada data barang.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* Hapus style layout utama SvelteKit khusus untuk print page ini dengan absolute positioning */
	:global(body) {
		background: #fff;
		margin: 0;
		padding: 0;
	}

	.print-container {
		padding: 20px;
		font-family: Arial, sans-serif;
		color: #000;
		background: #fff;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		min-height: 100vh;
		z-index: 9999; /* Tutupi UI Layout */
	}

	.header {
		text-align: center;
		margin-bottom: 20px;
	}
	.header h2 {
		margin: 0 0 5px 0;
		font-size: 24px;
	}
	.header p {
		margin: 0;
		font-size: 14px;
		color: #555;
	}

	.print-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.print-table th, .print-table td {
		border: 1px solid #000;
		padding: 8px;
		text-align: left;
	}

	.print-table th {
		background-color: #f2f2f2;
		font-weight: bold;
		text-align: center;
	}

	.center {
		text-align: center;
	}
	
	.text-small {
		font-size: 10px;
		color: #666;
	}

	@media print {
		.print-container {
			padding: 0;
			position: static;
		}
		@page {
			margin: 1cm;
		}
	}
</style>
