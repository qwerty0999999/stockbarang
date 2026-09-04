import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const now = new Date();

	const [
		totalItems,
		totalUsers,
		totalSuppliers,
		totalLoans,
		returnedLoans,
		pendingLoans,
		overdueLoans,
		totalInItems,
		totalOutItems,
		countInTx,
		countOutTx,
		totalAssets,
		availableAssets,
		loanedAssets,
		damagedAssets
	] = await Promise.all([
		prisma.item.count(),
		prisma.user.count(),
		prisma.supplier.count(),
		prisma.loan.count(),
		prisma.loan.count({ where: { status: 'DIKEMBALIKAN' } }),
		prisma.loan.count({ where: { status: 'DIPINJAM' } }),
		prisma.loan.count({ where: { status: 'DIPINJAM', expectedReturnDate: { lt: now } } }),
		prisma.transaction.aggregate({ where: { type: 'MASUK' }, _sum: { quantity: true } }),
		prisma.transaction.aggregate({ where: { type: 'KELUAR' }, _sum: { quantity: true } }),
		prisma.transaction.count({ where: { type: 'MASUK' } }),
		prisma.transaction.count({ where: { type: 'KELUAR' } }),
		prisma.asset.count(),
		prisma.asset.count({ where: { status: 'TERSEDIA' } }),
		prisma.asset.count({ where: { status: 'DIPINJAM' } }),
		prisma.asset.count({ where: { condition: { in: ['RUSAK_RINGAN', 'RUSAK_BERAT', 'HILANG'] } } })
	]);

	return {
		stats: {
			totalItems,
			totalUsers,
			totalSuppliers,
			totalLoans,
			returnedLoans,
			pendingLoans,
			overdueLoans,
			totalInItems: totalInItems._sum.quantity ?? 0,
			totalOutItems: totalOutItems._sum.quantity ?? 0,
			countInTx,
			countOutTx,
			totalAssets,
			availableAssets,
			loanedAssets,
			damagedAssets
		},
		user: {
			id: locals.user.userId,
			username: locals.user.username,
			role: locals.user.role
		}
	};
};