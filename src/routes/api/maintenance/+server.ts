import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, url }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const assetId = url.searchParams.get('assetId');
  const search = url.searchParams.get('search');
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (assetId) where.assetId = parseInt(assetId);
  if (search) {
    where.OR = [
      { maintenanceCode: { contains: search, mode: 'insensitive' } },
      { vendor: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { asset: { name: { contains: search, mode: 'insensitive' } } },
      { asset: { assetCode: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [maintenances, total] = await Promise.all([
    db.assetMaintenance.findMany({
      where,
      orderBy: { maintenanceDate: 'desc' },
      skip,
      take: limit,
      include: {
        asset: {
          include: {
            category: true,
            location: true
          }
        },
        performedBy: { select: { id: true, username: true } }
      }
    }),
    db.assetMaintenance.count({ where })
  ]);

  return json({
    maintenances,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const currentUserId = locals.user.userId;

  try {
    const data = await request.json();
    const {
      assetId,
      maintenanceDate,
      type = 'RUTIN',
      status = 'SCHEDULED',
      cost = 0,
      invoiceNumber,
      vendor,
      technician,
      description,
      setAssetUnderMaintenance = true
    } = data;

    if (!assetId) {
      return json({ error: 'Aset wajib dipilih' }, { status: 400 });
    }

    const asset = await db.asset.findUnique({ where: { id: parseInt(assetId) } });
    if (!asset) return json({ error: 'Aset tidak ditemukan' }, { status: 404 });

    const maintenanceCode = `MNT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const maintenance = await db.$transaction(async (tx) => {
      const created = await tx.assetMaintenance.create({
        data: {
          maintenanceCode,
          assetId: parseInt(assetId),
          maintenanceDate: maintenanceDate ? new Date(maintenanceDate) : new Date(),
          type,
          status,
          cost: cost ? parseFloat(cost.toString()) : 0,
          invoiceNumber: invoiceNumber || null,
          vendor: vendor || null,
          technician: technician || null,
          description: description || null,
          performedById: currentUserId
        },
        include: {
          asset: true,
          performedBy: { select: { id: true, username: true } }
        }
      });

      // Update asset status to UNDER_MAINTENANCE if in progress or scheduled and requested
      if (setAssetUnderMaintenance && (status === 'IN_PROGRESS' || status === 'SCHEDULED')) {
        await tx.asset.update({
          where: { id: parseInt(assetId) },
          data: { status: 'UNDER_MAINTENANCE' }
        });
      }

      return created;
    });

    await logAction(
      currentUserId,
      'ASSET_MAINTENANCE_CREATED',
      `Mencatat pemeliharaan ${maintenanceCode} untuk aset ${asset.name} (${asset.assetCode})`
    );

    return json(maintenance, { status: 201 });
  } catch (err: any) {
    return json({ error: err.message || 'Gagal membuat data pemeliharaan' }, { status: 500 });
  }
}
