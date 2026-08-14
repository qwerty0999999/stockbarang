import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const items = await prisma.item.findMany({
		include: { category: true },
		orderBy: { createdAt: 'desc' }
	});
	return { items };
};
