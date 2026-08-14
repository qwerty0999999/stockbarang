import { prisma } from '$lib/server/db';

export const load = async () => {
  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
    },
    orderBy: {
      name: 'asc'
    }
  });

  return {
    items
  };
};