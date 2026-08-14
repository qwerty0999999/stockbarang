import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });
	return new Response(JSON.stringify(items), { status: 200 });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, sku, location, minStock, quantity, price, description } = await request.json();
		if (!name || price == null) {
			return new Response(JSON.stringify({ error: 'Nama dan harga wajib diisi' }), { status: 400 });
		}
		
		const parsedMinStock = minStock !== undefined ? Number(minStock) : 5;
		const parsedQuantity = quantity !== undefined ? Number(quantity) : 0;
		const parsedPrice = Number(price);
		
		if (isNaN(parsedQuantity) || parsedQuantity < 0) {
			return new Response(JSON.stringify({ error: 'Quantity harus angka positif' }), { status: 400 });
		}
		if (isNaN(parsedPrice) || parsedPrice < 0) {
			return new Response(JSON.stringify({ error: 'Harga harus angka positif' }), { status: 400 });
		}
		if (parsedMinStock < 0) {
			return new Response(JSON.stringify({ error: 'Min stock harus angka positif' }), { status: 400 });
		}

		const item = await prisma.item.create({ 
			data: { 
				name, 
				sku: sku || null,
				location: location || null,
				minStock: parsedMinStock,
				quantity: parsedQuantity, 
				price: parsedPrice, 
				description 
			} 
		});
		return new Response(JSON.stringify(item), { status: 201 });
	} catch (err: any) {
		if (err.code === 'P2002') {
			return new Response(JSON.stringify({ error: 'SKU sudah digunakan barang lain' }), { status: 400 });
		}
		return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
	}
};
