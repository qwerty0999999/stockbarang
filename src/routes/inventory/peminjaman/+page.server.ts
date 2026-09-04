import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const now = new Date();

	const [loans, items, assets, borrowers] = await Promise.all([
		prisma.loan.findMany({
			include: {
				item: true,
				asset: true,
				borrower: true,
				user: { select: { id: true, username: true } }
			},
			orderBy: { createdAt: 'desc' }
		}),
		prisma.item.findMany({
			where: { quantity: { gt: 0 } },
			select: { id: true, name: true, sku: true, quantity: true },
			orderBy: { name: 'asc' }
		}),
		prisma.asset.findMany({
			where: { status: 'TERSEDIA' },
			select: { id: true, name: true, assetCode: true, condition: true },
			orderBy: { name: 'asc' }
		}),
		prisma.borrower.findMany({
			select: { id: true, name: true, department: true, type: true },
			orderBy: { name: 'asc' }
		})
	]);

	const processedLoans = loans.map((loan) => {
		const isOverdue = loan.status === 'DIPINJAM' && loan.expectedReturnDate && new Date(loan.expectedReturnDate) < now;
		return {
			...loan,
			isOverdue: Boolean(isOverdue)
		};
	});

	const activeCount = processedLoans.filter(l => l.status === 'DIPINJAM').length;
	const overdueCount = processedLoans.filter(l => l.isOverdue).length;
	const returnedCount = processedLoans.filter(l => l.status === 'DIKEMBALIKAN').length;

	return {
		loans: processedLoans,
		items,
		assets,
		borrowers,
		stats: {
			total: processedLoans.length,
			activeCount,
			overdueCount,
			returnedCount
		},
		user: locals.user
	};
};