import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const maintenance = await db.assetMaintenance.findUnique({
    where: { id },
    include: {
      asset: { include: { category: true, location: true, brand: true } },
      performedBy: { select: { id: true, username: true } }
    }
  });

  if (!maintenance) return json({ error: 'Data pemeliharaan tidak ditemukan' }, { status: 404 });
  return json(maintenance);
}

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const data = await request.json();
    const existing = await db.assetMaintenance.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!existing) return json({ error: 'Data pemeliharaan tidak ditemukan' }, { status: 404 });

    const newStatus = data.status || existing.status;
    const isNowCompleted = newStatus === 'COMPLETED' && existing.status !== 'COMPLETED';

    const updated = await db.$transaction(async (tx) => {
      const m = await tx.assetMaintenance.update({
        where: { id },
        data: {
          status: newStatus,
          completionDate: data.completionDate ? new Date(data.completionDate) : (isNowCompleted ? new Date() : existing.completionDate),
          cost: data.cost !== undefined ? parseFloat(data.cost.toString()) : existing.cost,
          invoiceNumber: data.invoiceNumber !== undefined ? data.invoiceNumber : existing.invoiceNumber,
          vendor: data.vendor !== undefined ? data.vendor : existing.vendor,
          technician: data.technician !== undefined ? data.technician : existing.technician,
          description: data.description !== undefined ? data.description : existing.description,
          resultNotes: data.resultNotes !== undefined ? data.resultNotes : existing.resultNotes
        },
        include: { asset: true, performedBy: { select: { id: true, username: true } } }
      });

      // If marked COMPLETED, return asset status to TERSEDIA (if it was UNDER_MAINTENANCE)
      if (isNowCompleted && existing.asset.status === 'UNDER_MAINTENANCE') {
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { status: 'TERSEDIA' }
        });
      }

      return m;
    });

    await logAction(
      locals.user.userId,
      'ASSET_MAINTENANCE_UPDATE',
      `Memperbarui pemeliharaan ${existing.maintenanceCode} (Status: ${newStatus})`
    );

    return json(updated);
  } catch (err: any) {
    return json({ error: err.message || 'Gagal memperbarui pemeliharaan' }, { status: 500 });
  }
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user || !['admin', 'dev'].includes(locals.user.role)) {
    return json({ error: 'Hanya Admin atau Dev yang berhak menghapus log pemeliharaan' }, { status: 403 });
  }
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const existing = await db.assetMaintenance.findUnique({
    where: { id },
    include: { asset: true }
  });
  if (!existing) return json({ error: 'Data pemeliharaan tidak ditemukan' }, { status: 404 });

  await db.assetMaintenance.delete({ where: { id } });

  // If asset was UNDER_MAINTENANCE, restore to TERSEDIA if no other ongoing maintenance
  const otherOngoing = await db.assetMaintenance.count({
    where: {
      assetId: existing.assetId,
      status: { in: ['IN_PROGRESS', 'SCHEDULED'] }
    }
  });

  if (otherOngoing === 0 && existing.asset.status === 'UNDER_MAINTENANCE') {
    await db.asset.update({
      where: { id: existing.assetId },
      data: { status: 'TERSEDIA' }
    });
  }

  await logAction(
    locals.user.userId,
    'ASSET_MAINTENANCE_DELETE',
    `Menghapus riwayat servis ${existing.maintenanceCode}`
  );

  return json({ success: true });
}
