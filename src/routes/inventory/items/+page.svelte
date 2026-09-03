<script lang="ts">
import { page } from '$app/stores';
import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';
import type { PageData } from './$types';
import { toast } from 'svelte-sonner';

  let { data }: { data: PageData } = $props();
  let scannedItemId: string = '';
  let manualInput: string = '';
  let items = data.items || [];
  let selectedItem = null;

  function handleScan(result: string) {
    scannedItemId = result;
    // Cari item berdasarkan SKU atau ID
    const foundItem = items.find(item => item.sku === result || item.id.toString() === result);
    if (foundItem) {
      selectedItem = foundItem;
    }
  }

  function handleManualInput() {
    // Implementasi untuk input manual
    const foundItem = items.find(item => item.sku === manualInput || item.id.toString() === manualInput);
    if (foundItem) {
      selectedItem = foundItem;
    }
  }

  function handleTransaction(type: string) {
    // Logika untuk transaksi masuk/keluar
    console.log('Transaction type:', type, 'for item:', selectedItem);
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
        toast.success(`Berhasil import ${result.count} item`);
        // Reload data
        window.location.reload();
      } else {
        toast.error(result.error || 'Import gagal');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan');
    }
    input.value = '';
  }
</script>

<div class="page-wrap">
  <div class="page-header">
    <h1>Daftar Barang</h1>
    <div class="page-actions">
      <button on:click={() => document.getElementById('csvInput')?.click()} class="btn btn-primary">Import CSV</button>
      <a href="/api/import-export?type=items" class="btn btn-success">Export CSV</a>
      <button on:click={() => selectedItem = null} class="btn btn-secondary">Reset</button>
    </div>
  </div>
  <input type="file" id="csvInput" accept=".csv" style="display:none" on:change={handleImport} />

  <div class="main-content">
    <div class="scanner-section">
      <h2>Scan Barcode/QR</h2>
      <BarcodeScanner onScan={handleScan} />
      <div class="manual-input">
        <input type="text" bind:value={manualInput} placeholder="Masukkan SKU atau ID" />
        <button on:click={handleManualInput}>Cari</button>
      </div>
    </div>

    {#if selectedItem}
      <div class="item-details">
        <h2>Detail Barang</h2>
        <div class="item-info">
          <p><strong>Nama:</strong> {selectedItem.name}</p>
          <p><strong>SKU:</strong> {selectedItem.sku}</p>
          <p><strong>Stok:</strong> {selectedItem.quantity}</p>
          <p><strong>Harga:</strong> Rp {selectedItem.price.toLocaleString()}</p>
        </div>
        <div class="transaction-actions">
          <button on:click={() => handleTransaction('MASUK')} class="btn btn-success">Barang Masuk</button>
          <button on:click={() => handleTransaction('KELUAR')} class="btn btn-danger">Barang Keluar</button>
          <button on:click={() => handleTransaction('ADJUSTMENT')} class="btn btn-warning">Penyesuaian</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-wrap {
    padding: 20px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .page-actions {
    display: flex;
    gap: 10px;
  }

  .scanner-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .manual-input {
    margin-top: 15px;
    display: flex;
    gap: 10px;
  }

  .manual-input input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    flex: 1;
  }

  .manual-input button {
    padding: 8px 16px;
    background: #3c8dbc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .item-details {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .item-info {
    margin-bottom: 20px;
  }

  .item-info p {
    margin: 8px 0;
  }

  .transaction-actions {
    display: flex;
    gap: 10px;
  }

  .btn {
    padding: 10px 15px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: bold;
  }

  .btn-success {
    background: #28a745;
    color: white;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-warning {
    background: #ffc107;
    color: black;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  .btn-primary {
    background: #007bff;
    color: white;
  }
  .btn-success {
    background: #28a745;
    color: white;
  }
  .btn-danger {
    background: #dc3545;
    color: white;
  }
  .btn-warning {
    background: #ffc107;
    color: black;
  }
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    text-decoration: none;
    display: inline-block;
  }
  .page-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
</style>