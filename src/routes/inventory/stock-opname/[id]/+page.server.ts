import type { PageServerLoad } from './$types';
import { prisma as db } from '$lib/server/db';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) throw redirect(303, '/login');
  const id = parseInt(params.id);
  if (isNaN(id)) throw error(404, 'Sesi tidak valid');

  const opname = await db.stockOpname.findUnique({
    where: { id },
    include: {
      auditor: { select: { id: true, username: true } },
      approvedBy: { select: { id: true, username: true } },
      location: true,
      category: true,
      items: {
        include: {
          item: {
            include: {
              category: true
            }
          }
        },
        orderBy: { item: { name: 'asc' } }
      }
    }
  });

  if (!opname) throw error(404, 'Sesi Stock Opname tidak ditemukan');

  return {
    opname,
    userRole: locals.user.role
  };
};
