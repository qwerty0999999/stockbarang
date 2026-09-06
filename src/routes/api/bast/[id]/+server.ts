import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const doc = await db.handoverDocument.findUnique({
    where: { id },
    include: {
      loan: {
        include: {
          borrower: true,
          asset: { include: { location: true, category: true, brand: true } },
          item: { include: { category: true } }
        }
      }
    }
  });

  if (!doc) return json({ error: 'Dokumen BAST tidak ditemukan' }, { status: 404 });
  return json(doc);
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user || !['admin', 'dev'].includes(locals.user.role)) {
    return json({ error: 'Hanya Admin atau Dev yang berhak menghapus BAST' }, { status: 403 });
  }
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const doc = await db.handoverDocument.findUnique({ where: { id } });
  if (!doc) return json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });

  await db.handoverDocument.delete({ where: { id } });
  await logAction(locals.user.userId, 'DELETE_BAST', `Menghapus dokumen BAST ${doc.documentNumber}`);

  return json({ success: true });
}
