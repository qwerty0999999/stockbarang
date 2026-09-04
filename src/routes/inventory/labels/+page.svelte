<script lang="ts">
  import LabelGenerator from '$lib/components/barcode/LabelGenerator.svelte';
  import { page } from '$app/stores';

  let { data } = $props();

  let itemSource = $state<'item' | 'asset'>('item');
  let selectedItem = $state("");
  let selectedAsset = $state("");
  let labelType = $state<'barcode' | 'qrcode'>('barcode');
  let customValue = $state("");
  let customLabel = $state("");
  
  let activeValue = $derived(
    customValue || 
    (itemSource === 'item' && selectedItem 
      ? (data.items.find((i: any) => i.id.toString() === selectedItem)?.sku || selectedItem)
      : (itemSource === 'asset' && selectedAsset 
        ? (data.assets?.find((a: any) => a.id.toString() === selectedAsset)?.assetCode || selectedAsset) 
        : ""))
  );

  let activeLabel = $derived(
    customLabel || 
    (itemSource === 'item' && selectedItem 
      ? data.items.find((i: any) => i.id.toString() === selectedItem)?.name 
      : (itemSource === 'asset' && selectedAsset 
        ? data.assets?.find((a: any) => a.id.toString() === selectedAsset)?.name 
        : ""))
  );

  // Batch Printing
  let selectedIds = $derived($page.url.searchParams.get('ids')?.split(',') || []);
  let selectedItems = $derived(selectedIds.length > 0 ? data.items.filter((i: any) => selectedIds.includes(i.id.toString())) : []);
</script>

<svelte:head><title>Label & Barcode Generator – InventarisApp</title></svelte:head>

<div class="space-y-6 font-sans">
  <!-- Header -->
  <div class="flex justify-between items-center pb-2 border-b border-gray-200">
    <div>
      <h1 class="text-2xl font-normal text-gray-800">Label, Barcode & QR Code Generator</h1>
      <p class="text-xs text-gray-500">Cetak label identitas untuk Barang Konsumsi dan Aset Tetap (Buku Induk)</p>
    </div>
    {#if selectedItems.length > 0}
      <a href="/inventory/items" class="text-xs text-blue-600 hover:underline">Kembali ke Data Barang</a>
    {/if}
  </div>

  {#if selectedItems.length > 0}
    <div class="bg-white rounded-none border-t-4 border-[#3C8DBC] shadow p-5 mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-base font-semibold text-gray-800">Cetak Massal ({selectedItems.length} Label Barang)</h2>
        <div class="flex gap-4 text-xs font-semibold">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" bind:group={labelType} value="barcode" name="batchType" /> Barcode
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
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
    <!-- Form Pengaturan Label -->
    <div class="bg-white rounded-none border-t-4 border-[#3C8DBC] shadow p-5 space-y-4">
      <h2 class="text-base font-semibold text-gray-800 border-b pb-2">Pengaturan Label</h2>
      
      <div>
        <span class="block text-xs font-bold text-gray-700 mb-1">Format Kode</span>
        <div class="flex gap-4">
          <label class="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
            <input type="radio" bind:group={labelType} value="barcode" name="type" /> Barcode (1D Code128)
          </label>
          <label class="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
            <input type="radio" bind:group={labelType} value="qrcode" name="type" /> QR Code (2D Matrix)
          </label>
        </div>
      </div>

      <div>
        <span class="block text-xs font-bold text-gray-700 mb-1">Sumber Data</span>
        <div class="flex gap-4 p-2 bg-gray-50 rounded border">
          <label class="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
            <input type="radio" bind:group={itemSource} value="item" onchange={() => { customValue = ''; customLabel = ''; selectedAsset = ''; }} /> Barang Konsumsi (Stok)
          </label>
          <label class="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
            <input type="radio" bind:group={itemSource} value="asset" onchange={() => { customValue = ''; customLabel = ''; selectedItem = ''; }} /> Aset Tetap (Buku Induk)
          </label>
        </div>
      </div>

      {#if itemSource === 'item'}
        <div>
          <label for="selectItem" class="block text-xs font-bold text-gray-700 mb-1">Pilih Barang Konsumsi</label>
          <select id="selectItem" bind:value={selectedItem} class="w-full border border-gray-300 rounded-sm p-2 text-sm bg-white" onchange={() => {customValue = ''; customLabel = '';}}>
            <option value="">-- Pilih dari data barang --</option>
            {#each data.items as item}
              <option value={item.id.toString()}>{item.name} ({item.sku || `ID: ${item.id}`})</option>
            {/each}
          </select>
        </div>
      {:else}
        <div>
          <label for="selectAsset" class="block text-xs font-bold text-gray-700 mb-1">Pilih Aset Tetap</label>
          <select id="selectAsset" bind:value={selectedAsset} class="w-full border border-gray-300 rounded-sm p-2 text-sm bg-white" onchange={() => {customValue = ''; customLabel = '';}}>
            <option value="">-- Pilih dari Buku Induk Aset --</option>
            {#each (data.assets || []) as asset}
              <option value={asset.id.toString()}>{asset.name} [{asset.assetCode}]</option>
            {/each}
          </select>
        </div>
      {/if}
      
      <div class="relative pt-3">
        <div class="absolute inset-0 flex items-center" aria-hidden="true">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center">
          <span class="bg-white px-2 text-xs text-gray-500 font-semibold uppercase">Atau Input Manual</span>
        </div>
      </div>

      <div>
        <label for="valInput" class="block text-xs font-bold text-gray-700 mb-1">Nilai / Kode Label</label>
        <input id="valInput" type="text" bind:value={customValue} class="w-full border border-gray-300 rounded-sm p-2 text-sm font-mono" placeholder="Contoh: AST-2026-0001" oninput={() => { selectedItem = ''; selectedAsset = ''; }} />
      </div>

      <div>
        <label for="lblInput" class="block text-xs font-bold text-gray-700 mb-1">Teks Keterangan Tampilan</label>
        <input id="lblInput" type="text" bind:value={customLabel} class="w-full border border-gray-300 rounded-sm p-2 text-sm" placeholder="Contoh: Laptop ThinkPad - Ruang IT" />
      </div>
    </div>

    <!-- Preview Box -->
    <div class="bg-gray-50 rounded-none shadow p-6 border border-gray-200 flex flex-col items-center justify-center min-h-[340px]">
      <h2 class="text-sm font-bold text-gray-700 mb-4 self-start w-full border-b pb-2">Preview Label Cetak</h2>
      
      {#if activeValue}
        <LabelGenerator 
          value={activeValue} 
          type={labelType} 
          label={activeLabel} 
        />
        <p class="text-xs text-gray-500 mt-4 text-center">Klik tombol Cetak di atas untuk mencetak label langsung ke printer thermal / kertas label.</p>
      {:else}
        <div class="text-gray-400 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <p class="text-xs">Pilih barang/aset atau masukkan kode manual untuk melihat preview</p>
        </div>
      {/if}
    </div>
  </div>
</div>