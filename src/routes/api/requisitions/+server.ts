import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, url }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  // Jika role karyawan, hanya tampilkan permohonan miliknya sendiri
  if (locals.user.role === 'karyawan') {
    where.requesterId = locals.user.userId;
  }
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { requisitionCode: { contains: search, mode: 'insensitive' } },
      { reason: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
      { requester: { username: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [requisitions, total] = await Promise.all([
    db.requisition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        requester: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } },
        items: {
          include: {
            item: true,
            asset: true
          }
        }
      }
    }),
    db.requisition.count({ where })
  ]);

  return json({
    requisitions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const currentUserId = locals.user.userId;

  try {
    const data = await request.json();
    const {
      type = 'CONSUMABLE', // CONSUMABLE atau ASSET_LOAN
      reason,
      department,
      neededDate,
      items = []
    } = data;

    if (!reason || items.length === 0) {
      return json({ error: 'Keperluan/alasan dan daftar barang wajib diisi' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const count = await db.requisition.count();
    const requisitionCode = `REQ-${year}-${String(count + 1).padStart(5, '0')}`;

    const reqDoc = await db.$transaction(async (tx) => {
      const created = await tx.requisition.create({
        data: {
          requisitionCode,
          requesterId: currentUserId,
          type,
          reason,
          department: department || null,
          status: 'PENDING_APPROVAL',
          neededDate: neededDate ? new Date(neededDate) : null,
          items: {
            create: items.map((it: any) => ({
              itemId: it.itemId ? parseInt(it.itemId) : null,
              assetId: it.assetId ? parseInt(it.assetId) : null,
              quantity: it.quantity ? parseInt(it.quantity.toString()) : 1,
              notes: it.notes || null
            }))
          }
        },
        include: {
          requester: { select: { id: true, username: true } },
          items: { include: { item: true, asset: true } }
        }
      });

      return created;
    });

    await logAction(
      currentUserId,
      'CREATE_REQUISITION',
      `Mengajukan permohonan barang ${requisitionCode}: ${reason} (${items.length} item)`
    );

    return json(reqDoc, { status: 201 });
  } catch (err: any) {
    return json({ error: err.message || 'Gagal mengajukan permohonan barang' }, { status: 500 });
  }
}
