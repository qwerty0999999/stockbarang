import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';

export const GET: RequestHandler = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Item ID required' }), { status: 400 });
  }

  const item = await prisma.item.findUnique({
    where: { id: parseInt(id) },
    include: { category: true }
  });
  if (!item) {
    return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
  }

  const canvas = createCanvas(400, 300);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 400, 300);

  // Border
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, 390, 290);

  // Title
  ctx.fillStyle = '#000';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(item.name, 10, 30);

  // SKU
  ctx.font = '12px Arial';
  ctx.fillText(`SKU: ${item.sku || '-'}`, 10, 50);

  // Barcode (using JsBarcode)
  const barcodeCanvas = createCanvas(200, 80);
  JsBarcode(barcodeCanvas, item.sku || item.id.toString(), {
    format: 'CODE128',
    width: 1.5,
    height: 60,
    displayValue: true
  });
  ctx.drawImage(barcodeCanvas, 10, 60);

  // QR Code
  const qrCanvas = createCanvas(100, 100);
  await QRCode.toCanvas(qrCanvas, JSON.stringify({ id: item.id, sku: item.sku }), { width: 100 });
  ctx.drawImage(qrCanvas, 280, 50);

  // Info
  ctx.font = '12px Arial';
  ctx.fillText(`Stok: ${item.quantity}`, 10, 180);
  ctx.fillText(`Min: ${item.minStock}`, 10, 200);
  ctx.fillText(`Harga: Rp ${item.price.toLocaleString()}`, 10, 220);
  ctx.fillText(`Kategori: ${item.category?.name || '-'}`, 10, 240);

  // Footer
  ctx.font = '10px Arial';
  ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, 10, 280);

  const buffer = canvas.toBuffer('image/png');
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename=label-${item.sku || item.id}.png`
    }
  });
};