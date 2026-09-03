<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Toaster, toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	let { data, children } = $props();

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		toast.success('Berhasil logout');
		goto('/login');
	}

	let activeRoute = $derived($page.url.pathname);

	onMount(async () => {
		try {
			const res = await fetch('/api/inventory/alerts');
			if (res.ok) {
				const { lowStockItems } = await res.json();
				if (lowStockItems && lowStockItems.length > 0) {
					toast.warning(`Peringatan: Ada ${lowStockItems.length} barang dengan stok rendah!`, {
						description: lowStockItems.map((i: any) => `${i.name} (Sisa: ${i.quantity})`).join(', '),
						duration: 6000
					});
				}
			}
		} catch (e) {
			console.error('Failed to check low stock items', e);
		}
	});
</script>

<Toaster position="top-right" richColors />

<div class="min-h-screen flex bg-[#ECF0F5] font-sans text-gray-800">
	<!-- Sidebar -->
	<aside class="w-[230px] bg-[#222D32] text-[#B8C7CE] flex flex-col shrink-0">
		<!-- Header Logo -->
		<div class="flex items-center justify-center gap-2 h-[50px] bg-[#367FA9] text-white px-4">
			<svg class="w-6 h-6 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V7"/>
			</svg>
			<span class="font-bold text-lg tracking-wide">Inventaris<span class="font-light">App</span></span>
		</div>
		
		<!-- User Profile in Sidebar -->
		<div class="px-4 py-4 flex items-center gap-3 bg-[#1a2226]">
			<div class="w-11 h-11 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center border border-gray-500">
				<img src="/img/nav-avatar.svg" alt="" class="w-6 h-6 nav-icon" />
			</div>
			<div class="flex flex-col min-w-0">
				<span class="text-white font-semibold text-sm truncate">{data.user?.username || 'User'}</span>
				<span class="text-xs text-[#8aa4af] flex items-center gap-1 mt-0.5">
					<span class="w-2.5 h-2.5 rounded-full bg-green-500"></span> Online
				</span>
			</div>
		</div>
		
		<div class="px-4 py-3.5 text-xs font-semibold text-[#4b646f] uppercase bg-[#1A2226]">
			MAIN NAVIGATION
		</div>

		<nav class="flex-1 overflow-y-auto space-y-0 text-sm">
			<!-- Dashboard -->
			<a href="/inventory" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute === '/inventory' ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-dashboard.svg" alt="" class="w-4 h-4 nav-icon" />
				DASHBOARD
			</a>
			
			<!-- Data Barang -->
			<a href="/inventory/items" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute.startsWith('/inventory/items') ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-items.svg" alt="" class="w-4 h-4 nav-icon" />
				DATA BARANG
			</a>
			
			<!-- Data Supplier -->
			<a href="/inventory/suppliers" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute.startsWith('/inventory/suppliers') ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-suppliers.svg" alt="" class="w-4 h-4 nav-icon" />
				DATA SUPLIER
			</a>
			
			<!-- Peminjaman -->
			<a href="/inventory/peminjaman" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute.startsWith('/inventory/peminjaman') ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-peminjaman.svg" alt="" class="w-4 h-4 nav-icon" />
				PEMINJAMAN
			</a>
			
			<!-- Admin only: Barang Masuk & Keluar -->
			{#if data.user?.role === 'admin' || data.user?.role === 'dev'}
			<a href="/inventory/transactions?type=MASUK" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute.startsWith('/inventory/transactions') && $page.url.searchParams.get('type') === 'MASUK' ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-masuk.svg" alt="" class="w-4 h-4 nav-icon" />
				BARANG MASUK
			</a>
			<a href="/inventory/transactions?type=KELUAR" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute.startsWith('/inventory/transactions') && $page.url.searchParams.get('type') === 'KELUAR' ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-keluar.svg" alt="" class="w-4 h-4 nav-icon" />
				BARANG KELUAR
			</a>
			{/if}
			
			<!-- Laporan -->
			<a href="/inventory/reports" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute.startsWith('/inventory/reports') ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-laporan.svg" alt="" class="w-4 h-4 nav-icon" />
				LAPORAN
			</a>
			
			<!-- Data Pengguna (Admin Only) -->
			{#if data.user?.role === 'admin' || data.user?.role === 'dev'}
			<a href="/inventory/admin" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute.startsWith('/inventory/admin') ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-pengguna.svg" alt="" class="w-4 h-4 nav-icon" />
				DATA PENGGUNA
			</a>
			<a href="/inventory/logs" 
				class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
				{activeRoute.startsWith('/inventory/logs') ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
				<img src="/img/nav-laporan.svg" alt="" class="w-4 h-4 nav-icon" />
				AUDIT LOG
			</a>
			{/if}
			
			<!-- Ganti Password & Logout -->
			<div class="pt-2 border-t border-gray-700">
				<a href="/inventory/profile" 
					class="flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 transition-all duration-150
					{activeRoute.startsWith('/inventory/profile') ? 'border-[#3C8DBC] bg-[#1E282C] text-white' : 'border-transparent text-[#b8c7ce]'}">
					<img src="/img/nav-password.svg" alt="" class="w-4 h-4 nav-icon" />
					GANTI PASSWORD
				</a>
				<button onclick={logout} 
					class="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1E282C] hover:text-white border-l-4 border-transparent text-[#b8c7ce] text-left transition-colors">
					<img src="/img/nav-logout.svg" alt="" class="w-4 h-4 nav-icon" />
					LOGOUT
				</button>
			</div>
		</nav>
	</aside>

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col min-w-0">
		<!-- Top Header -->
		<header class="h-[50px] bg-[#3C8DBC] flex items-center justify-between text-white shrink-0 shadow-md">
			<!-- Toggle and App Name -->
			<div class="flex items-center">
				<button aria-label="Toggle Menu" class="p-4 hover:bg-[#367FA9] transition-colors h-[50px] flex items-center justify-center">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
					</svg>
				</button>
			</div>
			
			<!-- User Top Right -->
			<div class="flex items-center h-[50px]">
				<div class="flex items-center gap-2 px-4 hover:bg-[#367FA9] cursor-pointer h-full transition-colors">
					<div class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden border border-gray-400">
						<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
						</svg>
					</div>
					<span class="text-sm font-medium">{data.user?.username} - {data.user?.role}</span>
				</div>
				<button onclick={logout} class="flex items-center gap-1.5 px-4 hover:bg-[#367FA9] h-full text-sm font-medium border-l border-[#307095] transition-colors">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
					</svg>
					LOGOUT
				</button>
			</div>
		</header>
		
		<!-- Page Content -->
		<main class="flex-1 overflow-auto p-4">
			{@render children()}
		</main>
		
		<!-- Footer -->
		<footer class="bg-white border-t border-gray-300 px-6 py-3.5 text-xs text-gray-600 flex justify-between shrink-0 font-sans">
			<div><strong>Copyright © {new Date().getFullYear()} - <a href="https://www.rijalulfikri.my.id/" target="_blank" class="text-[#3c8dbc] hover:underline">RF-Digital</a></strong>. All rights reserved.</div>
			<div class="hidden sm:block"><b>Version</b> 2.4.0</div>
		</footer>
	</div>
</div>

<style>
	/* Icon navigasi sidebar — filter mengubah SVG hitam ke abu-abu sidebar (#b8c7ce) */
	:global(.nav-icon) {
		filter: brightness(0) saturate(100%) invert(82%) sepia(10%) saturate(300%) hue-rotate(165deg) brightness(90%);
		opacity: 0.85;
		flex-shrink: 0;
	}
	/* Saat hover, icon jadi putih */
	:global(a:hover .nav-icon),
	:global(button:hover .nav-icon) {
		filter: brightness(0) invert(1);
		opacity: 1;
	}
</style>
