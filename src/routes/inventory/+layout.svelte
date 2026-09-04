<script lang="ts">
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/stores';
	import { Toaster, toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	let { data, children } = $props();
	let sidebarOpen = $state(false);

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		toast.success('Berhasil logout');
		goto('/login');
	}

	let activeRoute = $derived($page.url.pathname);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}

	onMount(async () => {
		try {
			const res = await fetch('/api/inventory/alerts');
			if (res.ok) {
				const { lowStockItems, overdueLoans } = await res.json();
				if (lowStockItems && lowStockItems.length > 0) {
					toast.warning(`Peringatan: Ada ${lowStockItems.length} barang dengan stok rendah!`, {
						description: lowStockItems.slice(0, 3).map((i: any) => `${i.name} (Sisa: ${i.quantity})`).join(', '),
						duration: 6000
					});
				}
				if (overdueLoans && overdueLoans.length > 0) {
					toast.error(`Peringatan: Ada ${overdueLoans.length} peminjaman melewati batas waktu (terlambat)!`, {
						description: overdueLoans.slice(0, 3).map((l: any) => `${l.loanCode}: ${l.borrower?.name || l.borrowerName}`).join(', '),
						duration: 7000
					});
				}
			}
		} catch (e) {
			console.error('Failed to check alerts', e);
		}
	});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<meta name="theme-color" content="#3C8DBC" />
</svelte:head>

<Toaster position="top-right" richColors />

<!-- Top Navigation Loading Bar -->
{#if $navigating}
	<div class="top-nav-loader" aria-hidden="true"></div>
{/if}

<!-- Mobile Overlay -->
{#if sidebarOpen}
	<button class="sidebar-overlay" onclick={closeSidebar} aria-label="Close sidebar"></button>
{/if}

<div class="layout-wrap">
	<!-- Sidebar -->
	<aside class="sidebar" class:open={sidebarOpen}>
		<!-- Header Logo -->
		<div class="sidebar-logo">
			<svg class="w-6 h-6 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V7"/>
			</svg>
			<span class="font-bold text-lg tracking-wide">Inventaris<span class="font-light">App</span></span>
		</div>
		
		<!-- User Profile in Sidebar -->
		<div class="sidebar-user">
			<div class="sidebar-avatar">
				<img src="/img/nav-avatar.svg" alt="" class="w-6 h-6 nav-icon" />
			</div>
			<div class="flex flex-col min-w-0">
				<span class="text-white font-semibold text-sm truncate">{data.user?.username || 'User'}</span>
				<span class="text-xs text-[#8aa4af] flex items-center gap-1 mt-0.5">
					<span class="online-dot"></span> Online
				</span>
			</div>
		</div>
		
		<div class="sidebar-section-title">MAIN NAVIGATION</div>

		<nav class="sidebar-nav" data-sveltekit-preload-data="hover">
			<a href="/inventory" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute === '/inventory'}>
				<img src="/img/nav-dashboard.svg" alt="" class="w-4 h-4 nav-icon" />
				DASHBOARD
			</a>
			
			<a href="/inventory/assets" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/assets')}>
				<svg class="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
				BUKU INDUK ASET
			</a>

			<a href="/inventory/items" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/items')}>
				<img src="/img/nav-items.svg" alt="" class="w-4 h-4 nav-icon" />
				STOK KONSUMSI
			</a>
			
			<a href="/inventory/peminjaman" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/peminjaman')}>
				<img src="/img/nav-peminjaman.svg" alt="" class="w-4 h-4 nav-icon" />
				PEMINJAMAN
			</a>
			
			{#if data.user?.role === 'admin' || data.user?.role === 'dev'}
			<a href="/inventory/transactions?type=MASUK" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/transactions') && $page.url.searchParams.get('type') === 'MASUK'}>
				<img src="/img/nav-masuk.svg" alt="" class="w-4 h-4 nav-icon" />
				BARANG MASUK
			</a>
			<a href="/inventory/transactions?type=KELUAR" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/transactions') && $page.url.searchParams.get('type') === 'KELUAR'}>
				<img src="/img/nav-keluar.svg" alt="" class="w-4 h-4 nav-icon" />
				BARANG KELUAR
			</a>
			{/if}

			<a href="/inventory/master" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/master')}>
				<svg class="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
				MASTER DATA
			</a>

			<a href="/inventory/suppliers" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/suppliers')}>
				<img src="/img/nav-suppliers.svg" alt="" class="w-4 h-4 nav-icon" />
				DATA SUPLIER
			</a>

			<a href="/inventory/labels" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/labels')}>
				<svg class="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
				CETAK LABEL
			</a>
			
			<a href="/inventory/reports" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/reports')}>
				<img src="/img/nav-laporan.svg" alt="" class="w-4 h-4 nav-icon" />
				LAPORAN
			</a>
			
			{#if data.user?.role === 'admin' || data.user?.role === 'dev'}
			<a href="/inventory/admin" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/admin')}>
				<img src="/img/nav-pengguna.svg" alt="" class="w-4 h-4 nav-icon" />
				DATA PENGGUNA
			</a>
			<a href="/inventory/logs" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/logs')}>
				<img src="/img/nav-laporan.svg" alt="" class="w-4 h-4 nav-icon" />
				AUDIT LOG
			</a>
			{/if}
			
			<div class="nav-divider"></div>
			<a href="/inventory/profile" onclick={closeSidebar}
				class="nav-link" class:active={activeRoute.startsWith('/inventory/profile')}>
				<img src="/img/nav-password.svg" alt="" class="w-4 h-4 nav-icon" />
				GANTI PASSWORD
			</a>
			<button onclick={logout} class="nav-link nav-btn">
				<img src="/img/nav-logout.svg" alt="" class="w-4 h-4 nav-icon" />
				LOGOUT
			</button>
		</nav>
	</aside>

	<!-- Main Content Area -->
	<div class="main-area">
		<!-- Top Header -->
		<header class="top-header">
			<div class="header-left">
				<button class="hamburger" onclick={toggleSidebar} aria-label="Toggle Menu">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
					</svg>
				</button>
			</div>
			
			<div class="header-right">
				<div class="header-user">
					<div class="header-user-avatar">
						<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
						</svg>
					</div>
					<span class="header-user-name">{data.user?.username} - {data.user?.role === 'dev' ? 'SUPER USER' : data.user?.role}</span>
				</div>
				<button onclick={logout} class="header-logout">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
					</svg>
					<span class="logout-text">LOGOUT</span>
				</button>
			</div>
		</header>
		
		<!-- Page Content -->
		<main class="page-content">
			{@render children()}
		</main>
		
		<!-- Footer -->
		<footer class="app-footer">
			<div><strong>Copyright &copy; {new Date().getFullYear()} - <a href="https://www.rijalulfikri.my.id/" target="_blank" class="text-[#3c8dbc] hover:underline">RF-Digital</a></strong>. All rights reserved.</div>
			<div class="footer-version"><b>Version</b> 2.4.0</div>
		</footer>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		overflow-x: hidden;
	}
	:global(.nav-icon) {
		filter: brightness(0) saturate(100%) invert(82%) sepia(10%) saturate(300%) hue-rotate(165deg) brightness(90%);
		opacity: 0.85;
		flex-shrink: 0;
	}
	:global(a:hover .nav-icon),
	:global(button:hover .nav-icon) {
		filter: brightness(0) invert(1);
		opacity: 1;
	}

	.top-nav-loader {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: #00c0ef;
		z-index: 999999;
		box-shadow: 0 0 10px #00c0ef, 0 0 5px #3c8dbc;
		animation: nav-loading 1.2s infinite ease-in-out;
	}
	@keyframes nav-loading {
		0% {
			transform: scaleX(0.1);
			transform-origin: left;
		}
		50% {
			transform: scaleX(0.7);
			transform-origin: left;
		}
		100% {
			transform: scaleX(1);
			transform-origin: right;
		}
	}

	.layout-wrap {
		display: flex;
		min-height: 100vh;
		background: #ECF0F5;
		color: #333;
	}

	/* Sidebar */
	.sidebar {
		width: 230px;
		background: #222D32;
		color: #B8C7CE;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}
	.sidebar-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 50px;
		background: #367FA9;
		color: white;
		padding: 0 16px;
	}
	.sidebar-user {
		padding: 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		background: #1a2226;
	}
	.sidebar-avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		overflow: hidden;
		background: #4b5563;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #6b7280;
		flex-shrink: 0;
	}
	.online-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #22c55e;
		display: inline-block;
	}
	.sidebar-section-title {
		padding: 14px 16px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #4b646f;
		text-transform: uppercase;
		background: #1A2226;
	}
	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		font-size: 0.875rem;
	}
	.nav-link {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-left: 4px solid transparent;
		color: #b8c7ce;
		text-decoration: none;
		transition: all 0.15s;
	}
	.nav-link:hover {
		background: #1E282C;
		color: white;
	}
	.nav-link.active {
		border-left-color: #3C8DBC;
		background: #1E282C;
		color: white;
	}
	.nav-btn {
		width: 100%;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.875rem;
		text-align: left;
	}
	.nav-divider {
		padding-top: 8px;
		border-top: 1px solid #374151;
	}

	/* Main Area */
	.main-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	/* Top Header */
	.top-header {
		height: 50px;
		background: #3C8DBC;
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);
	}
	.header-left {
		display: flex;
		align-items: center;
	}
	.hamburger {
		padding: 16px;
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		height: 50px;
		display: none;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}
	.hamburger:hover {
		background: #367FA9;
	}
	.header-right {
		display: flex;
		align-items: center;
		height: 50px;
	}
	.header-user {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 16px;
		cursor: pointer;
		height: 100%;
		transition: background 0.2s;
	}
	.header-user:hover {
		background: #367FA9;
	}
	.header-user-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #d1d5db;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 1px solid #9ca3af;
	}
	.header-user-name {
		font-size: 0.875rem;
		font-weight: 500;
	}
	.header-logout {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 16px;
		height: 100%;
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		border-left: 1px solid #307095;
		background: none;
		color: white;
		cursor: pointer;
		transition: background 0.2s;
	}
	.header-logout:hover {
		background: #367FA9;
	}

	/* Page Content */
	.page-content {
		flex: 1;
		overflow: auto;
		padding: 16px;
	}

	/* Footer */
	.app-footer {
		background: white;
		border-top: 1px solid #d1d5db;
		padding: 14px 24px;
		font-size: 0.75rem;
		color: #4b5563;
		display: flex;
		justify-content: space-between;
		flex-shrink: 0;
	}

	/* Overlay */
	.sidebar-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		border: none;
		cursor: default;
		display: none;
	}

	/* ===== MOBILE RESPONSIVE ===== */
	@media (max-width: 768px) {
		.sidebar {
			position: fixed;
			left: -250px;
			top: 0;
			height: 100%;
			z-index: 1000;
			transition: left 0.3s ease;
			width: 250px;
		}
		.sidebar.open {
			left: 0;
		}
		.sidebar-overlay {
			display: block;
		}
		.hamburger {
			display: flex;
		}
		.header-user-name {
			display: none;
		}
		.logout-text {
			display: none;
		}
		.page-content {
			padding: 10px;
		}
		.app-footer {
			padding: 10px 16px;
			flex-direction: column;
			gap: 4px;
			text-align: center;
		}
		.footer-version {
			display: none;
		}
	}

	@media (max-width: 480px) {
		.page-content {
			padding: 8px;
		}
		.top-header {
			height: 44px;
		}
		.hamburger {
			height: 44px;
			padding: 12px;
		}
		.header-right {
			height: 44px;
		}
	}

	@media (min-width: 769px) {
		.sidebar-overlay {
			display: none !important;
		}
	}
</style>
