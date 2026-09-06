import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function PATCH({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const opnameId = parseInt(params.id || '');
  if (isNaN(opnameId)) return json({ error: 'ID sesi tidak valid' }, { status: 400 });

  const opname = await db.stockOpname.findUnique({ where: { id: opnameId } });
  if (!opname) return json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
  if (opname.status === 'ADJUSTED') {
    return json({ error: 'Sesi yang telah disesuaikan tidak dapat diubah' }, { status: 400 });
  }

  try {
    const data = await request.json();
    const { opnameItemId, physicalQty, reason, notes } = data;

    if (opnameItemId == null || physicalQty == null) {
      return json({ error: 'Item ID dan kuantitas fisik wajib diisi' }, { status: 400 });
    }

    const item = await db.stockOpnameItem.findUnique({ where: { id: parseInt(opnameItemId) } });
    if (!item || item.opnameId !== opnameId) {
      return json({ error: 'Item audit tidak ditemukan dalam sesi ini' }, { status: 404 });
    }

    const pQty = Math.max(0, parseInt(physicalQty.toString()));
    const variance = pQty - item.systemQty;

    const updatedItem = await db.stockOpnameItem.update({
      where: { id: item.id },
      data: {
        physicalQty: pQty,
        variance,
        reason: reason !== undefined ? reason : item.reason,
        notes: notes !== undefined ? notes : item.notes
      },
      include: { item: true }
    });

    // Update total variance count on session
    const allItems = await db.stockOpnameItem.findMany({
      where: { opnameId }
    });
    const totalVariance = allItems.reduce((acc, i) => acc + Math.abs(i.variance), 0);
    await db.stockOpname.update({
      where: { id: opnameId },
      data: { totalVariance }
    });

    return json(updatedItem);
  } catch (err: any) {
    return json({ error: err.message || 'Gagal memperbarui item' }, { status: 500 });
  }
}
