import type { PageServerLoad } from './$types';
import { prisma as db } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, '/login');

  const page = Number(url.searchParams.get('page')) || 1;
  const limit = 15;
  const skip = (page - 1) * limit;
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { opnameCode: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [opnames, total, locations, categories] = await Promise.all([
    db.stockOpname.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        auditor: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } },
        location: true,
        category: true,
        _count: { select: { items: true } }
      }
    }),
    db.stockOpname.count({ where }),
    db.location.findMany({ orderBy: { name: 'asc' } }),
    db.category.findMany({ orderBy: { name: 'asc' } })
  ]);

  return {
    opnames,
    locations,
    categories,
    filters: { status, search },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
