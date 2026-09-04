import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
  const borrowers = await prisma.borrower.findMany({
    orderBy: { name: 'asc' }
  });
  return new Response(JSON.stringify(borrowers), { status: 200 });
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, type, department, phone, email } = await request.json();
    if (!name) {
      return new Response(JSON.stringify({ error: 'Nama peminjam wajib diisi' }), { status: 400 });
    }
    const borrower = await prisma.borrower.create({
      data: { name, type: type || 'internal', department, phone, email }
    });
    return new Response(JSON.stringify(borrower), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal' }), { status: 500 });
  }
};