import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
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