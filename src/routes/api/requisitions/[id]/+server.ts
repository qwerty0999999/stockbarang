import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const req = await db.requisition.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, username: true } },
      approvedBy: { select: { id: true, username: true } },
      items: {
        include: {
          item: { include: { category: true } },
          asset: { include: { location: true, category: true } }
        }
      }
    }
  });

  if (!req) return json({ error: 'Permohonan tidak ditemukan' }, { status: 404 });
  return json(req);
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const req = await db.requisition.findUnique({ where: { id } });
  if (!req) return json({ error: 'Permohonan tidak ditemukan' }, { status: 404 });

  // Only requester (if still pending/draft) or admin/dev can delete
  if (req.requesterId !== locals.user.userId && !['admin', 'dev'].includes(locals.user.role)) {
    return json({ error: 'Tidak berhak menghapus permohonan ini' }, { status: 403 });
  }

  if (req.status === 'COMPLETED') {
    return json({ error: 'Permohonan yang telah diserahterimakan tidak dapat dihapus' }, { status: 400 });
  }

  await db.requisition.delete({ where: { id } });
  await logAction(locals.user.userId, 'DELETE_REQUISITION', `Menghapus permohonan ${req.requisitionCode}`);

  return json({ success: true });
}
