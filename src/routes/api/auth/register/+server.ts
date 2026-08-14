import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
// @ts-ignore
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request }) => {
	try {
const { username, password } = await request.json();

if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Field tidak boleh kosong' }), { status: 400 });
}

const existing = await prisma.user.findFirst({
    where: { username }
});

if (existing) {
    return new Response(JSON.stringify({ error: 'Username sudah terdaftar' }), { status: 400 });
}

const hashedPassword = await bcrypt.hash(password, 10);
const user = await prisma.user.create({
    data: { username, password: hashedPassword, role: 'staff' }
});

		return new Response(JSON.stringify({ message: 'Registrasi berhasil', userId: user.id }), { status: 201 });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500 });
	}
};
