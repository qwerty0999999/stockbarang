import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

const VALID_ROLES = ['admin', 'manajemen', 'staff', 'dev'] as const;
type Role = (typeof VALID_ROLES)[number];

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  // Cek autentikasi & otorisasi
  if (!locals.user || !['admin', 'dev'].includes(locals.user.role)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validasi ID
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: 'ID tidak valid' }, { status: 400 });
  }

  try {
    // Cek apakah user target adalah dev (hanya dev lain/pengembang yang bisa ubah)
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (targetUser?.role === 'dev' && locals.user.role !== 'dev') {
      return json({ error: 'Hanya role DEV yang dapat mengedit user DEV' }, { status: 403 });
    }

    const body = await request.json();
    const role = body?.role as string;

    // Validasi role
    if (!VALID_ROLES.includes(role as Role)) {
      return json({ error: 'Role tidak valid' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, username: true, role: true }
    });

    return json(user, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return json({ error: message }, { status: 500 });
  }
};