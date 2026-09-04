import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  const item = await db.item.findUnique({
    where: { id },
    include: { category: true, supplier: true }
  });
  if (!item) return json({ error: 'Barang tidak ditemukan' }, { status: 404 });
  return json(item);
}

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  const data = await request.json();
  try {
    const existing = await db.item.findUnique({ where: { id } });
    if (!existing) return json({ error: 'Barang tidak ditemukan' }, { status: 404 });

    if (data.sku) {
      const duplicate = await db.item.findFirst({
        where: { sku: data.sku, id: { not: id } }
      });
      if (duplicate) return json({ error: 'SKU sudah digunakan' }, { status: 400 });
    }

    const item = await db.item.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku || null,
        location: data.location || null,
        minStock: data.minStock !== undefined ? Number(data.minStock) : undefined,
        quantity: data.quantity !== undefined ? Number(data.quantity) : undefined,
        price: data.price !== undefined ? Number(data.price) : undefined,
        description: data.description,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        supplierId: data.supplierId ? parseInt(data.supplierId) : null
      }
    });
    return json(item);
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  try {
    const transactions = await db.transaction.count({ where: { itemId: id } });
    if (transactions > 0) {
      return json({ error: 'Barang tidak bisa dihapus karena memiliki transaksi' }, { status: 400 });
    }
    const loans = await db.loan.count({ where: { itemId: id } });
    if (loans > 0) {
      return json({ error: 'Barang tidak bisa dihapus karena memiliki peminjaman' }, { status: 400 });
    }
    await db.item.delete({ where: { id } });
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}