<script lang="ts">
  import { onMount } from 'svelte';

  let {
    label = 'Tanda Tangan',
    width = 400,
    height = 180,
    onSave
  }: {
    label?: string;
    width?: number;
    height?: number;
    onSave?: (dataUrl: string) => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let isDrawing = $state(false);
  let hasDrawn = $state(false);
  let strokeHistory: ImageData[] = [];

  onMount(() => {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  });

  function getPos(e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  }

  function startDraw(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    if (!ctx) return;
    isDrawing = true;
    hasDrawn = true;
    
    // Save state for undo
    strokeHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing || !ctx) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() {
    if (!isDrawing || !ctx) return;
    isDrawing = false;
    ctx.closePath();
    if (onSave) {
      onSave(canvas.toDataURL('image/png'));
    }
  }

  export function clear() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
    strokeHistory = [];
    if (onSave) onSave('');
  }

  export function undo() {
    if (!ctx || !canvas || strokeHistory.length === 0) return;
    const lastState = strokeHistory.pop();
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      if (strokeHistory.length === 0) hasDrawn = false;
      if (onSave) onSave(canvas.toDataURL('image/png'));
    }
  }

  export function getDataUrl(): string {
    if (!hasDrawn || !canvas) return '';
    return canvas.toDataURL('image/png');
  }
</script>

<div class="signature-box flex flex-col items-center">
  <div class="w-full flex justify-between items-center mb-1">
    <span class="text-xs font-semibold text-gray-700">{label}</span>
    <div class="flex gap-1.5">
      <button
        type="button"
        onclick={undo}
        disabled={!hasDrawn}
        class="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40 transition"
      >
        Undo
      </button>
      <button
        type="button"
        onclick={clear}
        class="text-xs px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
      >
        Hapus
      </button>
    </div>
  </div>

  <div class="canvas-wrapper relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden shadow-inner w-full max-w-md">
    <canvas
      bind:this={canvas}
      {width}
      {height}
      class="w-full touch-none cursor-crosshair block"
      onmousedown={startDraw}
      onmousemove={draw}
      onmouseup={stopDraw}
      onmouseleave={stopDraw}
      ontouchstart={startDraw}
      ontouchmove={draw}
      ontouchend={stopDraw}
    ></canvas>
    
    {#if !hasDrawn}
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400">
        Tanda tangan di area ini
      </div>
    {/if}
  </div>
</div>
