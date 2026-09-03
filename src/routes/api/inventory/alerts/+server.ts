import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		const lowStockItems = await prisma.item.findMany({
			where: {
				quantity: {
					lte: 5 // Default threshold or dynamically checked
				}
			},
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
		});

		// Filter items where quantity is strictly <= minStock
		const filtered = lowStockItems.filter((i) => i.quantity <= i.minStock);

		return new Response(JSON.stringify({ lowStockItems: filtered }), { status: 200 });
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Gagal mengambil data stok' }), { status: 500 });
	}
};
