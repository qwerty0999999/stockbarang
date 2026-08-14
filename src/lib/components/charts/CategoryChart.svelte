<script>
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';

  Chart.register(...registerables);

  let { data, title = 'Stok per Kategori' } = $props();

  let canvas;
  let chart = null;

  $effect(() => {
    if (!canvas || !data || data.length === 0) return;

    const labels = data.map(d => d.name || 'Uncategorized');
    const stocks = data.map(d => d.totalStock || 0);

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total Stok',
          data: stocks,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: title, font: { size: 14, weight: 'bold' } }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  });

  onMount(() => {
    return () => chart?.destroy();
  });
</script>

<div class="bg-white rounded-xl shadow-sm p-6">
  <div style="height: 280px;">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>