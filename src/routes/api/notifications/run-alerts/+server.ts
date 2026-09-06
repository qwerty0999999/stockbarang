import type { RequestHandler } from '@sveltejs/kit';
import { runScheduledAlertsCheck } from '$lib/server/notifications';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user || !['admin', 'dev', 'manajemen'].includes(locals.user.role)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  try {
    const result = await runScheduledAlertsCheck();
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Pemeriksaan notifikasi alert berhasil dijalankan',
      data: result 
    }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal menjalankan notifikasi alert' }), { status: 500 });
  }
};
