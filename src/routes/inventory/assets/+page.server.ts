import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(303, '/login');

	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 20;
	const search = url.searchParams.get('search') || '';
	const categoryId = url.searchParams.get('categoryId');
	const locationId = url.searchParams.get('locationId');
	const condition = url.searchParams.get('condition');
	const status = url.searchParams.get('status');

	const skip = (page - 1) * limit;

	const where: any = {};
	if (search) {
		where.OR = [
			{ name: { contains: search, mode: 'insensitive' } },
			{ assetCode: { contains: search, mode: 'insensitive' } },
			{ serialNumber: { contains: search, mode: 'insensitive' } },
			{ pic: { contains: search, mode: 'insensitive' } }
		];
	}
	if (categoryId) where.categoryId = parseInt(categoryId);
	if (locationId) where.locationId = parseInt(locationId);
	if (condition) where.condition = condition;
	if (status) where.status = status;

	const [
		assets,
		total,
		categories,
		brands,
		locations,
		suppliers,
		countAvailable,
		countLoaned,
		countDamaged,
		totalAssetValue,
		countMaintenance
	] = await Promise.all([
		prisma.asset.findMany({
			where,
			include: {
				category: true,
				brand: true,
				location: true,
				supplier: true
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit
		}),
		prisma.asset.count({ where }),
		prisma.category.findMany({ orderBy: { name: 'asc' } }),
		prisma.brand.findMany({ orderBy: { name: 'asc' } }),
		prisma.location.findMany({ orderBy: { name: 'asc' } }),
		prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
		prisma.asset.count({ where: { status: 'TERSEDIA' } }),
		prisma.asset.count({ where: { status: 'DIPINJAM' } }),
		prisma.asset.count({ where: { condition: { in: ['RUSAK_RINGAN', 'RUSAK_BERAT', 'HILANG'] } } }),
		prisma.asset.aggregate({ _sum: { price: true } }),
		prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } })
	]);

	return {
		assets,
		categories,
		brands,
		locations,
		suppliers,
		stats: {
			total,
			countAvailable,
			countLoaned,
			countDamaged,
			countMaintenance,
			totalAssetValue: totalAssetValue._sum.price ?? 0
		},
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit)
		},
		filters: {
			search,
			categoryId,
			locationId,
			condition,
			status
		},
		user: locals.user
	};
};
