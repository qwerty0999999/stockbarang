import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const suppliers = await prisma.supplier.findMany({
		orderBy: { createdAt: 'desc' }
	});

	return {
		suppliers,
		user: locals.user
	};
};