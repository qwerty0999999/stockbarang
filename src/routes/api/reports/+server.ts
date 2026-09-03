import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
  const type = url.searchParams.get('type') || 'overview';
  const format = url.searchParams.get('format') || 'json';
  
  if (type === 'overview') {
    const totalItems = await prisma.item.count();
    const lowStockItems = await prisma.item.count({
      where: { quantity: { lte: prisma.item.fields.minStock } }
    });
    const totalValue = await prisma.item.aggregate({
      _sum: { price: true }
    });
    
    const transactionsLast30Days = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'asc' },
      include: { item: true }
    });

    const dailyStats = transactionsLast30Days.reduce((acc: any, t) => {
      const date = new Date(t.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, masuk: 0, keluar: 0 };
      }
      if (t.type === 'MASUK') acc[date].masuk += t.quantity;
      else if (t.type === 'KELUAR') acc[date].keluar += t.quantity;
      return acc;
    }, {});

    const data = {
      totalItems,
      lowStockItems,
      totalValue: totalValue._sum.price || 0,
      dailyStats: Object.values(dailyStats)
    };
    if (format === 'csv') {
      let csv = 'Date,Masuk,Keluar\n';
      data.dailyStats.forEach((d: any) => {
        csv += `${d.date},${d.masuk},${d.keluar}\n`;
      });
      return new Response(csv, { 
        status: 200,
        headers: { 'Content-Type': 'text/csv' }
      });
    }
    return new Response(JSON.stringify(data), { status: 200 });
  }

  if (type === 'category') {
    const categories = await prisma.category.findMany({
      include: {
        items: {
          select: { quantity: true, price: true }
        }
      }
    });

    const categoryStats = categories.map(c => ({
      name: c.name,
      itemCount: c.items.length,
      totalQuantity: c.items.reduce((sum, i) => sum + i.quantity, 0),
      totalValue: c.items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
    }));

    if (format === 'csv') {
      let csv = 'Category,ItemCount,TotalQuantity,TotalValue\n';
      categoryStats.forEach((c: any) => {
        csv += `${c.name},${c.itemCount},${c.totalQuantity},${c.totalValue}\n`;
      });
      return new Response(csv, { 
        status: 200,
        headers: { 'Content-Type': 'text/csv' }
      });
    }
    return new Response(JSON.stringify(categoryStats), { status: 200 });
  }

  if (type === 'transactions') {
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');
    const txType = url.searchParams.get('txType');

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (txType && txType !== 'Semua') {
      where.type = txType;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { item: true, supplier: true }
    });

    if (format === 'csv') {
      let csv = 'Date,Item,Type,Quantity,Reference,Supplier\n';
      transactions.forEach((t: any) => {
        csv += `${new Date(t.createdAt).toISOString().split('T')[0]},${t.item?.name || ''},${t.type},${t.quantity},${t.reference || ''},${t.supplier?.name || ''}\n`;
      });
      return new Response(csv, { 
        status: 200,
        headers: { 'Content-Type': 'text/csv' }
      });
    }
    return new Response(JSON.stringify(transactions), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Invalid report type' }), { status: 400 });
};