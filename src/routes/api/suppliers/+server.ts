import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const suppliers = await db.supplier.findMany({
    orderBy: { name: 'asc' }
  });
  return json({ suppliers });
}

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();
  
  if (!data.name) {
    return json({ error: 'Nama supplier harus diisi' }, { status: 400 });
  }

  try {
    const existing = await db.supplier.findUnique({ where: { name: data.name } });
    if (existing) {
      return json({ error: 'Nama supplier sudah digunakan' }, { status: 400 });
    }

    const supplier = await db.supplier.create({
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
