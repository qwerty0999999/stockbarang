<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let user = $derived(data.user);

	let showChangePassword = $state(false);
	let showEditProfile = $state(false);
	let loading = $state(false);
	let loadingProfile = $state(false);
	let loadingAvatar = $state(false);
	let message = $state('');
	let error = $state('');
	let messageProfile = $state('');
	let errorProfile = $state('');
	let avatarInput: HTMLInputElement | undefined = $state();

	let profileUsername = $state('');
	$effect(() => {
		if (data.user?.username) {
			profileUsername = data.user.username;
		}
	});

	let passwordForm = $state({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});

	async function updateProfile(e: Event) {
		e.preventDefault();
		loadingProfile = true;
		errorProfile = '';
		messageProfile = '';

		const res = await fetch('/api/auth/update-profile', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				username: profileUsername
			})
		});

		const resData = await res.json();
		loadingProfile = false;

		if (!res.ok) {
			errorProfile = resData.error || 'Gagal memperbarui profil';
			return;
		}

		messageProfile = 'Profil berhasil diperbarui!';
		await invalidateAll();
		setTimeout(() => { messageProfile = ''; }, 3000);
	}

	async function changePassword(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		message = '';

		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			error = 'Password baru tidak cocok';
			loading = false;
			return;
		}

		if (passwordForm.newPassword.length < 6) {
			error = 'Password minimal 6 karakter';
			loading = false;
			return;
		}

		const res = await fetch('/api/auth/change-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				currentPassword: passwordForm.currentPassword,
				newPassword: passwordForm.newPassword
			})
		});

		const data = await res.json();
		loading = false;

		if (!res.ok) {
			error = data.error || 'Gagal mengubah password';
			return;
		}

		message = 'Password berhasil diubah!';
		passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
		setTimeout(() => { message = ''; }, 3000);
	}

	async function handleAvatarUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		loadingAvatar = true;

		const formData = new FormData();
		formData.append('avatar', file);

		const res = await fetch('/api/auth/upload-avatar', {
			method: 'POST',
			body: formData
		});

		const data = await res.json();
		loadingAvatar = false;

		if (!res.ok) {
			error = data.error || 'Gagal upload foto';
			setTimeout(() => { error = ''; }, 3000);
			return;
		}

		await invalidateAll();
	}

	function formatDate(d: string | Date | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
	}
</script>

<svelte:head><title>Profil – InventarisApp</title></svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<div class="flex items-center justify-between pb-2 border-b border-gray-200">
		<div>
			<h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
				Profil <span class="text-sm text-gray-500 font-light">Informasi Akun</span>
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
			<span>Profil</span>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Profile Card -->
		<div class="md:col-span-1">
			<div class="bg-white rounded shadow-sm border border-gray-200">
				<div class="p-6 text-center border-b border-gray-200">
					<div class="w-24 h-24 mx-auto rounded-full bg-[#3C8DBC] flex items-center justify-center text-white text-4xl font-bold shadow-md overflow-hidden relative">
						{#if user?.avatar}
							<img src={user.avatar} alt="Avatar" class="w-full h-full object-cover" />
						{:else}
							{user?.username?.charAt(0).toUpperCase()}
						{/if}
						<label class="absolute bottom-0 right-0 bg-[#3C8DBC] rounded-full p-1 cursor-pointer hover:bg-[#367FA9] transition-colors">
							<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
								<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
							</svg>
							<input type="file" accept="image/*" class="hidden" bind:this={avatarInput} onchange={handleAvatarUpload} />
						</label>
					</div>
					<h3 class="mt-3 text-lg font-semibold text-gray-800">{user?.username}</h3>
					<span class="text-sm text-gray-500">ID User: #{user?.id}</span>
<span class="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider 
{user?.role === 'dev' ? 'bg-rose-100 text-rose-700 border border-rose-200' : user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
	{user?.role === 'dev' ? 'SUPER USER (DEV)' : user?.role}
</span>
				</div>
				<div class="p-4 space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-500">ID User</span>
						<span class="font-medium text-gray-700">#{user?.id}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500">Bergabung</span>
						<span class="font-medium text-gray-700">{formatDate(user?.createdAt || null)}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Edit Profile & Change Password -->
		<div class="md:col-span-2 space-y-6">
			<!-- Edit Profile -->
			<div class="bg-white rounded shadow-sm border border-gray-200">
				<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
					<h4 class="font-semibold text-gray-800">Edit Profil</h4>
					<button 
						onclick={() => showEditProfile = !showEditProfile}
						class="text-sm text-[#3C8DBC] hover:underline font-medium"
					>
						{showEditProfile ? 'Sembunyikan' : 'Edit Profil'}
					</button>
				</div>

				{#if showEditProfile}
					<form onsubmit={updateProfile} class="p-6 space-y-4">
						{#if messageProfile}
							<div class="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">{messageProfile}</div>
						{/if}
						{#if errorProfile}
							<div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{errorProfile}</div>
						{/if}

						<div>
							<label for="userId" class="block text-sm font-medium text-gray-700 mb-1">ID User</label>
							<input 
								id="userId" 
								type="text" 
								value={user?.id} 
								disabled
								class="w-full max-w-sm border border-gray-300 px-3 py-2 text-sm bg-gray-100 cursor-not-allowed rounded-sm"
							/>
						</div>

						<div>
							<label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
							<input 
								id="username" 
								type="text" 
								bind:value={profileUsername} 
								required
								class="w-full max-w-sm border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm"
							/>
						</div>

						<div class="pt-2">
							<button 
								type="submit" 
								disabled={loadingProfile}
								class="px-4 py-2 bg-[#3C8DBC] hover:bg-[#367FA9] text-white text-sm font-medium rounded-sm disabled:opacity-70"
							>
								{loadingProfile ? 'Memproses...' : 'Simpan Perubahan'}
							</button>
						</div>
					</form>
				{:else}
					<div class="p-6 text-center text-gray-400 text-sm">
						Klik tombol "Edit Profil" untuk mengubah Username Anda.
					</div>
				{/if}
			</div>

			<!-- Change Password -->
			<div class="bg-white rounded shadow-sm border border-gray-200">
				<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
					<h4 class="font-semibold text-gray-800">Ganti Password</h4>
					<button 
						onclick={() => showChangePassword = !showChangePassword}
						class="text-sm text-[#3C8DBC] hover:underline font-medium"
					>
						{showChangePassword ? 'Sembunyikan' : 'Ganti Password'}
					</button>
				</div>

				{#if showChangePassword}
					<form onsubmit={changePassword} class="p-6 space-y-4">
						{#if message}
							<div class="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">{message}</div>
						{/if}
						{#if error}
							<div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
						{/if}

						<div>
							<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
							<input 
								id="currentPassword" 
								type="password" 
								bind:value={passwordForm.currentPassword} 
								required
								class="w-full max-w-sm border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm"
							/>
						</div>

						<div>
							<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
							<input 
								id="newPassword" 
								type="password" 
								bind:value={passwordForm.newPassword} 
								required
								minlength="6"
								class="w-full max-w-sm border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm"
							/>
						</div>

						<div>
							<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
							<input 
								id="confirmPassword" 
								type="password" 
								bind:value={passwordForm.confirmPassword} 
								required
								class="w-full max-w-sm border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3C8DBC] rounded-sm"
							/>
						</div>

						<div class="pt-2">
							<button 
								type="submit" 
								disabled={loading}
								class="px-4 py-2 bg-[#3C8DBC] hover:bg-[#367FA9] text-white text-sm font-medium rounded-sm disabled:opacity-70"
							>
								{loading ? 'Memproses...' : 'Update Password'}
							</button>
						</div>
					</form>
				{:else}
					<div class="p-6 text-center text-gray-400 text-sm">
						Klik tombol "Ganti Password" untuk mengubah kata sandi Anda.
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
