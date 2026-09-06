import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request, locals, params }: RequestEvent) {
  if (!locals.user || !['admin', 'dev'].includes(locals.user.role)) {
    return json({ error: 'Hanya Admin atau Manajer yang berhak menyetujui/menolak permohonan barang' }, { status: 403 });
  }

  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  const currentUserId = locals.user.userId;

  try {
    const data = await request.json();
    const { action, approvalNotes } = data; // action: 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return json({ error: 'Aksi harus APPROVE atau REJECT' }, { status: 400 });
    }

    const req = await db.requisition.findUnique({ where: { id } });
    if (!req) return json({ error: 'Permohonan tidak ditemukan' }, { status: 404 });
    if (req.status === 'COMPLETED') {
      return json({ error: 'Permohonan yang telah selesai tidak dapat diubah status persetujuannya' }, { status: 400 });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await db.requisition.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: currentUserId,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || null
      },
      include: {
        requester: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } }
      }
    });

    await logAction(
      currentUserId,
      `REQUISITION_${newStatus}`,
      `${newStatus === 'APPROVED' ? 'Menyetujui' : 'Menolak'} permohonan ${req.requisitionCode} (${req.reason})`
    );

    return json({
      success: true,
      message: `Permohonan berhasil ${newStatus === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
      data: updated
    });
  } catch (err: any) {
    return json({ error: err.message || 'Gagal memproses persetujuan' }, { status: 500 });
  }
}
