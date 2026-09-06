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
  if (locals.user.role === 'karyawan') {
    where.requesterId = locals.user.userId;
  }
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { requisitionCode: { contains: search, mode: 'insensitive' } },
      { reason: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
      { requester: { username: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [requisitions, total, pendingCount, availableItems, availableAssets] = await Promise.all([
    db.requisition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        requester: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } },
        items: {
          include: {
            item: true,
            asset: true
          }
        }
      }
    }),
    db.requisition.count({ where }),
    db.requisition.count({ where: { status: 'PENDING_APPROVAL' } }),
    db.item.findMany({
      where: { quantity: { gt: 0 } },
      select: { id: true, name: true, sku: true, quantity: true, location: true },
      orderBy: { name: 'asc' }
    }),
    db.asset.findMany({
      where: { status: 'TERSEDIA' },
      select: { id: true, name: true, assetCode: true, condition: true, location: { select: { name: true } } },
      orderBy: { name: 'asc' }
    })
  ]);

  return {
    requisitions,
    pendingCount,
    availableItems,
    availableAssets,
    userRole: locals.user.role,
    currentUser: locals.user,
    filters: { status, type, search },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
