import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const loans = await db.loan.findMany({
    include: {
      item: true,
      user: { select: { username: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return json({ loans });
}

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();

  if (!data.itemId || !data.quantity || !data.borrowerName) {
    return json({ error: 'Data tidak lengkap' }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx: any) => {
      // Cek stok
      const item = await tx.item.findUnique({ where: { id: parseInt(data.itemId) } });
      if (!item) throw new Error('Barang tidak ditemukan');
      if (item.quantity < parseInt(data.quantity)) throw new Error(`Stok tidak mencukupi. Tersisa ${item.quantity}`);

      // Kurangi stok barang
      await tx.item.update({
        where: { id: parseInt(data.itemId) },
        data: { quantity: { decrement: parseInt(data.quantity) } }
      });

      // Generate Loan Code unik menggunakan timestamp + random
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `PJM-${year}${month}-${random}`;

      // Buat peminjaman
      return await tx.loan.create({
        data: {
          loanCode: code,
          borrowerName: data.borrowerName,
          quantity: parseInt(data.quantity),
          status: 'DIPINJAM',
          itemId: parseInt(data.itemId),
          userId: locals.user!.userId,
          expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
          notes: data.notes
        },
        include: { item: true, user: { select: { username: true } } }
      });
    });

    return json(result);
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 });
  }
}
