import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ request, locals, url }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const type = url.searchParams.get('type');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  try {
    if (type === 'inventory') {
      // Inventory report
      const items = await db.item.findMany({
        include: { category: true, supplier: true }
      });
      const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return json({
        reportType: 'inventory',
        items,
        totalItems: items.length,
        totalValue
      });
    } else if (type === 'transactions') {
      // Transaction history report
      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }
      
      const transactions = await db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          item: true,
          user: { select: { username: true } },
          supplier: true
        }
      });
      
      return json({
        reportType: 'transactions',
        transactions,
        totalTransactions: transactions.length
      });
    } else if (type === 'summary') {
      // Summary report
      const [totalItems, totalCategories, totalSuppliers, totalTransactions] = await Promise.all([
        db.item.count(),
        db.category.count(),
        db.supplier.count(),
        db.transaction.count()
      ]);
      
      const lowStockItems = await db.item.findMany({
        where: { quantity: { lte: db.item.fields.minStock } }
      });
      
      return json({
        reportType: 'summary',
        totalItems,
        totalCategories,
        totalSuppliers,
        totalTransactions,
        lowStockItems,
        lowStockCount: lowStockItems.length
      });
    } else {
      return json({ error: 'Tipe laporan tidak valid' }, { status: 400 });
    }
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}