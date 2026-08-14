import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const [transactions, items, suppliers] = await Promise.all([
		prisma.transaction.findMany({
			include: { item: true, supplier: true, user: { select: { username: true } } },
			orderBy: { createdAt: 'desc' }
		}),
		prisma.item.findMany({
			orderBy: { name: 'asc' }
		}),
		prisma.supplier.findMany({
			orderBy: { name: 'asc' }
		})
	]);

	return { transactions, items, suppliers, user: locals.user };
};
