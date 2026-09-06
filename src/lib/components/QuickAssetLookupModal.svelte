<script lang="ts">
  import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';
  import { calculateStraightLineDepreciation, formatRupiah } from '$lib/depreciation';
  import { toast } from 'svelte-sonner';

  let { onClose }: { onClose: () => void } = $props();

  let isScanning = $state(true);
  let loading = $state(false);
  let scannedCode = $state('');
  let asset = $state<any>(null);
  let errorMsg = $state('');

  async function handleScan(code: string) {
    scannedCode = code.trim();
    isScanning = false;
    await lookupAsset(scannedCode);
  }

  async function lookupAsset(code: string) {
    loading = true;
    errorMsg = '';
    asset = null;

    try {
      // Find asset by code or serial number
      const res = await fetch(`/api/assets?search=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        const found = data.assets?.find((a: any) => 
          a.assetCode.toLowerCase() === code.toLowerCase() || 
          (a.serialNumber && a.serialNumber.toLowerCase() === code.toLowerCase())
        );

        if (found) {
          asset = found;
        } else if (data.assets && data.assets.length > 0) {
          asset = data.assets[0];
        } else {
          errorMsg = `Aset dengan kode atau serial number "${code}" tidak ditemukan.`;
        }
      } else {
        errorMsg = 'Gagal memuat data aset dari server.';
      }
    } catch (e: any) {
      errorMsg = e.message || 'Terjadi kesalahan saat mencari aset.';
    } finally {
      loading = false;
    }
  }

  let dep = $derived(
    asset ? calculateStraightLineDepreciation(asset.price, asset.salvageValue, asset.usefulLifeMonths, asset.purchaseDate) : null
  );
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
  <div class="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
    <!-- Modal Header -->
    <div class="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
        </div>
        <div>
          <h3 class="font-bold text-gray-800 text-lg">Quick Asset Lookup</h3>
          <p class="text-xs text-gray-500">Arahkan kamera ke barcode/QR label aset</p>
        </div>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Scanner / Search Bar -->
    {#if isScanning}
      <div class="space-y-4">
        <BarcodeScanner onScan={handleScan} />
        
        <div class="relative flex py-2 items-center">
          <div class="flex-grow border-t border-gray-200"></div>
          <span class="flex-shrink mx-4 text-xs text-gray-400 uppercase">Atau Masukkan Manual</span>
          <div class="flex-grow border-t border-gray-200"></div>
        </div>

        <form onsubmit={(e) => { e.preventDefault(); if (scannedCode) handleScan(scannedCode); }} class="flex gap-2">
          <input
            type="text"
            bind:value={scannedCode}
            placeholder="Ketik Kode Aset atau No. Seri..."
            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
          >
            Cari
          </button>
        </form>
      </div>
    {:else}
      {#if loading}
        <div class="py-12 text-center text-gray-500">
          <div class="inline-block animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3"></div>
          <p class="text-sm">Memuat data aset...</p>
        </div>
      {:else if errorMsg}
        <div class="py-6 text-center space-y-4">
          <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <p class="text-sm text-gray-700 font-medium">{errorMsg}</p>
          <button
            type="button"
            onclick={() => { isScanning = true; scannedCode = ''; }}
            class="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg transition"
          >
            Scan Ulang
          </button>
        </div>
      {:else if asset}
        <!-- Asset Information Card -->
        <div class="space-y-4">
          <div class="flex items-start justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span class="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{asset.assetCode}</span>
              <h4 class="text-lg font-bold text-gray-900 mt-1">{asset.name}</h4>
              <p class="text-xs text-gray-500">SN: {asset.serialNumber || 'Tidak ada'}</p>
            </div>
            <div class="flex flex-col items-end gap-1.5">
              <span class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full {asset.status === 'TERSEDIA' ? 'bg-green-100 text-green-800' : asset.status === 'DIPINJAM' ? 'bg-amber-100 text-amber-800' : asset.status === 'UNDER_MAINTENANCE' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}">
                {asset.status}
              </span>
              <span class="text-[11px] font-medium text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded">
                Kondisi: {asset.condition}
              </span>
            </div>
          </div>

          <!-- Key Details Grid -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span class="text-gray-400 block mb-0.5">Lokasi & PIC</span>
              <p class="font-semibold text-gray-800">{asset.location?.name || 'Gudang Utama'}</p>
              <p class="text-gray-600">{asset.pic || 'Tidak ada PIC'}</p>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span class="text-gray-400 block mb-0.5">Kategori & Brand</span>
              <p class="font-semibold text-gray-800">{asset.category?.name || '-'}</p>
              <p class="text-gray-600">{asset.brand?.name || '-'}</p>
            </div>
          </div>

          <!-- Straight-Line Depreciation Valuation -->
          {#if dep}
            <div class="p-4 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl border border-indigo-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-indigo-900 uppercase tracking-wide">Valuasi & Nilai Buku Aset</span>
                <span class="text-xs font-semibold text-indigo-600">Umur: {dep.monthsUsed} / {dep.usefulLifeMonths} Bln</span>
              </div>
              
              <div class="grid grid-cols-3 gap-2 text-center py-2 bg-white/70 backdrop-blur rounded-lg border border-indigo-100">
                <div>
                  <span class="text-[10px] text-gray-500 block">Harga Beli</span>
                  <span class="font-bold text-xs text-gray-800">{formatRupiah(dep.initialCost)}</span>
                </div>
                <div>
                  <span class="text-[10px] text-gray-500 block">Akumulasi Susut</span>
                  <span class="font-bold text-xs text-rose-600">-{formatRupiah(dep.accumulatedDepreciation)}</span>
                </div>
                <div>
                  <span class="text-[10px] text-gray-500 block">Nilai Buku Kini</span>
                  <span class="font-bold text-xs text-emerald-700">{formatRupiah(dep.currentBookValue)}</span>
                </div>
              </div>

              <!-- Progress bar of depreciation -->
              <div class="mt-3">
                <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>Penyusutan Nilai: {dep.depreciationPercentage}%</span>
                  <span>{dep.isFullyDepreciated ? 'Telah Habis Masa Manfaat' : `Sisa ${dep.remainingMonths} bln`}</span>
                </div>
                <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500 transition-all duration-300" style="width: {dep.depreciationPercentage}%"></div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Action Buttons -->
          <div class="flex gap-2 pt-2">
            <button
              type="button"
              onclick={() => { isScanning = true; scannedCode = ''; }}
              class="flex-1 py-2 px-3 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              Scan Aset Lain
            </button>
            <a
              href={`/inventory/assets?search=${asset.assetCode}`}
              class="flex-1 py-2 px-3 text-center text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Buka di Buku Induk
            </a>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
