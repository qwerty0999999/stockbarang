import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = Number(params.id);
		if (isNaN(id)) {
			return new Response(JSON.stringify({ error: 'ID tidak valid' }), { status: 400 });
		}

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

		const item = await prisma.item.update({
			where: { id },
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
		return new Response(JSON.stringify(item), { status: 200 });
	} catch (err: any) {
		if (err.code === 'P2025') {
			return new Response(JSON.stringify({ error: 'Barang tidak ditemukan' }), { status: 404 });
		}
		if (err.code === 'P2002') {
			return new Response(JSON.stringify({ error: 'SKU sudah digunakan barang lain' }), { status: 400 });
		}
		return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = Number(params.id);
		if (isNaN(id)) {
			return new Response(JSON.stringify({ error: 'ID tidak valid' }), { status: 400 });
		}

		await prisma.item.delete({ where: { id } });
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (err: any) {
		if (err.code === 'P2025') {
			return new Response(JSON.stringify({ error: 'Barang tidak ditemukan' }), { status: 404 });
		}
		return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
	}
};