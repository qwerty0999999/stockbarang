import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const [
		totalItems,
		totalUsers,
		totalSuppliers,
		totalLoans,
		returnedLoans,
		pendingLoans,
		totalInItems,
		totalOutItems,
		countInTx,
		countOutTx,
		user,
		totalInventoryValue,
		recentTransactions
	] = await prisma.$transaction([
		prisma.item.count(),
		prisma.user.count(),
		prisma.supplier.count(),
		prisma.loan.count(),
		prisma.loan.count({ where: { status: 'DIKEMBALIKAN' } }),
		prisma.loan.count({ where: { status: 'DIPINJAM' } }),
		prisma.transaction.aggregate({ where: { type: 'MASUK' }, _sum: { quantity: true } }),
		prisma.transaction.aggregate({ where: { type: 'KELUAR' }, _sum: { quantity: true } }),
		prisma.transaction.count({ where: { type: 'MASUK' } }),
		prisma.transaction.count({ where: { type: 'KELUAR' } }),
		prisma.user.findUnique({
			where: { id: locals.user.userId },
			select: { username: true, role: true }
		}),
		prisma.item.aggregate({
			_sum: {
				price: true
			}
		}),
		prisma.transaction.findMany({
			take: 7,
			orderBy: { createdAt: 'desc' },
			include: { item: true }
		})
	]);

	return {
		stats: {
			totalItems,
			totalUsers,
			totalSuppliers,
			totalLoans,
			returnedLoans,
			pendingLoans,
			totalInItems: totalInItems._sum.quantity ?? 0,
			totalOutItems: totalOutItems._sum.quantity ?? 0,
			countInTx,
			countOutTx,
			totalInventoryValue: totalInventoryValue._sum.price ?? 0
		},
		recentTransactions,
		user
	};
};