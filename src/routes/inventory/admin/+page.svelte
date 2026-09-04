<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  let users = $derived(data.users);
  let itemCount = $derived(data.itemCount);
  let loading = $state(false);
  let message = $state('');

  async function toggleRole(userId: number, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'manajemen' : 'admin';
    if (!confirm(`Ubah role user menjadi ${newRole}?`)) return;
    
    loading = true;
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    loading = false;
    
    if (res.ok) {
      message = 'Role berhasil diubah';
      await invalidateAll();
      setTimeout(() => message = '', 3000);
    } else {
      const err = await res.json();
      message = err.error || 'Gagal mengubah role';
    }
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<svelte:head><title>Admin Panel – InventarisApp</title></svelte:head>

<div class="space-y-4">
  <!-- Page Header -->
  <div class="flex items-center justify-between pb-2 border-b border-gray-200">
    <div>
      <h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
        Admin Panel <span class="text-sm text-gray-500 font-light">Manajemen User</span>
      </h1>
    </div>
    <div class="text-xs text-gray-500 flex items-center gap-1">
      <a href="/inventory" class="hover:underline flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
        Home
      </a>
      <span>&gt;</span>
      <span>Admin</span>
    </div>
  </div>

  {#if message}
    <div class="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">{message}</div>
  {/if}

  <!-- Stats -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
    <div class="bg-white rounded shadow-sm border border-gray-200 p-4">
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Total User</p>
      <p class="text-2xl font-bold text-gray-800 mt-1">{users.length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-4">
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Super User</p>
      <p class="text-2xl font-bold text-rose-600 mt-1">{users.filter((u) => u.role === 'dev').length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-4">
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Admin</p>
      <p class="text-2xl font-bold text-purple-600 mt-1">{users.filter((u) => u.role === 'admin').length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-4">
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Manajemen</p>
      <p class="text-2xl font-bold text-blue-600 mt-1">{users.filter((u) => u.role === 'manajemen').length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-4 col-span-2 md:col-span-1">
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Barang</p>
      <p class="text-2xl font-bold text-gray-800 mt-1">{itemCount}</p>
    </div>
  </div>

  <!-- Users Table -->
  <div class="bg-white rounded shadow-sm border border-gray-200">
    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <h4 class="font-semibold text-gray-800">Daftar User</h4>
      <span class="text-xs text-gray-400">{users.length} user</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
          <tr>
            <th class="px-6 py-3 text-left font-semibold">ID</th>
            <th class="px-6 py-3 text-left font-semibold">Username</th>
            <th class="px-6 py-3 text-left font-semibold">Role</th>
            <th class="px-6 py-3 text-left font-semibold">Bergabung</th>
            <th class="px-6 py-3 text-center font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each users as user}
            <tr class="hover:bg-gray-50 transition">
              <td class="px-6 py-4 font-medium text-gray-800">{user.id}</td>
              <td class="px-6 py-4 font-medium text-gray-800">{user.username}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {user.role === 'dev' ? 'bg-rose-100 text-rose-700 font-semibold border border-rose-200' : user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                  {#if user.role === 'dev'}
                    <svg class="w-3 h-3 mr-1 text-rose-600 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                    </svg>
                    SUPER USER (DEV)
                  {:else}
                    {user.role}
                  {/if}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
              <td class="px-6 py-4 text-center">
                {#if user.role === 'dev'}
                  <span class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-600 border border-rose-200">
                    Akses Penuh
                  </span>
                {:else}
                  <button 
                    onclick={() => toggleRole(user.id, user.role)}
                    disabled={loading}
                    class="px-3 py-1 text-xs font-medium rounded transition {user.role === 'admin' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} disabled:opacity-50"
                  >
                    {user.role === 'admin' ? 'Turunkan ke Manajemen' : 'Jadikan Admin'}
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>