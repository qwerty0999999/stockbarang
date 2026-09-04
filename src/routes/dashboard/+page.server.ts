import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [totalItems, totalTransactions, lowStockItems, totalValue] = await Promise.all([
      db.item.count(),
      db.transaction.count(),
      db.item.findMany({
        where: { quantity: { lte: db.item.fields.minStock } }
      }), 
      db.item.aggregate({
        _sum: { price: true, quantity: true }
      })
    ]);

    const recentTransactions = await db.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { item: true, user: { select: { username: true } } }
    });

    const recentLoans = await db.loan.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { item: true, user: { select: { username: true } } }
    });

    return {
      totalItems,
      totalTransactions,
      lowStockItems,
      totalValue: ((totalValue._sum?.price ?? 0) * (totalValue._sum?.quantity ?? 0)) || 0,
      recentTransactions,
      recentLoans
    };
  } catch (err) {
    throw json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
};