import type { Handle } from '@sveltejs/kit';
import { verifyToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('token');
	
	if (token) {
		const payload = await verifyToken(token);
		if (payload) {
			event.locals.user = payload;
		}
	}

	// Protect /inventory UI routes
	if (event.url.pathname.startsWith('/inventory') && !event.locals.user) {
		return new Response('Redirect', { status: 303, headers: { Location: '/login' } });
	}

	// Protect all /api/* routes except /api/auth/*
	if (event.url.pathname.startsWith('/api/') && !event.url.pathname.startsWith('/api/auth/')) {
		if (!event.locals.user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
		}
	}

	// Admin-only: /api/admin routes
	if (event.url.pathname.startsWith('/api/admin') && !['admin', 'dev'].includes(event.locals.user?.role ?? '')) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
	}

	return resolve(event);
};
