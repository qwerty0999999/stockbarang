import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}
	const transactions = await prisma.transaction.findMany({
		include: { item: true },
		orderBy: { createdAt: 'desc' }
	});
	return new Response(JSON.stringify(transactions), { status: 200 });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
		}

		const { itemId, type, quantity, reference, notes, supplierId } = await request.json();
		
		if (!itemId || !type || !quantity) {
			return new Response(JSON.stringify({ error: 'Data tidak lengkap' }), { status: 400 });
		}

		const qty = Number(quantity);

		const result = await prisma.$transaction(async (tx) => {
			const newTx = await tx.transaction.create({
				data: {
					itemId,
					type,
					quantity: qty,
					reference: reference || null,
					notes: notes || null,
					userId: locals.user!.userId,
					supplierId: supplierId ? Number(supplierId) : null
				}
			});

			if (type === 'MASUK') {
				await tx.item.update({
					where: { id: itemId },
					data: { quantity: { increment: qty } }
				});
			} else if (type === 'KELUAR') {
				const current = await tx.item.findUnique({ where: { id: itemId } });
				if (!current || current.quantity < qty) {
					throw new Error('Stok tidak mencukupi untuk transaksi keluar.');
				}
				await tx.item.update({
					where: { id: itemId },
					data: { quantity: { decrement: qty } }
				});
			} else if (type === 'ADJUSTMENT') {
				await tx.item.update({
					where: { id: itemId },
					data: { quantity: qty }
				});
			}

			return newTx;
		});

		return new Response(JSON.stringify(result), { status: 201 });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
