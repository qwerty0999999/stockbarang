import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function PATCH({ params, request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const currentUserId = locals.user.userId;
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const data = await request.json();

  if (data.status !== 'DIKEMBALIKAN') {
    return json({ error: 'Status tidak valid' }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx: any) => {
      const loan = await tx.loan.findUnique({ where: { id } });
      if (!loan) throw new Error('Data peminjaman tidak ditemukan');
      if (loan.status === 'DIKEMBALIKAN') throw new Error('Barang sudah dikembalikan sebelumnya');

      const conditionAfter = data.conditionAfter || loan.conditionBefore || 'BAIK';

      // Update peminjaman menjadi DIKEMBALIKAN
      const updatedLoan = await tx.loan.update({
        where: { id },
        data: {
          status: 'DIKEMBALIKAN',
          actualReturnDate: new Date(),
          conditionAfter,
          notes: data.notes || loan.notes
        },
        include: { item: true, asset: true, borrower: true, user: { select: { username: true } } }
      });

      // Kembalikan stok atau ubah status aset
      if (loan.itemId) {
        await tx.item.update({
          where: { id: loan.itemId },
          data: { quantity: { increment: loan.quantity } }
        });

        await tx.transaction.create({
          data: {
            type: 'MASUK',
            quantity: loan.quantity,
            note: `Pengembalian peminjaman ${loan.loanCode}`,
            reference: loan.loanCode,
            itemId: loan.itemId,
            userId: currentUserId
          }
        });
      } else if (loan.assetId) {
        await tx.asset.update({
          where: { id: loan.assetId },
          data: {
            status: 'TERSEDIA',
            condition: conditionAfter
          }
        });
      }

      return updatedLoan;
    });

    return json(result);
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE({ params, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const loan = await db.loan.findUnique({ where: { id } });
    if (!loan) return json({ error: 'Tidak ditemukan' }, { status: 404 });

    await db.$transaction(async (tx: any) => {
      // Jika status masih DIPINJAM, kembalikan stok atau kembalikan status aset
      if (loan.status === 'DIPINJAM') {
        if (loan.itemId) {
          await tx.item.update({
            where: { id: loan.itemId },
            data: { quantity: { increment: loan.quantity } }
          });
        } else if (loan.assetId) {
          await tx.asset.update({
            where: { id: loan.assetId },
            data: { status: 'TERSEDIA' }
          });
        }
      }
      await tx.loan.delete({ where: { id } });
    });

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}
