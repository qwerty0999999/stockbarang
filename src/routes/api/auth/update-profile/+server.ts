import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export async function POST({ request, locals }: RequestEvent) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { username } = await request.json();

	if (!username) {
		return json({ error: 'Username harus diisi' }, { status: 400 });
	}

	const user = await prisma.user.findUnique({ where: { id: locals.user.userId } });
	if (user?.role !== 'admin') {
		return json({ error: 'Hanya admin yang dapat mengubah username' }, { status: 403 });
	}

	const existingUser = await prisma.user.findFirst({
		where: {
			username,
			NOT: { id: locals.user.userId }
		}
	});

	if (existingUser) {
		return json({ error: 'Username sudah digunakan' }, { status: 400 });
	}

	await prisma.user.update({
		where: { id: locals.user.userId },
		data: { username }
	});

	return json({ success: true, message: 'Profil berhasil diperbarui' });
}
