import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const data = await request.json();
  if (!data.name) return json({ error: 'Nama lokasi harus diisi' }, { status: 400 });

  try {
    const existing = await db.location.findFirst({
      where: { name: data.name, id: { not: id } }
    });
    if (existing) return json({ error: 'Nama lokasi sudah digunakan' }, { status: 400 });

    const location = await db.location.update({
      where: { id },
      data: { name: data.name, description: data.description || null }
    });
    return json(location);
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const assetCount = await db.asset.count({ where: { locationId: id } });
    if (assetCount > 0) {
      return json({ error: 'Lokasi tidak bisa dihapus karena masih digunakan pada aset' }, { status: 400 });
    }
    await db.location.delete({ where: { id } });
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}
