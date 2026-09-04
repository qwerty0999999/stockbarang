import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const currentUserId = locals.user.userId;
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  const data = await request.json();
  
  try {
    const loan = await db.loan.findUnique({
      where: { id },
      include: { item: true, asset: true }
    });
    if (!loan) return json({ error: 'Peminjaman tidak ditemukan' }, { status: 404 });
    if (loan.status === 'DIKEMBALIKAN') return json({ error: 'Peminjaman sudah dikembalikan' }, { status: 400 });
    
    const conditionAfter = data.conditionAfter || loan.conditionBefore || 'BAIK';

    const result = await db.$transaction(async (tx: any) => {
      // Update loan status
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
      
      if (loan.itemId) {
        // Increase item quantity
        await tx.item.update({
          where: { id: loan.itemId },
          data: { quantity: { increment: loan.quantity } }
        });
        
        // Create transaction for return
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
        const nextStatus = (conditionAfter === 'RUSAK_BERAT' || conditionAfter === 'HILANG') ? 'AFKIR' : 'TERSEDIA';
        await tx.asset.update({
          where: { id: loan.assetId },
          data: {
            status: nextStatus,
            condition: conditionAfter
          }
        });
      }
      
      return updatedLoan;
    });

    await logAction(currentUserId, 'KEMBALI_BARANG', `Pengembalian ${loan.loanCode}: ${loan.item?.name || loan.asset?.name || ''} (Kondisi: ${conditionAfter})`);
    
    return json(result);
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}