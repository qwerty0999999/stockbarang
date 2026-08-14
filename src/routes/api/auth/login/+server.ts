import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { generateToken } from '$lib/server/auth';
// @ts-ignore
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return new Response(JSON.stringify({ error: 'Username dan password wajib diisi' }), { status: 400 });
		}

		const user = await prisma.user.findUnique({ where: { username } });
		if (!user) {
			return new Response(JSON.stringify({ error: 'Username atau password salah' }), { status: 401 });
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return new Response(JSON.stringify({ error: 'Username atau password salah' }), { status: 401 });
		}

const token = await generateToken({ userId: user.id, username: user.username, role: user.role });

cookies.set('token', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24
});

return new Response(JSON.stringify({ message: 'Login berhasil', user: { id: user.id, username: user.username, role: user.role } }), { status: 200 });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500 });
	}
};
