import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function PUT({ request, locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  const data = await request.json();
  if (!data.name) return json({ error: 'Nama peminjam harus diisi' }, { status: 400 });

  try {
    const borrower = await db.borrower.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type || 'internal',
        department: data.department || null,
        phone: data.phone || null,
        email: data.email || null
      }
    });
    return json(borrower);
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE({ locals, params }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseInt(params.id || '');
  if (isNaN(id)) return json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const activeLoans = await db.loan.count({
      where: { borrowerId: id, status: 'DIPINJAM' }
    });
    if (activeLoans > 0) {
      return json({ error: 'Data peminjam tidak bisa dihapus karena masih memiliki peminjaman aktif' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      // Unlink past returned loans to preserve loan history and prevent FK constraint crash
      await tx.loan.updateMany({
        where: { borrowerId: id },
        data: { borrowerId: null }
      });
      await tx.borrower.delete({ where: { id } });
    });

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}
