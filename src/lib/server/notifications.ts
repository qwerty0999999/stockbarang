import { prisma } from '$lib/server/db';
import { sendWhatsAppAlert } from '$lib/server/whatsapp';
import { sendEmail } from '$lib/server/email';

/**
 * Notifikasi saat peminjaman dibuat
 */
export async function notifyLoanCreated(loan: any, borrower: any) {
  if (!borrower?.phone) return;
  const itemName = loan.item?.name || loan.asset?.name || 'Barang / Aset';
  const itemCode = loan.asset?.assetCode || loan.item?.sku || '-';
  const dueDate = loan.expectedReturnDate
    ? new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Tidak ditentukan';

  const message = `Halo ${borrower.name},\n\nPeminjaman Anda telah dicatat dalam sistem:\n` +
    `• No. Pinjam: ${loan.loanCode}\n` +
    `• Barang/Aset: ${itemName} (${itemCode})\n` +
    `• Jumlah: ${loan.quantity}\n` +
    `• Batas Pengembalian: ${dueDate}\n\n` +
    `Mohon rawat barang dengan baik dan kembalikan tepat waktu. Terima kasih!`;

  await sendWhatsAppAlert(borrower.phone, message);
}

/**
 * Notifikasi H-1 sebelum jatuh tempo pinjaman
 */
export async function notifyLoanDueSoon(loan: any, borrower: any) {
  if (!borrower?.phone) return;
  const itemName = loan.item?.name || loan.asset?.name || 'Barang / Aset';
  const dueDate = loan.expectedReturnDate
    ? new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Besok';

  const message = `🔔 PENGINGAT JATUH TEMPO PINJAMAN\n\n` +
    `Halo ${borrower.name},\n` +
    `Mengingatkan bahwa peminjaman barang berikut akan jatuh tempo besok:\n` +
    `• No. Pinjam: ${loan.loanCode}\n` +
    `• Barang: ${itemName}\n` +
    `• Jatuh Tempo: ${dueDate}\n\n` +
    `Silakan lakukan pengembalian atau konfirmasi ke tim gudang/manajemen aset jika memerlukan perpanjangan. Terima kasih!`;

  await sendWhatsAppAlert(borrower.phone, message);
}

/**
 * Notifikasi keterlambatan (Overdue) via WhatsApp & Email
 */
export async function notifyLoanOverdue(loan: any, borrower: any) {
  const itemName = loan.item?.name || loan.asset?.name || 'Barang / Aset';
  const dueDate = loan.expectedReturnDate
    ? new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-';

  const waMessage = `⚠️ PERINGATAN KETERLAMBATAN PINJAMAN\n\n` +
    `Yth. ${borrower.name},\n` +
    `Peminjaman Anda telah melewati batas waktu pengembalian:\n` +
    `• No. Pinjam: ${loan.loanCode}\n` +
    `• Barang: ${itemName}\n` +
    `• Batas Waktu: ${dueDate}\n\n` +
    `Harap SEGERA mengembalikan barang tersebut ke unit gudang/aset. Terima kasih atas kerja samanya.`;

  if (borrower?.phone) {
    await sendWhatsAppAlert(borrower.phone, waMessage);
  }

  if (borrower?.email) {
    const emailSubject = `[PENTING] Keterlambatan Pengembalian Barang - ${loan.loanCode}`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #dc2626;">Pemberitahuan Keterlambatan Pengembalian</h2>
        <p>Yth. <strong>${borrower.name}</strong>,</p>
        <p>Sistem mencatat bahwa peminjaman barang berikut telah melewati batas waktu (Overdue):</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; width: 40%;">Nomor Pinjam</td><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${loan.loanCode}</strong></td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;">Barang / Aset</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${itemName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;">Batas Waktu</td><td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${dueDate}</td></tr>
        </table>
        <p>Mohon untuk segera mengembalikan barang tersebut ke petugas gudang.</p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">Email ini dikirim secara otomatis oleh Sistem Inventaris & Manajemen Aset.</p>
      </div>
    `;
    await sendEmail(borrower.email, emailSubject, emailHtml);
  }
}

/**
 * Alert stok kritis ke pengelola gudang
 */
export async function notifyLowStockAlert(items: any[]) {
  if (!items || items.length === 0) return;

  // Temukan admin atau dev dengan email yang tersedia
  const admins = await prisma.user.findMany({
    where: { role: { in: ['admin', 'dev', 'manajemen'] } }
  });

  const adminEmails = process.env.NOTIFICATION_EMAIL 
    ? [process.env.NOTIFICATION_EMAIL] 
    : [];

  if (adminEmails.length === 0 && !process.env.SMTP_USER) return;

  const recipient = adminEmails[0] || process.env.SMTP_USER || '';
  if (!recipient) return;

  const subject = `⚠️ [PERINGATAN] Ada ${items.length} Barang Mencapai Stok Kritis`;
  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${i.name}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${i.sku || '-'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${i.quantity}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${i.minStock}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${i.location || '-'}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #ea580c;">Laporan Stok Kritis Gudang</h2>
      <p>Berikut adalah daftar barang yang kuantitasnya telah berada di bawah batas minimum (Min Stock):</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Nama Barang</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">SKU</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Sisa Stok</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Min Stock</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Lokasi</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <p>Mohon segera lakukan pengadaan barang / Purchase Order (PO) kepada suplier terkait.</p>
      <p style="font-size: 12px; color: #6b7280; margin-top: 25px;">Sistem Otomasi Notifikasi StockBarang</p>
    </div>
  `;

  await sendEmail(recipient, subject, html);
}

/**
 * Runner untuk mengecek dan memicu seluruh alert jatuh tempo & overdue
 */
export async function runScheduledAlertsCheck() {
  const now = new Date();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);

  let remindersSent = 0;
  let overduesUpdated = 0;

  // 1. Peminjaman H-1
  const dueTomorrowLoans = await prisma.loan.findMany({
    where: {
      status: 'DIPINJAM',
      expectedReturnDate: {
        gte: tomorrowStart,
        lte: tomorrowEnd
      }
    },
    include: { borrower: true, item: true, asset: true }
  });

  for (const loan of dueTomorrowLoans) {
    if (loan.borrower) {
      await notifyLoanDueSoon(loan, loan.borrower);
      remindersSent++;
    }
  }

  // 2. Peminjaman yang melewati tanggal pengembalian (Overdue)
  const overdueLoans = await prisma.loan.findMany({
    where: {
      status: 'DIPINJAM',
      expectedReturnDate: {
        lt: now
      }
    },
    include: { borrower: true, item: true, asset: true }
  });

  for (const loan of overdueLoans) {
    // Update status menjadi TERLAMBAT
    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: 'TERLAMBAT' }
    });

    if (loan.borrower) {
      await notifyLoanOverdue(loan, loan.borrower);
      overduesUpdated++;
    }
  }

  // 3. Cek barang stok kritis
  const allItems = await prisma.item.findMany();
  const lowStockItems = allItems.filter(i => i.quantity <= i.minStock);

  if (lowStockItems.length > 0) {
    await notifyLowStockAlert(lowStockItems);
  }

  return {
    remindersSent,
    overduesUpdated,
    lowStockCount: lowStockItems.length
  };
}
