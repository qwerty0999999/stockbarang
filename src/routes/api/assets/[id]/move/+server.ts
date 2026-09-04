import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const currentUserId = locals.user.userId;
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const { toLocationId, toLocationName, toPic, reason } = await request.json();

    const asset = await db.asset.findUnique({
      where: { id },
      include: { location: true }
    });

    if (!asset) return json({ error: 'Aset tidak ditemukan' }, { status: 404 });

    const fromLocation = asset.location?.name || null;
    const fromPic = asset.pic || null;

    let newLocationId = asset.locationId;
    let targetLocationName = fromLocation;

    if (toLocationId) {
      newLocationId = parseInt(toLocationId);
      const loc = await db.location.findUnique({ where: { id: newLocationId } });
      if (loc) targetLocationName = loc.name;
    } else if (toLocationName) {
      // Find or create location
      const loc = await db.location.upsert({
        where: { name: toLocationName },
        update: {},
        create: { name: toLocationName }
      });
      newLocationId = loc.id;
      targetLocationName = loc.name;
    }

    const nextPic = toPic !== undefined ? (toPic || null) : fromPic;

    const result = await db.$transaction(async (tx) => {
      const movement = await tx.assetMovement.create({
        data: {
          assetId: id,
          fromLocation,
          toLocation: targetLocationName,
          fromPic,
          toPic: nextPic,
          reason: reason || null,
          userId: currentUserId
        }
      });

      const updatedAsset = await tx.asset.update({
        where: { id },
        data: {
          locationId: newLocationId,
          pic: nextPic
        },
        include: { location: true, category: true, brand: true }
      });

      return { movement, asset: updatedAsset };
    });

    return json(result);
  } catch (err: any) {
    return json({ error: err.message || 'Gagal memproses mutasi aset' }, { status: 500 });
  }
}
