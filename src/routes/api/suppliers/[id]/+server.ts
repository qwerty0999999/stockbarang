import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function PUT({ params, request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();

  try {
    if (data.name) {
      const existing = await db.supplier.findFirst({
        where: { name: data.name, id: { not: parseInt(params.id as string) } }
      });
      if (existing) return json({ error: 'Nama supplier sudah digunakan' }, { status: 400 });
    }

    const supplier = await db.supplier.update({
      where: { id: parseInt(params.id as string) },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email
      }
    });
    return json(supplier);
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE({ params, request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await db.supplier.delete({ where: { id: parseInt(params.id as string) } });
    return json({ success: true });
  } catch (err: any) {
    return json({ error: 'Gagal menghapus supplier, pastikan tidak ada data yang terhubung' }, { status: 400 });
  }
}
