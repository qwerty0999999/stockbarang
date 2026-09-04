import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	return {
		user: {
			id: locals.user.userId,
			username: locals.user.username,
			role: locals.user.role
		}
	};
};
