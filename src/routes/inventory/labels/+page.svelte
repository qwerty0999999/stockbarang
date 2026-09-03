<script lang="ts">
  import LabelGenerator from '$lib/components/barcode/LabelGenerator.svelte';
  import { page } from '$app/stores';

  let { data } = $props();

  let selectedItem = $state("");
  let labelType = $state<'barcode' | 'qrcode'>('barcode');
  let customValue = $state("");
  let customLabel = $state("");
  
  let activeValue = $derived(customValue || (selectedItem ? data.items.find((i) => i.id.toString() === selectedItem)?.sku || data.items.find((i) => i.id.toString() === selectedItem)?.id.toString() : ""));
  let activeLabel = $derived(customLabel || (selectedItem ? data.items.find((i) => i.id.toString() === selectedItem)?.name : ""));

  // Batch Printing
  let selectedIds = $derived($page.url.searchParams.get('ids')?.split(',') || []);
  let selectedItems = $derived(selectedIds.length > 0 ? data.items.filter(i => selectedIds.includes(i.id.toString())) : []);
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold text-gray-900">Label & Barcode Generator</h1>
    {#if selectedItems.length > 0}
      <a href="/inventory/items" class="text-sm text-blue-600 hover:underline">Kembali ke Data Barang</a>
    {/if}
  </div>

  {#if selectedItems.length > 0}
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold">Cetak Massal ({selectedItems.length} Label)</h2>
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={labelType} value="barcode" name="batchType" /> Barcode
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={labelType} value="qrcode" name="batchType" /> QR Code
          </label>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {#each selectedItems as item}
          <LabelGenerator 
            value={item.sku || item.id.toString()} 
            type={labelType} 
            label={item.name} 
          />
        {/each}
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 class="text-lg font-semibold border-b pb-2">Pengaturan Label</h2>
      
      <div>
        <span class="block text-sm font-medium text-gray-700 mb-1">Tipe</span>
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={labelType} value="barcode" name="type" /> Barcode
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={labelType} value="qrcode" name="type" /> QR Code
          </label>
        </div>
      </div>

      <div>
        <label for="selectItem" class="block text-sm font-medium text-gray-700 mb-1">Pilih Produk</label>
        <select id="selectItem" bind:value={selectedItem} class="w-full border rounded-md p-2" onchange={() => {customValue = ''; customLabel = '';}}>
          <option value="">-- Pilih dari inventory --</option>
          {#each data.items as item}
            <option value={item.id.toString()}>{item.name} ({item.sku || `ID: ${item.id}`})</option>
          {/each}
        </select>
      </div>
      
      <div class="relative pt-4">
        <div class="absolute inset-0 flex items-center" aria-hidden="true">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center">
          <span class="bg-white px-2 text-sm text-gray-500">ATAU INPUT MANUAL</span>
        </div>
      </div>

      <div>
        <label for="valInput" class="block text-sm font-medium text-gray-700 mb-1">Nilai / Kode</label>
        <input id="valInput" type="text" bind:value={customValue} class="w-full border rounded-md p-2" placeholder="Contoh: BATCH-001" oninput={() => selectedItem = ''} />
      </div>

      <div>
        <label for="lblInput" class="block text-sm font-medium text-gray-700 mb-1">Teks Tampilan (Opsional)</label>
        <input id="lblInput" type="text" bind:value={customLabel} class="w-full border rounded-md p-2" placeholder="Contoh: Kaos Vintage Rp 50.000" />
      </div>
    </div>

    <div class="bg-gray-50 rounded-lg shadow p-6 border flex flex-col items-center justify-center min-h-[300px]">
      <h2 class="text-lg font-semibold mb-6 self-start w-full border-b pb-2">Preview (Pratinjau)</h2>
      
      {#if activeValue}
        <LabelGenerator 
          value={activeValue} 
          type={labelType} 
          label={activeLabel} 
        />
        <p class="text-xs text-gray-500 mt-4 text-center">Pastikan printer terhubung (bluetooth/kabel) saat menekan tombol cetak.</p>
      {:else}
        <div class="text-gray-400 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <p>Pilih produk atau masukkan kode manual untuk melihat preview</p>
        </div>
      {/if}
    </div>
  </div>
</div>