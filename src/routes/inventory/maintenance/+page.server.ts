import type { PageServerLoad } from './$types';
import { prisma as db } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, '/login');

  const page = Number(url.searchParams.get('page')) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const status = url.searchParams.get('status') || '';
  const type = url.searchParams.get('type') || '';
  const search = url.searchParams.get('search') || '';

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { maintenanceCode: { contains: search, mode: 'insensitive' } },
      { vendor: { contains: search, mode: 'insensitive' } },
      { asset: { name: { contains: search, mode: 'insensitive' } } },
      { asset: { assetCode: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [maintenances, total, assets, stats] = await Promise.all([
    db.assetMaintenance.findMany({
      where,
      orderBy: { maintenanceDate: 'desc' },
      skip,
      take: limit,
      include: {
        asset: { include: { location: true, category: true } },
        performedBy: { select: { id: true, username: true } }
      }
    }),
    db.assetMaintenance.count({ where }),
    db.asset.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, assetCode: true, name: true, status: true }
    }),
    db.assetMaintenance.aggregate({
      _sum: { cost: true }
    })
  ]);

  return {
    maintenances,
    assets,
    totalCost: stats._sum.cost || 0,
    filters: { status, type, search },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
