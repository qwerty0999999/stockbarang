import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	const categoryId = url.searchParams.get('category');
	
	const whereClause = categoryId ? { categoryId: Number(categoryId) } : {};

	const items = await prisma.item.findMany({
		where: whereClause,
		include: { category: true },
		orderBy: { createdAt: 'desc' }
	});
	
	return { items };
};
