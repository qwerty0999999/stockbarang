import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ locals, params }: RequestEvent) {
  if (!locals.user || !['admin', 'dev'].includes(locals.user.role)) {
    return json({ error: 'Hanya Admin atau Super User yang berwenang menyetujui dan mengeksekusi penyesuaian stok' }, { status: 403 });
  }

  const opnameId = parseInt(params.id || '');
  if (isNaN(opnameId)) return json({ error: 'ID sesi tidak valid' }, { status: 400 });
  const currentUserId = locals.user.userId;

  try {
    const opname = await db.stockOpname.findUnique({
      where: { id: opnameId },
      include: {
        items: {
          include: { item: true }
        }
      }
    });

    if (!opname) return json({ error: 'Sesi stock opname tidak ditemukan' }, { status: 404 });
    if (opname.status === 'ADJUSTED') {
      return json({ error: 'Sesi ini sudah pernah disesuaikan (ADJUSTED)' }, { status: 400 });
    }

    const itemsToAdjust = opname.items.filter(i => i.variance !== 0);

    // Execute in transaction
    const result = await db.$transaction(async (tx) => {
      let createdTransactionsCount = 0;

      for (const opItem of itemsToAdjust) {
        // Update item quantity to match physical count
        await tx.item.update({
          where: { id: opItem.itemId },
          data: { quantity: opItem.physicalQty }
        });

        // Record adjustment transaction
        await tx.transaction.create({
          data: {
            type: 'ADJUSTMENT',
            quantity: Math.abs(opItem.variance),
            note: `Stock Opname [${opname.opnameCode}]: ${opItem.variance > 0 ? 'Fisik Lebih' : 'Fisik Kurang'} (${opItem.reason || 'Rekonsiliasi Fisik Gudang'})`,
            reference: opname.opnameCode,
            itemId: opItem.itemId,
            userId: currentUserId
          }
        });

        createdTransactionsCount++;
      }

      // Mark StockOpname as ADJUSTED
      const updatedOpname = await tx.stockOpname.update({
        where: { id: opnameId },
        data: {
          status: 'ADJUSTED',
          approvedById: currentUserId,
          approvedAt: new Date()
        },
        include: {
          approvedBy: { select: { id: true, username: true } },
          auditor: { select: { id: true, username: true } }
        }
      });

      return {
        opname: updatedOpname,
        adjustedItemsCount: createdTransactionsCount
      };
    });

    await logAction(
      currentUserId,
      'STOCK_OPNAME_ADJUSTED',
      `Menyetujui & mengeksekusi penyesuaian stok opname ${opname.opnameCode}: ${result.adjustedItemsCount} barang disinkronkan`
    );

    return json({
      success: true,
      message: `Berhasil mengeksekusi penyesuaian stok untuk ${result.adjustedItemsCount} barang`,
      data: result
    });
  } catch (err: any) {
    return json({ error: err.message || 'Gagal mengeksekusi penyesuaian stok' }, { status: 500 });
  }
}
