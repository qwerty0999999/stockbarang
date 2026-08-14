import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('token', { path: '/' });
	return new Response(JSON.stringify({ message: 'Logout berhasil' }), { status: 200 });
};
