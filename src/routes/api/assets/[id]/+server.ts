import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      location: true,
      supplier: true,
      user: { select: { id: true, username: true } },
      movements: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true } } }
      },
      loans: {
        orderBy: { createdAt: 'desc' },
        include: { borrower: true, user: { select: { username: true } } }
      }
    }
  });

  if (!asset) return json({ error: 'Aset tidak ditemukan' }, { status: 404 });
  return json(asset);
}

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const data = await request.json();
    const existing = await db.asset.findUnique({ where: { id } });
    if (!existing) return json({ error: 'Aset tidak ditemukan' }, { status: 404 });

    if (data.assetCode && data.assetCode !== existing.assetCode) {
      const duplicate = await db.asset.findFirst({
        where: { assetCode: data.assetCode, id: { not: id } }
      });
      if (duplicate) return json({ error: 'Kode aset sudah digunakan' }, { status: 400 });
    }

    const updated = await db.asset.update({
      where: { id },
      data: {
        assetCode: data.assetCode !== undefined ? data.assetCode : existing.assetCode,
        serialNumber: data.serialNumber !== undefined ? (data.serialNumber || null) : existing.serialNumber,
        name: data.name !== undefined ? data.name : existing.name,
        condition: data.condition !== undefined ? data.condition : existing.condition,
        status: data.status !== undefined ? data.status : existing.status,
        pic: data.pic !== undefined ? (data.pic || null) : existing.pic,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : (data.purchaseDate === null ? null : existing.purchaseDate),
        price: data.price !== undefined ? (data.price ? parseFloat(data.price) : null) : existing.price,
        description: data.description !== undefined ? (data.description || null) : existing.description,
        categoryId: data.categoryId !== undefined ? (data.categoryId ? parseInt(data.categoryId) : null) : existing.categoryId,
        brandId: data.brandId !== undefined ? (data.brandId ? parseInt(data.brandId) : null) : existing.brandId,
        locationId: data.locationId !== undefined ? (data.locationId ? parseInt(data.locationId) : null) : existing.locationId,
        supplierId: data.supplierId !== undefined ? (data.supplierId ? parseInt(data.supplierId) : null) : existing.supplierId
      },
      include: {
        category: true,
        brand: true,
        location: true,
        supplier: true
      }
    });

    return json(updated);
  } catch (err: any) {
    return json({ error: err.message || 'Gagal memperbarui aset' }, { status: 500 });
  }
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const target = await db.asset.findUnique({ where: { id }, select: { assetCode: true, name: true } });
    if (!target) return json({ error: 'Aset tidak ditemukan' }, { status: 404 });

    const activeLoans = await db.loan.count({
      where: { assetId: id, status: 'DIPINJAM' }
    });
    if (activeLoans > 0) {
      return json({ error: 'Aset tidak dapat dihapus karena sedang dalam status peminjaman' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      // Unlink past returned loans to avoid FK constraint violation
      await tx.loan.updateMany({
        where: { assetId: id },
        data: { assetId: null }
      });
      await tx.asset.delete({ where: { id } });
    });

    await logAction(locals.user.userId, 'HAPUS_ASET', `Hapus aset tetap: ${target.assetCode} - ${target.name}`);

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || 'Gagal menghapus aset' }, { status: 500 });
  }
}
