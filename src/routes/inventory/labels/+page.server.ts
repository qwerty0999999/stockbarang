import { prisma } from '$lib/server/db';

export const load = async () => {
  const [items, assets] = await Promise.all([
    prisma.item.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
      },
      orderBy: {
        name: 'asc'
      }
    }),
    prisma.asset.findMany({
      select: {
        id: true,
        name: true,
        assetCode: true,
        serialNumber: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  ]);

  return {
    items,
    assets
  };
};