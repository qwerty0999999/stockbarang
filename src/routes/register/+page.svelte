<script>
	import { goto } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let confirm = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleRegister(e) {
		e.preventDefault();
		if (password !== confirm) { error = 'Password tidak cocok'; return; }
		if (password.length < 6) { error = 'Password minimal 6 karakter'; return; }
		loading = true;
		error = '';
		const res = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		const data = await res.json();
		loading = false;
		if (!res.ok) { error = data.error; return; }
		goto('/login');
	}
</script>

<svelte:head><title>Daftar – StockBarang</title></svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
		<div class="mb-8 text-center">
			<div class="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full mb-3">
				<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V7"/>
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-gray-800">StockBarang</h1>
			<p class="text-gray-500 text-sm mt-1">Buat akun baru</p>
		</div>

		{#if error}
			<div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
		{/if}

		<form onsubmit={handleRegister} class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="username">Username</label>
				<input id="username" type="text" bind:value={username} required autocomplete="username"
					class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					placeholder="username" />
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="password">Password</label>
				<input id="password" type="password" bind:value={password} required autocomplete="new-password"
					class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					placeholder="Min. 6 karakter" />
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="confirm">Konfirmasi Password</label>
				<input id="confirm" type="password" bind:value={confirm} required autocomplete="new-password"
					class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					placeholder="Ulangi password" />
			</div>
			<button type="submit" disabled={loading}
				class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm mt-2">
				{loading ? 'Memproses...' : 'Daftar'}
			</button>
		</form>

		<p class="text-center text-sm text-gray-500 mt-6">
			Sudah punya akun? <a href="/login" class="text-blue-600 font-medium hover:underline">Masuk</a>
		</p>
	</div>
</div>
