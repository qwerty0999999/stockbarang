import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, url }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;
  const itemId = url.searchParams.get('itemId');
  const type = url.searchParams.get('type');

  const where: any = {};
  if (itemId) where.itemId = parseInt(itemId);
  if (type) where.type = type;

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      item: true,
      user: { select: { username: true } },
      supplier: true
    }
  });
  const total = await db.transaction.count({ where });
  return json({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const currentUserId = locals.user.userId;
  const data = await request.json();

  if (!data.itemId || !data.type || data.quantity == null) {
    return json({ error: 'Item ID, type, dan quantity wajib diisi' }, { status: 400 });
  }
  if (!['MASUK', 'KELUAR', 'ADJUSTMENT'].includes(data.type)) {
    return json({ error: 'Type harus MASUK, KELUAR, atau ADJUSTMENT' }, { status: 400 });
  }

  const quantity = Number(data.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return json({ error: 'Quantity harus angka positif' }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx: any) => {
      const item = await tx.item.findUnique({ where: { id: parseInt(data.itemId) } });
      if (!item) throw new Error('Barang tidak ditemukan');

      let newQuantity = item.quantity;
      if (data.type === 'MASUK') {
        newQuantity += quantity;
      } else if (data.type === 'KELUAR') {
        if (item.quantity < quantity) throw new Error(`Stok tidak mencukupi. Tersisa ${item.quantity}`);
        newQuantity -= quantity;
      } else if (data.type === 'ADJUSTMENT') {
        newQuantity = quantity;
      }

      await tx.item.update({
        where: { id: parseInt(data.itemId) },
        data: { quantity: newQuantity }
      });

      return await tx.transaction.create({
        data: {
          type: data.type,
          quantity,
          note: data.note || data.notes || '',
          reference: data.reference || null,
          itemId: parseInt(data.itemId),
          userId: currentUserId,
          supplierId: data.supplierId ? parseInt(data.supplierId) : null
        },
        include: { item: true, user: { select: { username: true } }, supplier: true }
      });
    });
    return json(result);
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 });
  }
}