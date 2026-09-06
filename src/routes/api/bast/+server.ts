import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, url }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const search = url.searchParams.get('search');
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { documentNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { firstPartyName: { contains: search, mode: 'insensitive' } },
      { secondPartyName: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [documents, total] = await Promise.all([
    db.handoverDocument.findMany({
      where,
      orderBy: { handoverDate: 'desc' },
      skip,
      take: limit,
      include: {
        loan: {
          include: {
            borrower: true,
            asset: true,
            item: true
          }
        }
      }
    }),
    db.handoverDocument.count({ where })
  ]);

  return json({
    documents,
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
      title,
      loanId,
      firstPartyName,
      firstPartyRole,
      firstPartySignature,
      secondPartyName,
      secondPartyRole,
      secondPartySignature,
      notes,
      handoverDate
    } = data;

    if (!title || !firstPartyName || !secondPartyName) {
      return json({ error: 'Judul, nama pihak pertama, dan nama pihak kedua wajib diisi' }, { status: 400 });
    }

    const docCount = await db.handoverDocument.count();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const year = new Date().getFullYear();
    const documentNumber = `BAST/${year}/${month}/${String(docCount + 1).padStart(4, '0')}`;

    const doc = await db.handoverDocument.create({
      data: {
        documentNumber,
        title,
        loanId: loanId ? parseInt(loanId) : null,
        handoverDate: handoverDate ? new Date(handoverDate) : new Date(),
        firstPartyName,
        firstPartyRole: firstPartyRole || 'Pengelola Inventaris & Aset',
        firstPartySignature: firstPartySignature || null,
        secondPartyName,
        secondPartyRole: secondPartyRole || 'Penerima Barang / Pemohon',
        secondPartySignature: secondPartySignature || null,
        notes: notes || null
      },
      include: {
        loan: {
          include: {
            borrower: true,
            asset: true,
            item: true
          }
        }
      }
    });

    await logAction(
      currentUserId,
      'CREATE_BAST',
      `Menerbitkan Berita Acara Serah Terima ${documentNumber}: ${title} (${firstPartyName} -> ${secondPartyName})`
    );

    return json(doc, { status: 201 });
  } catch (err: any) {
    return json({ error: err.message || 'Gagal membuat dokumen BAST' }, { status: 500 });
  }
}
