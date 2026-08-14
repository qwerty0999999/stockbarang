import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';

export async function POST({ request, locals }: RequestEvent) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { currentPassword, newPassword } = await request.json();

	if (!currentPassword || !newPassword) {
		return json({ error: 'Data tidak lengkap' }, { status: 400 });
	}

	if (newPassword.length < 6) {
		return json({ error: 'Password minimal 6 karakter' }, { status: 400 });
	}

	const user = await prisma.user.findUnique({
		where: { id: locals.user.userId }
	});

	if (!user) {
		return json({ error: 'User tidak ditemukan' }, { status: 404 });
	}

	const isValid = await bcrypt.compare(currentPassword, user.password);
	if (!isValid) {
		return json({ error: 'Password saat ini salah' }, { status: 400 });
	}

	const hashedPassword = await bcrypt.hash(newPassword, 10);

	await prisma.user.update({
		where: { id: locals.user.userId },
		data: { password: hashedPassword }
	});

	return json({ success: true, message: 'Password berhasil diubah' });
}