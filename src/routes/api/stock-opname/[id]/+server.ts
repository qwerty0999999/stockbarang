import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const opname = await db.stockOpname.findUnique({
    where: { id },
    include: {
      auditor: { select: { id: true, username: true } },
      approvedBy: { select: { id: true, username: true } },
      location: true,
      category: true,
      items: {
        include: {
          item: {
            include: {
              category: true
            }
          }
        },
        orderBy: { item: { name: 'asc' } }
      }
    }
  });

  if (!opname) return json({ error: 'Sesi stock opname tidak ditemukan' }, { status: 404 });

  // Recalculate summary stats
  const items = opname.items;
  const matchCount = items.filter(i => i.variance === 0).length;
  const surplusCount = items.filter(i => i.variance > 0).length;
  const deficitCount = items.filter(i => i.variance < 0).length;
  const totalVarianceUnits = items.reduce((acc, i) => acc + Math.abs(i.variance), 0);
  const totalVarianceValue = items.reduce((acc, i) => acc + (i.variance * (i.item.price || 0)), 0);

  return json({
    opname,
    stats: {
      totalItems: items.length,
      matchCount,
      surplusCount,
      deficitCount,
      totalVarianceUnits,
      totalVarianceValue
    }
  });
}

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const data = await request.json();
    const opname = await db.stockOpname.findUnique({ where: { id } });
    if (!opname) return json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    if (opname.status === 'ADJUSTED') {
      return json({ error: 'Sesi yang sudah disesuaikan tidak dapat diedit lagi' }, { status: 400 });
    }

    const updated = await db.stockOpname.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : opname.title,
        status: data.status !== undefined ? data.status : opname.status,
        notes: data.notes !== undefined ? data.notes : opname.notes
      }
    });

    return json(updated);
  } catch (err: any) {
    return json({ error: err.message || 'Gagal memperbarui sesi' }, { status: 500 });
  }
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user || !['admin', 'dev'].includes(locals.user.role)) {
    return json({ error: 'Hanya Admin atau Dev yang dapat menghapus sesi' }, { status: 403 });
  }
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const opname = await db.stockOpname.findUnique({ where: { id } });
  if (!opname) return json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
  if (opname.status === 'ADJUSTED') {
    return json({ error: 'Sesi yang sudah dieksekusi penyesuaian stok tidak dapat dihapus' }, { status: 400 });
  }

  await db.stockOpname.delete({ where: { id } });
  await logAction(locals.user.userId, 'STOCK_OPNAME_DELETE', `Menghapus sesi Stock Opname ${opname.opnameCode}`);

  return json({ success: true, message: 'Sesi stock opname berhasil dihapus' });
}
