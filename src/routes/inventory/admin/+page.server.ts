import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user || !['admin', 'dev'].includes(locals.user.role)) {
    throw redirect(303, '/inventory');
  }

  const [users, itemCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true
      }
    }),
    prisma.item.count()
  ]);

  return {
    users,
    itemCount
  };
};