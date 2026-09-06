import type { PageServerLoad } from './$types';
import { prisma as db } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, '/login');

  const page = Number(url.searchParams.get('page')) || 1;
  const limit = 15;
  const skip = (page - 1) * limit;
  const search = url.searchParams.get('search') || '';

  const where: any = {};
  if (search) {
    where.OR = [
      { documentNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { firstPartyName: { contains: search, mode: 'insensitive' } },
      { secondPartyName: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [documents, total, activeLoans] = await Promise.all([
    db.handoverDocument.findMany({
      where,
      orderBy: { handoverDate: 'desc' },
      skip,
      take: limit,
      include: {
        loan: {
          include: {
            borrower: true,
            asset: true,
            item: true
          }
        }
      }
    }),
    db.handoverDocument.count({ where }),
    db.loan.findMany({
      where: { status: 'DIPINJAM' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        borrower: true,
        asset: true,
        item: true
      }
    })
  ]);

  return {
    documents,
    activeLoans,
    currentUser: locals.user,
    filters: { search },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
