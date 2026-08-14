import { prisma } from '$lib/server/db';

export const load = async () => {
  const items = await prisma.item.findMany({
    orderBy: { name: 'asc' },
    include: {
      category: true
    }
  });

  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      item: true
    }
  });

  return {
    items,
    transactions
  };
};