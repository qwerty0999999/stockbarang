<script lang="ts">
	import { goto } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let showPassword = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		const data = await res.json();
		loading = false;
		if (!res.ok) { error = data.error; return; }
		goto('/inventory');
	}
</script>

<svelte:head><title>Login – StockBarang</title></svelte:head>

<div class="login-root">
	<div class="form-panel">
		<div class="form-card">

			<!-- ── Header biru (logo + judul) ── -->
			<div class="form-header">
				<div class="brand-topbar">
					<img src="/img/logo.svg" alt="InventarisApp Logo" class="brand-icon" />
					<span class="brand-name">Inventaris<span class="brand-name-light">App</span></span>
				</div>

				<h1 class="form-title">Selamat Datang</h1>
				<p class="form-subtitle">Masuk untuk melanjutkan ke dashboard</p>
			</div>

			<!-- ── Error alert ── -->
			{#if error}
				<div class="alert-error" role="alert">
					<svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round"
							d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
					</svg>
					{error}
				</div>
			{/if}

			<!-- ── Form login ── -->
			<form onsubmit={handleLogin} class="login-form">

				<!-- Username -->
				<div class="field-group">
					<label class="field-label" for="username">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
						</svg>
						Username
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						required
						autocomplete="username"
						class="field-input"
						placeholder="Username"
					/>
				</div>

				<!-- Password -->
				<div class="field-group">
					<label class="field-label" for="password">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
						</svg>
						Password
					</label>
					<div class="password-wrap">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
							autocomplete="current-password"
							class="field-input"
							placeholder="••••••••"
						/>
						<button
							type="button"
							class="password-toggle"
							onclick={() => (showPassword = !showPassword)}
							aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
						>
							{#if showPassword}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
								</svg>
							{:else}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
									<path stroke-linecap="round" stroke-linejoin="round"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- Submit -->
				<button type="submit" id="btn-login" class="btn-submit" disabled={loading}>
					{#if loading}
						<svg class="btn-spinner" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"/>
							<path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
						</svg>
						Memproses...
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round"
								d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
						</svg>
						Masuk
					{/if}
				</button>
			</form>

			<p class="register-link">
				Belum punya akun? <a href="/register">Daftar sekarang</a>
			</p>
		</div>
	</div>
</div>

<style>
	/* ── Root ───────────────────────────────────────── */
	.login-root {
		min-height: 100vh;
		background: #ecf0f5;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	/* ── Card ───────────────────────────────────────── */
	.form-panel {
		width: 100%;
		max-width: 400px;
	}

	.form-card {
		background: #fff;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14);
		overflow: hidden;
	}

	/* ── Header biru ────────────────────────────────── */
	.form-header {
		background: #3c8dbc;
		padding: 24px 28px 22px;
	}

	.brand-topbar {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 18px;
	}
	.brand-icon {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		/* Ubah logo SVG hitam jadi putih di atas header biru */
		filter: brightness(0) invert(1);
		opacity: 0.9;
	}
	.brand-name {
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: #fff;
	}
	.brand-name-light {
		font-weight: 300;
		color: rgba(255, 255, 255, 0.8);
	}

	.form-title {
		font-size: 1.35rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 4px;
	}
	.form-subtitle {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.72);
		margin: 0;
	}

	/* ── Alert error ────────────────────────────────── */
	.alert-error {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 16px 24px 0;
		padding: 10px 14px;
		border-radius: 3px;
		background: #fdf3f2;
		border-left: 4px solid #dd4b39;
		color: #a94442;
		font-size: 0.875rem;
	}
	.alert-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	/* ── Form body ──────────────────────────────────── */
	.login-form {
		padding: 22px 28px 18px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.field-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		color: #444;
		cursor: pointer;
	}
	.field-label svg {
		width: 15px;
		height: 15px;
		color: #888;
		flex-shrink: 0;
	}
	.field-input {
		width: 100%;
		border: 1px solid #d2d6de;
		border-radius: 3px;
		padding: 9px 12px;
		font-size: 0.9rem;
		color: #333;
		background: #fff;
		box-sizing: border-box;
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.field-input::placeholder { color: #bbb; }
	.field-input:focus {
		outline: none;
		border-color: #3c8dbc;
		box-shadow: 0 0 0 3px rgba(60, 141, 188, 0.15);
	}

	/* ── Password toggle ────────────────────────────── */
	.password-wrap { position: relative; }
	.password-wrap .field-input { padding-right: 40px; }
	.password-toggle {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px;
		color: #aaa;
		display: flex;
	}
	.password-toggle:hover { color: #555; }
	.password-toggle svg { width: 18px; height: 18px; }

	/* ── Tombol Masuk ───────────────────────────────── */
	.btn-submit {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 10px 16px;
		background: #367fa9;
		color: #fff;
		border: none;
		border-radius: 3px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
		margin-top: 2px;
	}
	.btn-submit:hover:not(:disabled) { background: #3c8dbc; }
	.btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
	.btn-submit svg { width: 18px; height: 18px; }

	.btn-spinner {
		width: 18px;
		height: 18px;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* ── Link daftar ────────────────────────────────── */
	.register-link {
		text-align: center;
		font-size: 0.85rem;
		color: #666;
		padding: 13px 28px 18px;
		border-top: 1px solid #f0f0f0;
		margin: 0;
	}
	.register-link a {
		color: #3c8dbc;
		font-weight: 600;
		text-decoration: none;
	}
	.register-link a:hover { text-decoration: underline; }
</style>
