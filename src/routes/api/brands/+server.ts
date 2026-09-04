import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' }
  });
  return new Response(JSON.stringify(brands), { status: 200 });
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, description } = await request.json();
    if (!name) {
      return new Response(JSON.stringify({ error: 'Nama merek wajib diisi' }), { status: 400 });
    }
    const brand = await prisma.brand.create({
      data: { name, description }
    });
    return new Response(JSON.stringify(brand), { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return new Response(JSON.stringify({ error: 'Nama merek sudah digunakan' }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
  }
};