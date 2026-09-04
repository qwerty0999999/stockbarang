import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  const data = await request.json();
  if (!data.name) {
    return json({ error: 'Nama supplier harus diisi' }, { status: 400 });
  }
  try {
    const existing = await db.supplier.findFirst({
      where: { name: data.name, id: { not: id } }
    });
    if (existing) {
      return json({ error: 'Nama supplier sudah digunakan' }, { status: 400 });
    }
    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || ''
      }
    });
    return json(supplier);
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  try {
    const [transactions, items, assets] = await Promise.all([
      db.transaction.count({ where: { supplierId: id } }),
      db.item.count({ where: { supplierId: id } }),
      db.asset.count({ where: { supplierId: id } })
    ]);
    if (transactions > 0 || items > 0 || assets > 0) {
      const reasons = [
        transactions > 0 ? `${transactions} riwayat transaksi` : null,
        items > 0 ? `${items} barang konsumsi` : null,
        assets > 0 ? `${assets} aset tetap` : null
      ].filter(Boolean).join(', ');
      return json({ error: `Supplier tidak bisa dihapus karena masih terkait dengan ${reasons}` }, { status: 400 });
    }
    await db.supplier.delete({ where: { id } });
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}