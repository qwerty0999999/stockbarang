import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;
  const search = url.searchParams.get('search') || '';
  const categoryId = url.searchParams.get('categoryId');
  const supplierId = url.searchParams.get('supplierId');

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (supplierId) where.supplierId = parseInt(supplierId);

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: { category: true, supplier: true }
  });

  const total = await prisma.item.count({ where });
  return new Response(JSON.stringify({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }), { status: 200 });
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
		
		// Create initial transaction if quantity > 0
		if (parsedQuantity > 0) {
			await prisma.transaction.create({
				data: {
					type: 'MASUK',
					quantity: parsedQuantity,
					note: 'Stok awal',
					itemId: item.id,
					userId: 1 // Assuming userId 1 is system/admin
				}
			});
		}
		
		return new Response(JSON.stringify(item), { status: 201 });
	} catch (err: any) {
		if (err.code === 'P2002') {
			return new Response(JSON.stringify({ error: 'SKU sudah digunakan barang lain' }), { status: 400 });
		}
		return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
	}
};
