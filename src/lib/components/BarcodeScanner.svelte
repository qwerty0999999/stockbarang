<script lang="ts">
  import { onMount } from 'svelte';
  import { BrowserMultiFormatReader } from '@zxing/library';

  let scanner: BrowserMultiFormatReader;
  let videoElement: HTMLVideoElement;
  let result: string = '';
  let error: string = '';

  onMount(() => {
    scanner = new BrowserMultiFormatReader();
    startScanning();

    return () => {
      scanner.reset();
    };
  });

  function startScanning() {
    scanner.decodeFromVideoDevice(null, videoElement, (res, err) => {
      if (res) {
        result = res.getText();
        scanner.reset();
      }
      if (err && !(err instanceof NotFoundException)) {
        error = err.message;
      }
    });
  }

  function handleManualInput() {
    // Fungsi untuk input manual jika scan gagal
  }
</script>

<video bind:this={videoElement} autoplay playsinline></video>

{#if result}
  <div class="result">
    <p>Hasil scan: {result}</p>
    <button on:click={() => startScanning()}>Scan lagi</button>
  </div>
{/if}

{#if error}
  <div class="error">
    <p>Error: {error}</p>
    <button on:click={() => startScanning()}>Coba lagi</button>
  </div>
{/if}

<style>
  video {
    width: 100%;
    max-width: 500px;
    border-radius: 8px;
  }

  .result, .error {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 8px;
  }

  .result {
    background-color: #e6f7e6;
  }

  .error {
    background-color: #fde8e8;
  }
</style>
