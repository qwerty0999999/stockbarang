import { json } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals, url }: RequestEvent) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const itemId = url.searchParams.get('itemId');
  const assetId = url.searchParams.get('assetId');

  if (!itemId && !assetId) {
    return json({ error: 'ID barang atau aset harus disediakan' }, { status: 400 });
  }

  try {
    let name = '';
    let code = '';
    let categoryName = '-';

    if (assetId) {
      const asset = await db.asset.findUnique({
        where: { id: parseInt(assetId) },
        include: { category: true }
      });
      if (!asset) return json({ error: 'Aset tidak ditemukan' }, { status: 404 });
      name = asset.name;
      code = asset.assetCode;
      categoryName = asset.category?.name || '-';
    } else if (itemId) {
      const item = await db.item.findUnique({
        where: { id: parseInt(itemId) },
        include: { category: true }
      });
      if (!item) return json({ error: 'Barang tidak ditemukan' }, { status: 404 });
      name = item.name;
      code = item.sku || item.id.toString();
      categoryName = item.category?.name || '-';
    }

    const canvas = createCanvas(250, 90);
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14
    });
    const barcodeUrl = canvas.toDataURL('image/png');
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify({ code, name, category: categoryName }));

    return json({
      barcode: barcodeUrl,
      qrCode: qrCodeUrl,
      code,
      name
    });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}