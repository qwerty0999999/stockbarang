import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Helper function to parse CSV data
function parseCSV(csvData: string) {
  return parse(csvData, {
    columns: true,
    skip_empty_lines: true
  });
}

// Helper function to generate CSV data
function generateCSV(data: any[], columns: string[]) {
  return stringify(data, {
    header: true,
    columns
  });
}

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const formData = await request.formData();
  const type = formData.get('type');
  const model = formData.get('model');
  const file = formData.get('file') as File;

  if (!type || !model || !file) {
    return json({ error: 'Type, model, dan file wajib diisi' }, { status: 400 });
  }

  try {
    const fileContent = await file.text();

    if (type === 'import') {
      if (model === 'items') {
        const items = parseCSV(fileContent);
        const results = await db.$transaction(
          items.map((item: any) => {
            return db.item.create({
              data: {
                name: item.name,
                sku: item.sku || null,
                location: item.location || null,
                minStock: parseInt(item.minStock) || 5,
                quantity: parseInt(item.quantity) || 0,
                price: parseFloat(item.price) || 0,
                description: item.description || null,
                categoryId: item.categoryId ? parseInt(item.categoryId) : null,
                supplierId: item.supplierId ? parseInt(item.supplierId) : null
              }
            });
          })
        );
        return json({ success: true, imported: results.length });
      } else if (model === 'suppliers') {
        const suppliers = parseCSV(fileContent);
        const results = await db.$transaction(
          suppliers.map((supplier: any) => {
            return db.supplier.create({
              data: {
                name: supplier.name,
                address: supplier.address || null,
                phone: supplier.phone || null,
                email: supplier.email || null
              }
            });
          })
        );
        return json({ success: true, imported: results.length });
      } else {
        return json({ error: 'Model tidak valid' }, { status: 400 });
      }
    } else if (type === 'export') {
      if (model === 'items') {
        const items = await db.item.findMany({
          include: { category: true, supplier: true }
        });
        const csvData = generateCSV(
          items.map(item => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            location: item.location,
            minStock: item.minStock,
            quantity: item.quantity,
            price: item.price,
            description: item.description,
            category: item.category?.name,
            supplier: item.supplier?.name
          })),
          ['id', 'name', 'sku', 'location', 'minStock', 'quantity', 'price', 'description', 'category', 'supplier']
        );
        return new Response(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=items.csv'
          }
        });
      } else if (model === 'suppliers') {
        const suppliers = await db.supplier.findMany();
        const csvData = generateCSV(
          suppliers.map(supplier => ({
            id: supplier.id,
            name: supplier.name,
            address: supplier.address,
            phone: supplier.phone,
            email: supplier.email
          })),
          ['id', 'name', 'address', 'phone', 'email']
        );
        return new Response(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=suppliers.csv'
          }
        });
      } else {
        return json({ error: 'Model tidak valid' }, { status: 400 });
      }
    } else {
      return json({ error: 'Tipe tidak valid' }, { status: 400 });
    }
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}