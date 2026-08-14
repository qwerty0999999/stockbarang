import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import XLSX from 'xlsx';

export async function POST({ request, locals }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (!rows || rows.length === 0) {
      return json({ error: 'File kosong atau format tidak valid' }, { status: 400 });
    }

    const createdItems = [];
    const errors = [];
    
    for (const row of rows) {
      const name = String(row['Nama'] || row['name'] || '').trim();
      const price = parseFloat(String(row['Harga'] ?? row['price'] ?? 0));
      const quantity = parseInt(String(row['Stok'] ?? row['quantity'] ?? 0));
      const sku = String(row['SKU'] || row['sku'] || '').trim() || undefined;
      const minStock = parseInt(String(row['Min Stok'] ?? row['minStock'] ?? 5));
      const location = String(row['Lokasi'] || row['location'] || '').trim() || null;
      const categoryName = String(row['Kategori'] || row['category'] || '').trim() || null;

      if (!name || price <= 0) {
        errors.push(`Baris ${rows.indexOf(row) + 2}: Nama dan Harga wajib diisi`);
        continue;
      }

      let categoryId = undefined;
      if (categoryName) {
        const category = await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName }
        });
        categoryId = category.id;
      }

      const data = {
        name,
        sku,
        price,
        quantity,
        minStock,
        location,
        categoryId,
      };

      try {
        const created = await prisma.item.create({ data });
        createdItems.push(created);

        if (quantity > 0) {
          await prisma.transaction.create({
            data: {
              itemId: created.id,
              type: 'MASUK',
              quantity,
              reference: 'Import Excel',
              notes: `Imported ${rows.length} items`,
              userId: locals.user?.userId ?? 1
            }
          });
        }
      } catch (e: any) {
        if (e.code === 'P2002') {
          errors.push(`SKU "${sku}" sudah digunakan`);
        } else {
          errors.push(`Gagal import "${name}": ${e.message}`);
        }
      }
    }

    return json({
      success: true,
      count: createdItems.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return json({
      error: error.message || 'Terjadi kesalahan saat import data'
    }, { status: 500 });
  }
}