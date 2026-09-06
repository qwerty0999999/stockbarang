import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, url }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { opnameCode: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [opnames, total] = await Promise.all([
    db.stockOpname.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        auditor: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } },
        location: true,
        category: true,
        _count: { select: { items: true } }
      }
    }),
    db.stockOpname.count({ where })
  ]);

  return json({
    opnames,
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
    const { title, locationId, categoryId, notes } = data;

    if (!title) {
      return json({ error: 'Judul sesi stock opname wajib diisi' }, { status: 400 });
    }

    const opnameCode = `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    // Build filter for items to audit
    const itemWhere: any = {};
    if (categoryId) {
      itemWhere.categoryId = parseInt(categoryId);
    }

    // Ambil item yang akan diaudit
    let items = await db.item.findMany({
      where: itemWhere,
      include: { category: true }
    });

    // Jika filter locationId dipilih, filter berdasarkan nama lokasi
    if (locationId) {
      const loc = await db.location.findUnique({ where: { id: parseInt(locationId) } });
      if (loc) {
        items = items.filter(i => i.location?.toLowerCase() === loc.name.toLowerCase());
      }
    }

    if (items.length === 0) {
      return json({ error: 'Tidak ditemukan barang pada kriteria lokasi/kategori ini' }, { status: 400 });
    }

    const opname = await db.$transaction(async (tx) => {
      const created = await tx.stockOpname.create({
        data: {
          opnameCode,
          title,
          status: 'IN_PROGRESS',
          locationId: locationId ? parseInt(locationId) : null,
          categoryId: categoryId ? parseInt(categoryId) : null,
          notes: notes || null,
          totalItems: items.length,
          totalVariance: 0,
          auditorId: currentUserId,
          items: {
            create: items.map(item => ({
              itemId: item.id,
              systemQty: item.quantity,
              physicalQty: item.quantity, // Default awal disamakan dengan sistem
              variance: 0,
              reason: null,
              notes: null
            }))
          }
        },
        include: {
          items: { include: { item: true } },
          auditor: { select: { id: true, username: true } },
          location: true,
          category: true
        }
      });

      return created;
    });

    await logAction(currentUserId, 'STOCK_OPNAME_START', `Membuka sesi Stock Opname ${opnameCode}: "${title}" (${items.length} item)`);

    return json(opname, { status: 201 });
  } catch (err: any) {
    return json({ error: err.message || 'Gagal membuat sesi stock opname' }, { status: 500 });
  }
}
