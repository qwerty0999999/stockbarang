<script lang="ts">
  import { onMount } from 'svelte';

  let logs: any[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        logs = await res.json();
      }
    } catch (e) {
      console.error('Failed to load logs', e);
    }
    loading = false;
  });
</script>

<svelte:head><title>Audit Log</title></svelte:head>

<div class="page-wrap">
  <div class="page-header">
    <h1>Audit Trail</h1>
    <p>Log aktivitas pengguna</p>
  </div>

  <div class="main-content">
    {#if loading}
      <p>Loading...</p>
    {:else if logs.length === 0}
      <p>Belum ada log aktivitas.</p>
    {:else}
      <table class="log-table">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>User</th>
            <th>Aksi</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {#each logs as log (log.id)}
            <tr>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.user?.username || 'System'}</td>
              <td><span class="badge">{log.action}</span></td>
              <td>{log.details || '-'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  .page-wrap { padding: 20px; }
  .page-header { margin-bottom: 20px; }
  .main-content { background: white; padding: 20px; border-radius: 8px; }
  .log-table { width: 100%; border-collapse: collapse; }
  .log-table th, .log-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
  .log-table th { background: #f5f5f5; }
  .badge { background: #3c8dbc; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; }
</style>