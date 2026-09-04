import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const now = new Date();

	const [items, transactions, assets, loans, categories, locations] = await Promise.all([
		prisma.item.findMany({
			orderBy: { name: 'asc' },
			include: {
				category: true,
				supplier: true
			}
		}),
		prisma.transaction.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				item: true,
				supplier: true,
				user: { select: { username: true } }
			}
		}),
		prisma.asset.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				category: true,
				brand: true,
				location: true,
				supplier: true
			}
		}),
		prisma.loan.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				item: true,
				asset: true,
				borrower: true,
				user: { select: { username: true } }
			}
		}),
		prisma.category.findMany({ orderBy: { name: 'asc' } }),
		prisma.location.findMany({ orderBy: { name: 'asc' } })
	]);

	const processedLoans = loans.map((loan) => {
		const isOverdue = loan.status === 'DIPINJAM' && loan.expectedReturnDate && new Date(loan.expectedReturnDate) < now;
		return {
			...loan,
			isOverdue: Boolean(isOverdue)
		};
	});

	return {
		items,
		transactions,
		assets,
		loans: processedLoans,
		categories,
		locations,
		user: locals.user
	};
};