import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' }
  });
  return json({ categories });
}

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();
  if (!data.name) {
    return json({ error: 'Nama kategori harus diisi' }, { status: 400 });
  }
  try {
    const existing = await db.category.findUnique({ where: { name: data.name } });
    if (existing) {
      return json({ error: 'Nama kategori sudah digunakan' }, { status: 400 });
    }
    const category = await db.category.create({
      data: { name: data.name, description: data.description || '' }
    });
    return json(category);
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}