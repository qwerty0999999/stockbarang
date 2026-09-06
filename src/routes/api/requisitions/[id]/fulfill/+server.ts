import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ locals, params }: RequestEvent) {
  if (!locals.user || !['admin', 'dev', 'manajemen'].includes(locals.user.role)) {
    return json({ error: 'Unauthorized' }, { status: 403 });
  }

  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  const currentUserId = locals.user.userId;

  try {
    const req = await db.requisition.findUnique({
      where: { id },
      include: {
        requester: true,
        items: {
          include: { item: true, asset: true }
        }
      }
    });

    if (!req) return json({ error: 'Permohonan tidak ditemukan' }, { status: 404 });
    if (req.status !== 'APPROVED') {
      return json({ error: 'Hanya permohonan yang berstatus APPROVED yang dapat diserahterimakan' }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Process items
      for (const reqItem of req.items) {
        if (reqItem.itemId && reqItem.item) {
          // Check stock
          if (reqItem.item.quantity < reqItem.quantity) {
            throw new Error(`Stok barang ${reqItem.item.name} tidak mencukupi (Tersisa ${reqItem.item.quantity}, diminta ${reqItem.quantity})`);
          }

          // Decrement stock
          await tx.item.update({
            where: { id: reqItem.itemId },
            data: { quantity: { decrement: reqItem.quantity } }
          });

          // Create KELUAR transaction
          await tx.transaction.create({
            data: {
              type: 'KELUAR',
              quantity: reqItem.quantity,
              note: `Permohonan ${req.requisitionCode} (${req.requester.username} - ${req.department || 'Staff'}): ${req.reason}`,
              reference: req.requisitionCode,
              itemId: reqItem.itemId,
              userId: currentUserId
            }
          });
        } else if (reqItem.assetId && reqItem.asset) {
          if (reqItem.asset.status !== 'TERSEDIA') {
            throw new Error(`Aset ${reqItem.asset.name} sedang ${reqItem.asset.status}`);
          }

          // Update asset status
          await tx.asset.update({
            where: { id: reqItem.assetId },
            data: { status: 'DIPINJAM' }
          });

          // Create Loan record
          const loanCode = `LN-${Date.now().toString().slice(-6)}`;
          await tx.loan.create({
            data: {
              loanCode,
              borrowerName: req.requester.username,
              quantity: 1,
              status: 'DIPINJAM',
              expectedReturnDate: req.neededDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              conditionBefore: reqItem.asset.condition || 'BAIK',
              notes: `Diterbitkan dari Requisition ${req.requisitionCode}`,
              assetId: reqItem.assetId,
              userId: currentUserId
            }
          });
        }
      }

      // 2. Update Requisition status to COMPLETED
      const updatedReq = await tx.requisition.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });

      return updatedReq;
    });

    await logAction(
      currentUserId,
      'FULFILL_REQUISITION',
      `Serah terima permohonan ${req.requisitionCode} berhasil diselesaikan (Stok barang / pinjaman aset diperbarui)`
    );

    return json({
      success: true,
      message: 'Serah terima permohonan berhasil diproses dan stok inventaris telah disesuaikan',
      data: result
    });
  } catch (err: any) {
    return json({ error: err.message || 'Gagal memproses serah terima permohonan' }, { status: 400 });
  }
}
