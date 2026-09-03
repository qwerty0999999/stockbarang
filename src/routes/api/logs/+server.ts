import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  // Hanya admin/dev yang bisa melihat log
  if (locals.user.role !== 'admin' && locals.user.role !== 'dev') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const limit = parseInt(url.searchParams.get('limit') || '100');
  const logs = await prisma.log.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true } } }
  });

  return new Response(JSON.stringify(logs), { status: 200 });
};