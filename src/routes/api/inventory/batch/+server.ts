import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { ids, quantity, type } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'Pilih minimal satu barang' }), { status: 400 });
    }

    if (quantity === undefined || quantity === null || quantity < 0) {
      return new Response(JSON.stringify({ error: 'Jumlah stok tidak valid' }), { status: 400 });
    }

    const parsedQuantity = Number(quantity);
    const isSetOperation = type === 'set';

    const items = await prisma.item.findMany({
      where: { id: { in: ids } },
      select: { id: true, quantity: true }
    });

    const validIds = items.map(i => i.id);
    const transactionType = isSetOperation ? 'ADJUSTMENT' : (parsedQuantity >= 0 ? 'MASUK' : 'KELUAR');

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const newQuantity = isSetOperation ? parsedQuantity : item.quantity + parsedQuantity;
        await tx.item.update({
          where: { id: item.id },
          data: { quantity: newQuantity }
        });
        await tx.transaction.create({
          data: {
            itemId: item.id,
            type: transactionType,
            quantity: parsedQuantity,
            reference: 'Batch Update',
            notes: `Batch ${isSetOperation ? 'set' : 'add'} ${parsedQuantity}`,
            userId: locals.user!.userId
          }
        });
      }
    });

    return new Response(JSON.stringify({ success: true, count: validIds.length }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
  }
};