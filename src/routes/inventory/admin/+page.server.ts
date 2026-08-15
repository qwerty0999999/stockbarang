import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user || !['admin', 'dev'].includes(locals.user.role)) {
    throw redirect(303, '/inventory');
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true
    }
  });

  const items = await prisma.item.findMany({
    select: { id: true }
  });

  return {
    users,
    items
  };
};