import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;
  const search = url.searchParams.get('search') || '';
  const categoryId = url.searchParams.get('categoryId');
  const locationId = url.searchParams.get('locationId');
  const status = url.searchParams.get('status');

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { assetCode: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (locationId) where.locationId = parseInt(locationId);
  if (status) where.status = status;

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: { category: true, brand: true, location: true, supplier: true, user: true }
  });

  const total = await prisma.asset.count({ where });
  return new Response(JSON.stringify({
    assets,
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
    const {
      assetCode, serialNumber, name, condition, status, pic,
      purchaseDate, price, description,
      categoryId, brandId, locationId, supplierId, userId
    } = await request.json();

    if (!assetCode || !name) {
      return new Response(JSON.stringify({ error: 'Kode aset dan nama wajib diisi' }), { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        assetCode,
        serialNumber: serialNumber || null,
        name,
        condition: condition || 'BAIK',
        status: status || 'TERSEDIA',
        pic: pic || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        price: price ? parseFloat(price) : null,
        description: description || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        brandId: brandId ? parseInt(brandId) : null,
        locationId: locationId ? parseInt(locationId) : null,
        supplierId: supplierId ? parseInt(supplierId) : null,
        userId: userId ? parseInt(userId) : null
      }
    });

    return new Response(JSON.stringify(asset), { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return new Response(JSON.stringify({ error: 'Kode aset sudah digunakan' }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
  }
};