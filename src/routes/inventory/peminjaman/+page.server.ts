import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const [loans, items] = await Promise.all([
		prisma.loan.findMany({
			include: {
				item: true,
				user: { select: { username: true } }
			},
			orderBy: { createdAt: 'desc' }
		}),
		prisma.item.findMany({
			orderBy: { name: 'asc' }
		})
	]);

	return {
		loans,
		items,
		user: locals.user
	};
};