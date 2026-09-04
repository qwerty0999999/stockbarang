import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';

export const GET: RequestHandler = async ({ url }) => {
  const itemId = url.searchParams.get('id');
  const assetId = url.searchParams.get('assetId');

  if (!itemId && !assetId) {
    return new Response(JSON.stringify({ error: 'Item ID atau Asset ID diperlukan' }), { status: 400 });
  }

  let title = '';
  let code = '';
  let categoryName = '-';
  let extra1 = '';
  let extra2 = '';
  let extra3 = '';
  let filename = '';

  if (assetId) {
    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(assetId) },
      include: { category: true, brand: true, location: true }
    });
    if (!asset) {
      return new Response(JSON.stringify({ error: 'Aset tidak ditemukan' }), { status: 404 });
    }
    title = asset.name;
    code = asset.assetCode;
    categoryName = asset.category?.name || '-';
    extra1 = `Lokasi: ${asset.location?.name || '-'}`;
    extra2 = `Kondisi: ${asset.condition}`;
    extra3 = `PIC: ${asset.pic || '-'}`;
    filename = `label-asset-${asset.assetCode}`;
  } else if (itemId) {
    const item = await prisma.item.findUnique({
      where: { id: parseInt(itemId) },
      include: { category: true }
    });
    if (!item) {
      return new Response(JSON.stringify({ error: 'Item tidak ditemukan' }), { status: 404 });
    }
    title = item.name;
    code = item.sku || item.id.toString();
    categoryName = item.category?.name || '-';
    extra1 = `Stok: ${item.quantity}`;
    extra2 = `Lokasi: ${item.location || '-'}`;
    extra3 = `Harga: Rp ${item.price.toLocaleString('id-ID')}`;
    filename = `label-item-${code}`;
  }

  const canvas = createCanvas(400, 300);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 400, 300);

  // Border
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, 390, 290);

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(title.substring(0, 30), 15, 30);

  // Code
  ctx.font = '12px Arial';
  ctx.fillText(`KODE / SKU: ${code}`, 15, 50);

  // Barcode (using JsBarcode)
  const barcodeCanvas = createCanvas(200, 70);
  JsBarcode(barcodeCanvas, code, {
    format: 'CODE128',
    width: 1.5,
    height: 50,
    displayValue: true
  });
  ctx.drawImage(barcodeCanvas, 15, 60);

  // QR Code
  const qrCanvas = createCanvas(100, 100);
  await QRCode.toCanvas(qrCanvas, JSON.stringify({ code, name: title }), { width: 100, margin: 1 });
  ctx.drawImage(qrCanvas, 280, 40);

  // Info
  ctx.font = '12px Arial';
  ctx.fillText(`Kategori: ${categoryName}`, 15, 175);
  ctx.fillText(extra1, 15, 195);
  ctx.fillText(extra2, 15, 215);
  ctx.fillText(extra3, 15, 235);

  // Footer
  ctx.font = '10px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText(`Dicetak: ${new Date().toLocaleDateString('id-ID')} | Stockbarang`, 15, 275);

  const buffer = canvas.toBuffer('image/png');
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename=${filename}.png`
    }
  });
};