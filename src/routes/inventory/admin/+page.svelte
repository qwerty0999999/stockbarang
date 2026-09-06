<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  let users = $derived(data.users);
  let itemCount = $derived(data.itemCount);
  let loading = $state(false);
  let message = $state('');

  async function changeRole(userId: number, newRole: string) {
    if (!confirm(`Ubah peran (role) pengguna ini menjadi "${newRole}"?`)) return;
    
    loading = true;
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    loading = false;
    
    if (res.ok) {
      message = 'Peran pengguna berhasil diperbarui!';
      await invalidateAll();
      setTimeout(() => message = '', 3000);
    } else {
      const err = await res.json();
      message = err.error || 'Gagal mengubah peran pengguna';
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
  <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
    <div class="bg-white rounded shadow-sm border border-gray-200 p-3">
      <p class="text-gray-500 text-[11px] font-medium uppercase tracking-wide">Total User</p>
      <p class="text-xl font-bold text-gray-800 mt-1">{users.length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-3">
      <p class="text-gray-500 text-[11px] font-medium uppercase tracking-wide">Super User</p>
      <p class="text-xl font-bold text-rose-600 mt-1">{users.filter((u) => u.role === 'dev').length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-3">
      <p class="text-gray-500 text-[11px] font-medium uppercase tracking-wide">Admin</p>
      <p class="text-xl font-bold text-purple-600 mt-1">{users.filter((u) => u.role === 'admin').length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-3">
      <p class="text-gray-500 text-[11px] font-medium uppercase tracking-wide">Manajemen</p>
      <p class="text-xl font-bold text-blue-600 mt-1">{users.filter((u) => u.role === 'manajemen').length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-3">
      <p class="text-gray-500 text-[11px] font-medium uppercase tracking-wide">Karyawan / Staff</p>
      <p class="text-xl font-bold text-amber-600 mt-1">{users.filter((u) => ['karyawan', 'staff'].includes(u.role)).length}</p>
    </div>
    <div class="bg-white rounded shadow-sm border border-gray-200 p-3">
      <p class="text-gray-500 text-[11px] font-medium uppercase tracking-wide">Total Barang</p>
      <p class="text-xl font-bold text-emerald-600 mt-1">{itemCount}</p>
    </div>
  </div>

  <!-- Users Table -->
  <div class="bg-white rounded shadow-sm border border-gray-200">
    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <h4 class="font-semibold text-gray-800">Daftar User & Hak Akses</h4>
      <span class="text-xs text-gray-400">{users.length} pengguna terdaftar</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
          <tr>
            <th class="px-6 py-3 text-left font-semibold">ID</th>
            <th class="px-6 py-3 text-left font-semibold">Username</th>
            <th class="px-6 py-3 text-left font-semibold">Role Saat Ini</th>
            <th class="px-6 py-3 text-left font-semibold">Bergabung</th>
            <th class="px-6 py-3 text-center font-semibold">Ubah Hak Akses / Role</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each users as user}
            <tr class="hover:bg-gray-50 transition">
              <td class="px-6 py-4 font-medium text-gray-800">{user.id}</td>
              <td class="px-6 py-4 font-medium text-gray-800">{user.username}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
                  user.role === 'dev' ? 'bg-rose-100 text-rose-700 font-semibold border border-rose-200' : 
                  user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                  user.role === 'manajemen' ? 'bg-blue-100 text-blue-700' : 
                  user.role === 'karyawan' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                }">
                  {#if user.role === 'dev'}
                    <svg class="w-3 h-3 mr-1 text-rose-600 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                    </svg>
                    SUPER USER (DEV)
                  {:else}
                    {user.role.toUpperCase()}
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
                  <div class="flex items-center justify-center gap-1.5">
                    <select 
                      value={user.role} 
                      onchange={(e) => changeRole(user.id, (e.target as HTMLSelectElement).value)}
                      disabled={loading}
                      class="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 font-medium focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="karyawan">Karyawan (Self-Service)</option>
                      <option value="staff">Staff Operasional</option>
                      <option value="manajemen">Manajemen (Approver)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>