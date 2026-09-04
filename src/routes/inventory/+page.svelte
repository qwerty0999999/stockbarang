<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const widgets = $derived([
		{
			label: 'Buku Induk Aset Tetap',
			value: data.stats.totalAssets ?? 0,
			icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
			bg: '#6f42c1',
			bgDark: '#59359a',
			link: '/inventory/assets'
		},
		{
			label: 'Aset Tersedia',
			value: data.stats.availableAssets ?? 0,
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			bg: '#00a65a',
			bgDark: '#008d4c',
			link: '/inventory/assets?status=TERSEDIA'
		},
		{
			label: 'Barang Konsumsi',
			value: data.stats.totalItems,
			icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
			bg: '#00c0ef',
			bgDark: '#00a4cc',
			link: '/inventory/items'
		},
		{
			label: 'Peminjaman Terlambat',
			value: data.stats.overdueLoans ?? 0,
			icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
			bg: (data.stats.overdueLoans ?? 0) > 0 ? '#dd4b39' : '#95a5a6',
			bgDark: (data.stats.overdueLoans ?? 0) > 0 ? '#c0392b' : '#7f8c8d',
			link: '/inventory/peminjaman'
		},
		{
			label: 'Pengguna',
			value: data.stats.totalUsers,
			icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
			bg: '#f39c12',
			bgDark: '#d68910',
			link: '/inventory/admin'
		},
		{
			label: 'Suplier',
			value: data.stats.totalSuppliers,
			icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
			bg: '#3c8dbc',
			bgDark: '#367fa9',
			link: '/inventory/suppliers'
		},
		{
			label: 'Transaksi Peminjaman',
			value: data.stats.totalLoans,
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
			bg: '#00c0ef',
			bgDark: '#00a4cc',
			link: '/inventory/peminjaman'
		},
		{
			label: 'Total Barang Masuk',
			value: data.stats.totalInItems,
			icon: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
			bg: '#4682b4',
			bgDark: '#376899',
			link: '/inventory/transactions?type=MASUK'
		},
		{
			label: 'Total Barang Keluar',
			value: data.stats.totalOutItems,
			icon: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
			bg: '#4c51bf',
			bgDark: '#3730a3',
			link: '/inventory/transactions?type=KELUAR'
		},
		{
			label: 'Total Transaksi Barang Masuk',
			value: data.stats.countInTx,
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
			bg: '#f97316',
			bgDark: '#ea6c0a',
			link: '/inventory/transactions?type=MASUK'
		},
		{
			label: 'Total Transaksi Barang Keluar',
			value: data.stats.countOutTx,
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
			bg: '#3b82f6',
			bgDark: '#2563eb',
			link: '/inventory/transactions?type=KELUAR'
		},
		{
			label: 'Peminjaman Dikembalikan',
			value: data.stats.returnedLoans,
			icon: 'M5 13l4 4L19 7',
			bg: '#00a65a',
			bgDark: '#008d4c',
			link: '/inventory/peminjaman'
		},
		{
			label: 'Peminjaman Belum Dikembalikan',
			value: data.stats.pendingLoans,
			icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
			bg: '#dd4b39',
			bgDark: '#c0392b',
			link: '/inventory/peminjaman'
		}
	]);

	const roleLabel = $derived(
		data.user?.role === 'admin' ? 'ADMIN' : (data.user?.role === 'dev' ? 'DEV' : (data.user?.role ?? '').toUpperCase())
	);
</script>

<svelte:head><title>Dashboard - Control Panel</title></svelte:head>

<div class="dashboard-wrap">
	<!-- Header -->
	<div class="page-header">
		<div class="page-header-inner">
			<div class="page-title-wrap">
				<img src="/img/logo.svg" alt="Logo" class="page-logo" width="22" height="22" />
				<h1 class="page-title">Dashboard <span class="page-subtitle">Control panel</span></h1>
			</div>

			<ol class="breadcrumb">
				<li>
					<a href="/inventory">
						<svg class="breadcrumb-icon" fill="currentColor" viewBox="0 0 20 20">
							<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
						</svg>
						Home
					</a>
				</li>
				<li class="sep">&gt;</li>
				<li class="current">Dashboard</li>
			</ol>
		</div>
	</div>

	<!-- Main Content -->
	<div class="main-content">
		<!-- Widgets Grid -->
		<div class="widgets-grid">
			{#each widgets as widget (widget.label)}
				<a
					href={widget.link}
					class="widget-card"
					style="background-color: {widget.bg};"
				>
					<!-- Decorative icon (absolute, right side) -->
					<div class="widget-icon-bg" aria-hidden="true">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d={widget.icon} />
						</svg>
					</div>

					<!-- Main content (number + label) -->
					<div class="widget-body">
						<p class="widget-value">{widget.value}</p>
						<p class="widget-label">{widget.label}</p>
					</div>

					<!-- Footer -->
					<div class="widget-footer" style="background-color: {widget.bgDark};">
						<span class="widget-footer-text">
							More info
							<svg class="footer-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round"
									d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</span>
					</div>
				</a>
			{/each}
		</div>

		<!-- Bottom row: Login detail + Watermark -->
		<div class="bottom-row">
			<!-- Detail Login Card -->
			<div class="login-card">
				<div class="login-card-header">
					<h2>Informasi Akun Aktif</h2>
				</div>
				<div class="login-card-body">
					<div class="info-row">
						<span class="info-label">Nama</span>
						<span class="info-value">: {data.user?.username ?? '—'}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Role</span>
						<span class="info-value">: {data.user?.role ?? '—'}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Level Hak Akses</span>
						<span
							class="role-badge {data.user?.role === 'admin' ? 'role-admin' : 'role-staff'}"
						>
							{roleLabel}
						</span>
					</div>
				</div>
			</div>


		</div>
	</div>
</div>

<style>
	/* ── Layout ─────────────────────────────────────────── */
	.dashboard-wrap {
		width: 100%;
	}

	/* ── Page Header ──────────────────────────────────── */
	.page-header {
		padding-bottom: 8px;
		border-bottom: 1px solid #d2d6de;
		margin-bottom: 16px;
	}
	.page-header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
	}
	.page-title-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.page-logo {
		width: 22px;
		height: 22px;
		object-fit: contain;
		flex-shrink: 0;
	}
	.page-title {
		font-size: 1.4rem;
		font-weight: 500;
		color: #222d32;
		margin: 0;
		display: flex;
		align-items: baseline;
		gap: 6px;
	}
	.page-subtitle {
		font-size: 0.85rem;
		font-weight: 300;
		color: #777;
	}
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 5px;
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.75rem;
		color: #777;
	}
	.breadcrumb a {
		color: #3c8dbc;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}
	.breadcrumb a:hover { text-decoration: underline; }
	.breadcrumb-icon {
		width: 13px;
		height: 13px;
	}
	.breadcrumb .sep { color: #bbb; font-size: 0.7rem; }
	.breadcrumb .current { color: #555; font-weight: 500; }

	/* ── Main Content ──────────────────────────────────── */
	.main-content {
		width: 100%;
		padding: 0;
	}

	/* ── Widgets Grid ─────────────────────────────────── */
	.widgets-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 20px;
	}
	@media (max-width: 1024px) {
		.widgets-grid { grid-template-columns: repeat(2, 1fr); }
	}
	@media (max-width: 600px) {
		.widgets-grid { grid-template-columns: 1fr; }
	}

	/* ── Widget Card ──────────────────────────────────── */
	.widget-card {
		position: relative;
		display: flex;
		flex-direction: column;
		border-radius: 4px;
		overflow: hidden;
		text-decoration: none;
		transition: filter 0.2s ease, transform 0.2s ease;
		min-height: 110px;
	}
	.widget-card:hover {
		filter: brightness(1.08);
		transform: translateY(-2px);
	}

	/* Decorative icon – absolutely positioned, right side */
	.widget-icon-bg {
		position: absolute;
		right: -10px;
		top: 50%;
		transform: translateY(-60%);
		opacity: 0.15;
		color: #000;
		pointer-events: none;
	}
	.widget-icon-bg svg {
		width: 90px;
		height: 90px;
	}

	/* Body: number + label, left-aligned, on top of icon */
	.widget-body {
		flex: 1;
		padding: 14px 16px 10px;
		position: relative;
		z-index: 1;
	}
	.widget-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: #fff;
		line-height: 1;
		margin: 0;
	}
	.widget-label {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.9);
		margin: 6px 0 0;
		/* Clamp label to 2 lines max so tall labels don't break layout */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		max-width: calc(100% - 70px); /* keep clear of icon */
	}

	/* Footer "More info" */
	.widget-footer {
		padding: 6px 16px;
		display: flex;
		align-items: center;
		transition: filter 0.2s;
	}
	.widget-card:hover .widget-footer { filter: brightness(0.92); }
	.widget-footer-text {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.85);
		font-weight: 500;
	}
	.footer-arrow {
		width: 16px;
		height: 16px;
		transition: transform 0.2s;
	}
	.widget-card:hover .footer-arrow { transform: translateX(3px); }

	/* ── Bottom Row ───────────────────────────────────── */
	.bottom-row {
		display: flex;
		align-items: flex-start;
		gap: 24px;
	}

	/* ── Login Card ───────────────────────────────────── */
	.login-card {
		background: #fff;
		border-radius: 4px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		border-top: 3px solid #3c8dbc;
		max-width: 480px;
		width: 100%;
	}
	.login-card-header {
		padding: 12px 16px;
		border-bottom: 1px solid #f0f0f0;
	}
	.login-card-header h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: #333;
		margin: 0;
	}
	.login-card-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.info-row {
		display: flex;
		align-items: center;
	}
	.info-label {
		width: 148px;
		font-size: 0.875rem;
		color: #555;
		flex-shrink: 0;
	}
	.info-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: #333;
	}
	.role-badge {
		display: inline-flex;
		padding: 3px 12px;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: #fff;
	}
	.role-admin { background: #605ca8; }
	.role-staff  { background: #00a65a; }

	/* ── Mobile Responsive ────────────────────────────── */
	@media (max-width: 768px) {
		.page-header {
			padding-bottom: 6px;
			margin-bottom: 12px;
		}
		.page-header-inner {
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
		}
		.page-title {
			font-size: 1.2rem;
		}
		.page-subtitle {
			font-size: 0.8rem;
		}
		.breadcrumb {
			display: none;
		}
		.main-content {
			padding: 0;
		}
		.widgets-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 10px;
		}
		.widget-value {
			font-size: 1.8rem;
		}
		.widget-label {
			font-size: 0.75rem;
		}
		.widget-icon-bg svg {
			width: 60px;
			height: 60px;
		}
		.widget-card {
			min-height: 90px;
		}
		.bottom-row {
			flex-direction: column;
		}
		.login-card {
			max-width: 100%;
		}
		.info-label {
			width: 110px;
			font-size: 0.8rem;
		}
		.info-value {
			font-size: 0.8rem;
		}
	}

	@media (max-width: 480px) {
		.widgets-grid {
			grid-template-columns: 1fr;
			gap: 8px;
		}
		.widget-value {
			font-size: 1.5rem;
		}
		.widget-body {
			padding: 10px 12px 8px;
		}
		.widget-footer {
			padding: 5px 12px;
		}
	}

</style>