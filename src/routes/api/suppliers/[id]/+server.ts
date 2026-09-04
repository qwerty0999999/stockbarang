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
    // Check if supplier has transactions or items
    const transactions = await db.transaction.count({ where: { supplierId: id } });
    if (transactions > 0) {
      return json({ error: 'Supplier tidak bisa dihapus karena memiliki transaksi' }, { status: 400 });
    }
    const items = await db.item.count({ where: { supplierId: id } });
    if (items > 0) {
      return json({ error: 'Supplier tidak bisa dihapus karena memiliki barang' }, { status: 400 });
    }
    await db.supplier.delete({ where: { id } });
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}