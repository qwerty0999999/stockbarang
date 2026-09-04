import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status');
  const itemId = url.searchParams.get('itemId');
  const assetId = url.searchParams.get('assetId');

  const where: any = {};
  if (search) {
    where.OR = [
      { loanCode: { contains: search, mode: 'insensitive' } },
      { borrowerName: { contains: search, mode: 'insensitive' } },
      { borrower: { name: { contains: search, mode: 'insensitive' } } },
      { item: { name: { contains: search, mode: 'insensitive' } } },
      { asset: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }
  if (status) {
    if (status === 'TERLAMBAT') {
      where.status = 'DIPINJAM';
      where.expectedReturnDate = { lt: new Date() };
    } else {
      where.status = status;
    }
  }
  if (itemId) where.itemId = parseInt(itemId);
  if (assetId) where.assetId = parseInt(assetId);

  const loans = await prisma.loan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      item: true,
      asset: true,
      borrower: true,
      user: { select: { id: true, username: true } }
    }
  });

  const total = await prisma.loan.count({ where });
  return new Response(JSON.stringify({
    loans,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }), { status: 200 });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json();
    let {
      loanCode, borrowerName, borrowerId, quantity,
      expectedReturnDate, conditionBefore, notes,
      itemId, assetId, userId
    } = body;

    const currentUserId = userId ? parseInt(userId) : locals.user?.userId;
    if (!currentUserId) {
      return new Response(JSON.stringify({ error: 'User tidak valid atau sesi berakhir' }), { status: 401 });
    }

    if (!loanCode) {
      loanCode = `LN-${Date.now().toString().slice(-6)}`;
    }

    if (!itemId && !assetId) {
      return new Response(JSON.stringify({ error: 'Pilih barang konsumsi atau aset tetap yang dipinjam' }), { status: 400 });
    }

    // Resolve borrower name
    if (borrowerId && !borrowerName) {
      const borrower = await prisma.borrower.findUnique({ where: { id: parseInt(borrowerId) } });
      if (borrower) borrowerName = borrower.name;
    }

    if (!borrowerName && !borrowerId) {
      return new Response(JSON.stringify({ error: 'Nama peminjam wajib diisi' }), { status: 400 });
    }

    const loanQuantity = quantity ? parseInt(quantity.toString()) : 1;

    // Check if item/asset is available
    if (itemId) {
      const item = await prisma.item.findUnique({
        where: { id: parseInt(itemId) }
      });
      if (!item || item.quantity < loanQuantity) {
        return new Response(JSON.stringify({ error: 'Barang tidak ditemukan atau stok tidak mencukupi' }), { status: 400 });
      }
    } else if (assetId) {
      const asset = await prisma.asset.findUnique({
        where: { id: parseInt(assetId) }
      });
      if (!asset) {
        return new Response(JSON.stringify({ error: 'Aset tidak ditemukan' }), { status: 404 });
      }
      if (asset.status !== 'TERSEDIA') {
        return new Response(JSON.stringify({ error: `Aset sedang ${asset.status}` }), { status: 400 });
      }
    }

    const loan = await prisma.$transaction(async (tx) => {
      const created = await tx.loan.create({
        data: {
          loanCode,
          borrowerName: borrowerName || null,
          borrowerId: borrowerId ? parseInt(borrowerId) : null,
          quantity: loanQuantity,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          conditionBefore: conditionBefore || 'BAIK',
          notes: notes || null,
          itemId: itemId ? parseInt(itemId) : null,
          assetId: assetId ? parseInt(assetId) : null,
          userId: currentUserId
        },
        include: {
          item: true,
          asset: true,
          borrower: true
        }
      });

      if (itemId) {
        await tx.item.update({
          where: { id: parseInt(itemId) },
          data: { quantity: { decrement: loanQuantity } }
        });
      } else if (assetId) {
        await tx.asset.update({
          where: { id: parseInt(assetId) },
          data: { status: 'DIPINJAM' }
        });
      }

      return created;
    });

    return new Response(JSON.stringify(loan), { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return new Response(JSON.stringify({ error: 'Kode peminjaman sudah digunakan' }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: err.message || 'Terjadi kesalahan internal' }), { status: 500 });
  }
};