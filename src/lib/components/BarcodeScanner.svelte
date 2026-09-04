<script lang="ts">
  import { onMount } from 'svelte';
  import { BrowserMultiFormatReader } from '@zxing/library';

  let { onScan }: { onScan?: (result: string) => void } = $props();

  let scanner: BrowserMultiFormatReader | null = null;
  let videoElement: HTMLVideoElement;
  let result = $state('');
  let error = $state('');
  let scanning = $state(false);

  onMount(() => {
    scanner = new BrowserMultiFormatReader();
    startScanning();

    return () => {
      if (scanner) {
        scanner.reset();
      }
    };
  });

  function startScanning() {
    if (!scanner || !videoElement) return;
    error = '';
    scanning = true;

    scanner.decodeFromVideoDevice(null, videoElement, (res, err) => {
      if (res) {
        result = res.getText();
        scanning = false;
        if (onScan) onScan(result);
        if (scanner) scanner.reset();
      }
      if (err && err.name !== 'NotFoundException') {
        error = err.message;
      }
    });
  }

  function rescan() {
    result = '';
    error = '';
    startScanning();
  }
</script>

<div class="scanner-container">
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={videoElement} class="w-full max-w-sm rounded bg-black aspect-video object-cover"></video>

  {#if result}
    <div class="mt-2 p-2 bg-green-50 text-green-800 rounded border border-green-200 text-sm flex items-center justify-between">
      <span><strong>Hasil Scan:</strong> {result}</span>
      <button type="button" onclick={rescan} class="text-xs bg-green-600 text-white px-2 py-1 rounded">Scan Ulang</button>
    </div>
  {/if}

  {#if error}
    <div class="mt-2 p-2 bg-red-50 text-red-800 rounded border border-red-200 text-sm flex items-center justify-between">
      <span>{error}</span>
      <button type="button" onclick={rescan} class="text-xs bg-red-600 text-white px-2 py-1 rounded">Coba Lagi</button>
    </div>
  {/if}
</div>

<style>
  .scanner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
