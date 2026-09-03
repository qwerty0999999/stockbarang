import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import * as xlsx from 'xlsx';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		if (!file) {
			return new Response(JSON.stringify({ error: 'File tidak ditemukan' }), { status: 400 });
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const workbook = xlsx.read(buffer, { type: 'buffer' });
		
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const data = xlsx.utils.sheet_to_json(sheet);

		let successCount = 0;
		let errors = [];

		for (const row of data as any[]) {
			try {
				if (!row.Name || !row.Price) {
					errors.push(`Baris ke-${successCount + errors.length + 2}: Nama dan Harga wajib diisi.`);
					continue;
				}

				await prisma.item.create({
					data: {
						name: String(row.Name),
						sku: row.SKU ? String(row.SKU) : null,
						price: Number(row.Price),
						quantity: Number(row.Quantity) || 0,
						minStock: Number(row.MinStock) || 5,
						description: row.Description ? String(row.Description) : null,
						userId: locals.user.userId
					}
				});
				successCount++;
			} catch (e: any) {
				errors.push(`Gagal memproses '${row.Name || 'Item'}': ${e.message}`);
			}
		}

		return new Response(JSON.stringify({ 
			message: `Berhasil mengimport ${successCount} barang.`,
			errors: errors.length > 0 ? errors : null
		}), { status: 200 });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: 'Gagal memproses file import' }), { status: 500 });
	}
};
