import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { sendWhatsAppAlert } from '$lib/server/whatsapp';
import { sendEmail } from '$lib/server/email';

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

		// Cek stok minimal setelah transaksi
		const updatedItem = await prisma.item.findUnique({
			where: { id: itemId },
			include: { category: true }
		});
		if (updatedItem && updatedItem.quantity < updatedItem.minStock) {
			const adminPhone = process.env.WHATSAPP_ADMIN_PHONE;
			const adminEmail = process.env.SMTP_ADMIN_EMAIL;
			const subject = `⚠️ Stok Menipis: ${updatedItem.name}`;
			const html = `<p>Barang: <strong>${updatedItem.name}</strong></p>
				<p>SKU: ${updatedItem.sku || '-'}</p>
				<p>Stok saat ini: ${updatedItem.quantity}</p>
				<p>Stok minimal: ${updatedItem.minStock}</p>
				<p>Kategori: ${updatedItem.category?.name || '-'}</p>
				<p>Segera lakukan restock.</p>`;
			if (adminPhone) {
				const message = `⚠️ *Stok Menipis!*\n\nBarang: ${updatedItem.name}\nSKU: ${updatedItem.sku || '-'}\nStok saat ini: ${updatedItem.quantity}\nStok minimal: ${updatedItem.minStock}\nKategori: ${updatedItem.category?.name || '-'}\n\nSegera lakukan restock.`;
				await sendWhatsAppAlert(adminPhone, message);
			}
			if (adminEmail) {
				await sendEmail(adminEmail, subject, html);
			}
		}

		return new Response(JSON.stringify(result), { status: 201 });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
