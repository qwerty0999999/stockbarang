import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const type = url.searchParams.get('type') || 'items';

	if (type === 'items') {
		const items = await prisma.item.findMany({
			include: { category: true, supplier: true }
		});
		const data = items.map(item => ({
			Name: item.name,
			SKU: item.sku || '',
			Quantity: item.quantity,
			MinStock: item.minStock,
			Price: item.price,
			Location: item.location || '',
			Category: item.category?.name || '',
			Supplier: item.supplier?.name || '',
			Description: item.description || ''
		}));

		const csv = stringify(data, { header: true });
		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': 'attachment; filename="items.csv"'
			}
		});
	}

	if (type === 'suppliers') {
		const suppliers = await prisma.supplier.findMany();
		const data = suppliers.map(s => ({
			Name: s.name,
			Address: s.address || '',
			Phone: s.phone || '',
			Email: s.email || ''
		}));

		const csv = stringify(data, { header: true });
		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': 'attachment; filename="suppliers.csv"'
			}
		});
	}

	return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const type = formData.get('type') as string || 'items';

		if (!file) {
			return new Response(JSON.stringify({ error: 'File tidak ditemukan' }), { status: 400 });
		}

		const text = await file.text();
		const records = parse(text, { columns: true, skip_empty_lines: true });

		let count = 0;

		if (type === 'items') {
			for (const row of records) {
				if (!row.Name || !row.Price) continue;
				await prisma.item.create({
					data: {
						name: row.Name,
						sku: row.SKU || null,
						quantity: Number(row.Quantity) || 0,
						minStock: Number(row.MinStock) || 5,
						price: Number(row.Price) || 0,
						location: row.Location || null,
						description: row.Description || null,
						userId: locals.user.userId
					}
				});
				count++;
			}
		} else if (type === 'suppliers') {
			for (const row of records) {
				if (!row.Name) continue;
				await prisma.supplier.create({
					data: {
						name: row.Name,
						address: row.Address || null,
						phone: row.Phone || null,
						email: row.Email || null
					}
				});
				count++;
			}
		}

		return new Response(JSON.stringify({ message: 'Success', count }), { status: 200 });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
