import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  const data = await request.json();
  if (!data.name) {
    return json({ error: 'Nama kategori harus diisi' }, { status: 400 });
  }
  try {
    const existing = await db.category.findFirst({
      where: { name: data.name, id: { not: id } }
    });
    if (existing) {
      return json({ error: 'Nama kategori sudah digunakan' }, { status: 400 });
    }
    const category = await db.category.update({
      where: { id },
      data: { name: data.name, description: data.description || '' }
    });
    return json(category);
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });
  try {
    const [itemCount, assetCount] = await Promise.all([
      db.item.count({ where: { categoryId: id } }),
      db.asset.count({ where: { categoryId: id } })
    ]);
    if (itemCount > 0 || assetCount > 0) {
      const details = [
        itemCount > 0 ? `${itemCount} barang konsumsi` : null,
        assetCount > 0 ? `${assetCount} aset tetap` : null
      ].filter(Boolean).join(' dan ');
      return json({ error: `Kategori tidak bisa dihapus karena masih digunakan oleh ${details}` }, { status: 400 });
    }
    await db.category.delete({ where: { id } });
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}