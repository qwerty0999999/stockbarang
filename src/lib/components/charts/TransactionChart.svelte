<script>
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';

  Chart.register(...registerables);

  let { transactions, title = 'Aktivitas Transaksi' } = $props();

  let canvas;
  let chart = null;

  $effect(() => {
    if (!canvas || !transactions || transactions.length === 0) return;

    const last7 = transactions.slice(0, 7).reverse();
    const labels = last7.map(t => new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
    const masuk = last7.map(t => t.type === 'MASUK' ? t.quantity : 0);
    const keluar = last7.map(t => t.type === 'KELUAR' ? t.quantity : 0);

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Masuk',
            data: masuk,
            borderColor: 'rgba(34, 197, 94, 1)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Keluar',
            data: keluar,
            borderColor: 'rgba(239, 68, 68, 1)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: title, font: { size: 14, weight: 'bold' } }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  });

  onMount(() => {
    return () => {
      if (chart) chart.destroy();
    };
  });
</script>

<div class="bg-white rounded-xl shadow-sm p-6">
  <div style="height: 280px;">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>