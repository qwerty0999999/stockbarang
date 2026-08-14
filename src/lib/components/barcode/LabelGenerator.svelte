<script lang="ts">
  import { onMount } from 'svelte';
  import JsBarcode from 'jsbarcode';
  import QRCode from 'qrcode';

  let { value, type = 'barcode', label = '' }: { value: string, type?: 'barcode'|'qrcode', label?: string } = $props();

  let canvas: HTMLCanvasElement;
  let imgUrl = $state('');

  onMount(async () => {
    generate();
  });

  $effect(() => {
    if (canvas && value) {
      generate();
    }
  });

  async function generate() {
    if (!value || !canvas) return;

    if (type === 'barcode') {
      try {
        JsBarcode(canvas, value, {
          format: "CODE128",
          displayValue: true,
          fontSize: 16,
          margin: 10,
          width: 2,
          height: 60,
          text: label || value
        });
        imgUrl = canvas.toDataURL("image/png");
      } catch (e) {
        console.error("Barcode generation failed", e);
      }
    } else {
      try {
        await QRCode.toCanvas(canvas, value, {
          width: 200,
          margin: 2
        });
        imgUrl = canvas.toDataURL("image/png");
      } catch (e) {
        console.error("QR generation failed", e);
      }
    }
  }

  function print() {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Print Label</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; }
              img { max-width: 100%; height: auto; }
              @media print {
                @page { margin: 0; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <img src="${imgUrl}" />
            <script>
              window.onload = () => { window.print(); window.close(); }
            <\\/script>
          </body>
        </html>
      `);
      win.document.close();
    }
  }
</script>

<div class="flex flex-col items-center gap-4 p-4 border rounded-lg bg-white">
  <canvas bind:this={canvas} class:hidden={imgUrl !== ''}></canvas>
  
  {#if imgUrl}
    <img src={imgUrl} alt="{type} for {value}" class="max-w-full" />
    <button 
      onclick={print}
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Cetak Label
    </button>
  {/if}
</div>
