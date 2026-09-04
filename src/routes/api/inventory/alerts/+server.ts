import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		const now = new Date();

		const [items, overdueLoans] = await Promise.all([
			prisma.item.findMany({
				select: {
					id: true,
					name: true,
					sku: true,
					quantity: true,
					minStock: true
				},
				orderBy: {
					quantity: 'asc'
				}
			}),
			prisma.loan.findMany({
				where: {
					status: 'DIPINJAM',
					expectedReturnDate: {
						lt: now
					}
				},
				include: {
					borrower: true,
					item: true,
					asset: true
				}
			})
		]);

		const lowStockItems = items.filter((i) => i.quantity <= i.minStock);

		return new Response(JSON.stringify({ lowStockItems, overdueLoans }), { status: 200 });
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Gagal mengambil data alert' }), { status: 500 });
	}
};
