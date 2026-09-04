import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const [categories, brands, locations, borrowers] = await Promise.all([
		prisma.category.findMany({
			orderBy: { name: 'asc' },
			include: {
				_count: { select: { items: true, assets: true } }
			}
		}),
		prisma.brand.findMany({
			orderBy: { name: 'asc' },
			include: {
				_count: { select: { assets: true } }
			}
		}),
		prisma.location.findMany({
			orderBy: { name: 'asc' },
			include: {
				_count: { select: { assets: true } }
			}
		}),
		prisma.borrower.findMany({
			orderBy: { name: 'asc' },
			include: {
				_count: { select: { loans: true } },
				loans: {
					where: { status: 'DIPINJAM' },
					select: { id: true }
				}
			}
		})
	]);

	return {
		categories,
		brands,
		locations,
		borrowers,
		user: locals.user
	};
};
