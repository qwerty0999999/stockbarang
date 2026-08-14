import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function PATCH({ params, request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();

  if (data.status !== 'DIKEMBALIKAN') {
    return json({ error: 'Status tidak valid' }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx: any) => {
      const loan = await tx.loan.findUnique({ where: { id: parseInt(params.id as string) } });
      if (!loan) throw new Error('Data peminjaman tidak ditemukan');
      if (loan.status === 'DIKEMBALIKAN') throw new Error('Barang sudah dikembalikan sebelumnya');

      // Update peminjaman menjadi DIKEMBALIKAN
      const updatedLoan = await tx.loan.update({
        where: { id: parseInt(params.id as string) },
        data: {
          status: 'DIKEMBALIKAN',
          actualReturnDate: new Date(),
          notes: data.notes || loan.notes
        },
        include: { item: true, user: { select: { username: true } } }
      });

      // Kembalikan stok ke item
      await tx.item.update({
        where: { id: loan.itemId },
        data: { quantity: { increment: loan.quantity } }
      });

      return updatedLoan;
    });

    return json(result);
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE({ params, request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const loan = await db.loan.findUnique({ where: { id: parseInt(params.id as string) } });
    if (!loan) return json({ error: 'Tidak ditemukan' }, { status: 404 });
    
    await db.$transaction(async (tx: any) => {
      // Jika status masih DIPINJAM, kembalikan stok dulu
      if (loan.status === 'DIPINJAM') {
        await tx.item.update({
          where: { id: loan.itemId },
          data: { quantity: { increment: loan.quantity } }
        });
      }
      await tx.loan.delete({ where: { id: parseInt(params.id as string) } });
    });
    
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}
