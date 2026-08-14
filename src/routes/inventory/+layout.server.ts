import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	const user = await prisma.user.findUnique({
		where: { id: locals.user.userId },
		select: { id: true, username: true, role: true }
	});
	return { user };
};
