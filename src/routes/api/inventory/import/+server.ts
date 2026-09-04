import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { logAction } from '$lib/server/logger';
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
				const name = row.Name || row.name || row.NAMA || row.Nama || row['Nama Barang'] || row['nama_barang'];
				const rawPrice = row.Price ?? row.price ?? row.Harga ?? row.harga ?? row.HARGA ?? row['Harga Barang'] ?? 0;
				const price = Number(rawPrice);

				if (!name) {
					errors.push(`Baris ke-${successCount + errors.length + 2}: Nama barang wajib diisi.`);
					continue;
				}

				const sku = row.SKU || row.sku || row.Sku || row.Kode || row.kode || null;
				const quantity = Number(row.Quantity ?? row.quantity ?? row.Jumlah ?? row.jumlah ?? row.Stok ?? row.stok ?? 0);
				const minStock = Number(row.MinStock ?? row.minStock ?? row['Min Stock'] ?? row.min_stock ?? 5);
				const location = row.Location || row.location || row.Lokasi || row.lokasi || null;
				const description = row.Description || row.description || row.Keterangan || row.keterangan || null;

				await prisma.item.create({
					data: {
						name: String(name).trim(),
						sku: sku ? String(sku).trim() : null,
						location: location ? String(location).trim() : null,
						price: isNaN(price) ? 0 : price,
						quantity: isNaN(quantity) ? 0 : quantity,
						minStock: isNaN(minStock) ? 5 : minStock,
						description: description ? String(description).trim() : null,
						userId: locals.user.userId
					}
				});
				successCount++;
			} catch (e: any) {
				const itemName = row.Name || row.name || 'Item';
				errors.push(`Gagal memproses '${itemName}': ${e.message}`);
			}
		}

		if (successCount > 0) {
			await logAction(locals.user.userId, 'IMPORT_EXCEL', `Import ${successCount} data barang via Excel`);
		}

		return new Response(JSON.stringify({ 
			message: `Berhasil mengimport ${successCount} barang.`,
			errors: errors.length > 0 ? errors : null
		}), { status: 200 });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: 'Gagal memproses file import' }), { status: 500 });
	}
};
