import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const user = await prisma.user.findUnique({
		where: { id: locals.user.userId },
		select: { id: true, username: true, role: true, createdAt: true, avatar: true }
	});

	return { user };
};