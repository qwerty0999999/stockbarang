import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 20;
	const search = url.searchParams.get('search') || '';
	
	const skip = (page - 1) * limit;

	const whereClause = search ? {
		OR: [
			{ name: { contains: search, mode: 'insensitive' as const } },
			{ sku: { contains: search, mode: 'insensitive' as const } },
			{ location: { contains: search, mode: 'insensitive' as const } },
			{ category: { name: { contains: search, mode: 'insensitive' as const } } }
		]
	} : {};

	const [items, total] = await Promise.all([
		prisma.item.findMany({
			where: whereClause,
			include: { category: true },
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit
		}),
		prisma.item.count({ where: whereClause })
	]);

	return { 
		items,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit)
		},
		searchQuery: search
	};
};
