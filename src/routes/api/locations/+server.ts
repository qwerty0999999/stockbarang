import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
  const locations = await prisma.location.findMany({
    orderBy: { name: 'asc' }
  });
  return new Response(JSON.stringify(locations), { status: 200 });
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, description } = await request.json();
    if (!name) {
      return new Response(JSON.stringify({ error: 'Nama lokasi wajib diisi' }), { status: 400 });
    }
    const location = await prisma.location.create({
      data: { name, description }
    });
    return new Response(JSON.stringify(location), { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return new Response(JSON.stringify({ error: 'Nama lokasi sudah digunakan' }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
  }
};