<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { BrowserMultiFormatReader } from '@zxing/library';

  let { 
    onScan,
    onClose,
    title = 'Pindai Barcode / QR Code',
    isModal = false
  }: { 
    onScan?: (result: string) => void;
    onClose?: () => void;
    title?: string;
    isModal?: boolean;
  } = $props();

  let scanner: BrowserMultiFormatReader | null = null;
  let videoElement: HTMLVideoElement;
  let result = $state('');
  let error = $state('');
  let scanning = $state(false);
  let availableDevices: MediaDeviceInfo[] = $state([]);
  let selectedDeviceId = $state<string | null>(null);
  let hasTorch = $state(false);
  let torchOn = $state(false);

  function playBeep() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // AudioContext not allowed or supported
    }
  }

  onMount(async () => {
    scanner = new BrowserMultiFormatReader();
    try {
      const devices = await scanner.listVideoInputDevices();
      availableDevices = devices;
      if (devices.length > 0) {
        // Default to back camera (environment) if available
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('belakang') || d.label.toLowerCase().includes('environment'));
        selectedDeviceId = backCamera ? backCamera.deviceId : devices[0].deviceId;
      }
    } catch (err: any) {
      console.warn('Gagal membaca daftar kamera', err);
    }
    startScanning();
  });

  onDestroy(() => {
    stopScanner();
  });

  function stopScanner() {
    if (scanner) {
      try {
        scanner.reset();
      } catch (e) {}
    }
    scanning = false;
  }

  function startScanning() {
    if (!scanner || !videoElement) return;
    error = '';
    scanning = true;

    try {
      scanner.decodeFromVideoDevice(selectedDeviceId, videoElement, (res, err) => {
        if (res) {
          result = res.getText();
          scanning = false;
          playBeep();
          if (onScan) onScan(result);
          stopScanner();
        }
        if (err && err.name !== 'NotFoundException') {
          // Hanya set error jika bukan NotFoundException biasa
          error = err.message || 'Gagal membaca kode';
        }
      });
    } catch (e: any) {
      error = e.message || 'Tidak dapat mengakses kamera';
    }
  }

  function changeDevice(id: string) {
    selectedDeviceId = id;
    stopScanner();
    startScanning();
  }

  function rescan() {
    result = '';
    error = '';
    startScanning();
  }
</script>

{#snippet scannerBody()}
  <div class="relative w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-black shadow-lg">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={videoElement} class="w-full aspect-[4/3] object-cover"></video>
    
    <!-- Aiming Box Indicator -->
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
      <div class="relative w-full h-full border-2 border-dashed border-sky-400/80 rounded-lg animate-pulse">
        <div class="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-sky-400"></div>
        <div class="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-sky-400"></div>
        <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-sky-400"></div>
        <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-sky-400"></div>
      </div>
    </div>

    <!-- Controls Overlay -->
    {#if availableDevices.length > 1}
      <div class="absolute top-2 right-2 bg-black/60 rounded px-2 py-1">
        <select
          class="bg-transparent text-white text-xs outline-none"
          value={selectedDeviceId}
          onchange={(e) => changeDevice((e.target as HTMLSelectElement).value)}
        >
          {#each availableDevices as dev, idx}
            <option value={dev.deviceId} class="text-black">{dev.label || `Kamera ${idx + 1}`}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  {#if result}
    <div class="mt-3 p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-sm flex items-center justify-between shadow-sm">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span><strong>Hasil:</strong> <code class="bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold text-xs">{result}</code></span>
      </div>
      <button type="button" onclick={rescan} class="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md transition">
        Scan Ulang
      </button>
    </div>
  {/if}

  {#if error}
    <div class="mt-3 p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-200 text-sm flex items-center justify-between shadow-sm">
      <span class="text-xs">{error}</span>
      <button type="button" onclick={rescan} class="text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-md transition">
        Coba Lagi
      </button>
    </div>
  {/if}
{/snippet}

{#if isModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in duration-150">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
          </div>
          <h3 class="font-semibold text-gray-800 text-base">{title}</h3>
        </div>
        {#if onClose}
          <button
            type="button"
            onclick={() => { stopScanner(); onClose(); }}
            class="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        {/if}
      </div>

      {@render scannerBody()}

      <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end">
        {#if onClose}
          <button
            type="button"
            onclick={() => { stopScanner(); onClose(); }}
            class="px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Tutup
          </button>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="scanner-container">
    {@render scannerBody()}
  </div>
{/if}
