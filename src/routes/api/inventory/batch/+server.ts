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
    const operation = type === 'set' ? 'set' : 'add';

    const results = await prisma.$transaction(async (tx) => {
      const updatedItems = [];
      for (const id of ids) {
        const item = await tx.item.findUnique({ where: { id } });
        if (!item) continue;

        let newQuantity;
        if (operation === 'set') {
          newQuantity = parsedQuantity;
        } else {
          newQuantity = item.quantity + parsedQuantity;
        }

        const updated = await tx.item.update({
          where: { id },
          data: { quantity: newQuantity }
        });

        await tx.transaction.create({
          data: {
            itemId: id,
            type: operation === 'set' ? 'SET' : parsedQuantity >= 0 ? 'MASUK' : 'KELUAR',
            quantity: operation === 'set' ? parsedQuantity : parsedQuantity,
            reference: 'Batch Update',
            notes: `Batch ${operation} ${parsedQuantity}`,
            userId: locals.user!.userId
          }
        });

        updatedItems.push(updated);
      }
      return updatedItems;
    });

    return new Response(JSON.stringify({ success: true, count: results.length }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
  }
};