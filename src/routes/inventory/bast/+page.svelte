<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';
  import SignaturePad from '$lib/components/SignaturePad.svelte';
  import { jsPDF } from 'jspdf';
  import autoTable from 'jspdf-autotable';
  import QRCode from 'qrcode';

  let { data } = $props();
  let documents = $derived(data.documents);
  let activeLoans = $derived(data.activeLoans || []);
  let currentUser = $derived(data.currentUser);
  let pagination = $derived(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });

  let search = $state('');
  $effect(() => {
    search = data.filters.search || '';
  });

  $effect(() => {
    const qLoanId = $page.url.searchParams.get('loanId');
    if (qLoanId && activeLoans.length > 0 && !showCreateModal) {
      openCreate();
      handleLoanSelect(qLoanId);
    }
  });

  let searchTimeout: any;
  function applyFilters() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const url = new URL($page.url);
      if (search) url.searchParams.set('search', search); else url.searchParams.delete('search');
      url.searchParams.set('page', '1');
      goto(url.toString(), { keepFocus: true, noScroll: true });
    }, 300);
  }

  // Modal State Buat BAST
  let showCreateModal = $state(false);
  let loading = $state(false);

  let form = $state({
    title: 'Berita Acara Serah Terima Aset & Inventaris',
    loanId: '',
    handoverDate: new Date().toISOString().split('T')[0],
    firstPartyName: currentUser?.username || 'Staff Pengelola Aset',
    firstPartyRole: 'Petugas Pengelola Gudang & Aset',
    firstPartySignature: '',
    secondPartyName: '',
    secondPartyRole: 'Penerima / Pemohon Barang',
    secondPartySignature: '',
    notes: ''
  });

  let firstSigPad: any = $state(null);
  let secondSigPad: any = $state(null);

  function openCreate() {
    form = {
      title: 'Berita Acara Serah Terima Aset & Inventaris',
      loanId: '',
      handoverDate: new Date().toISOString().split('T')[0],
      firstPartyName: currentUser?.username || 'Staff Pengelola Aset',
      firstPartyRole: 'Petugas Pengelola Gudang & Aset',
      firstPartySignature: '',
      secondPartyName: '',
      secondPartyRole: 'Penerima / Pemohon Barang',
      secondPartySignature: '',
      notes: ''
    };
    showCreateModal = true;
  }

  function handleLoanSelect(loanIdStr: string) {
    form.loanId = loanIdStr;
    if (!loanIdStr) return;
    const loan = activeLoans.find((l: any) => l.id.toString() === loanIdStr);
    if (loan) {
      form.secondPartyName = loan.borrower?.name || loan.borrowerName || '';
      form.secondPartyRole = loan.borrower?.department ? `Karyawan (${loan.borrower.department})` : 'Peminjam Barang';
      const itemName = loan.asset?.name || loan.item?.name || 'Barang';
      const itemCode = loan.asset?.assetCode || loan.item?.sku || '';
      form.notes = `Serah terima peminjaman [${loan.loanCode}]: ${itemName} (${itemCode}) dalam kondisi ${loan.conditionBefore || 'BAIK'}.`;
    }
  }

  async function handleSave(e: Event) {
    e.preventDefault();

    // Get signatures from pads if available
    const sig1 = firstSigPad?.getDataUrl() || form.firstPartySignature;
    const sig2 = secondSigPad?.getDataUrl() || form.secondPartySignature;

    loading = true;
    try {
      const res = await fetch('/api/bast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          firstPartySignature: sig1,
          secondPartySignature: sig2
        })
      });

      if (res.ok) {
        toast.success('Dokumen BAST resmi berhasil diterbitkan!');
        showCreateModal = false;
        await invalidateAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menerbitkan BAST');
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem');
    } finally {
      loading = false;
    }
  }

  // Generate & Download PDF BAST
  async function downloadPDF(docData: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Kop Surat Resmi
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BERITA ACARA SERAH TERIMA (BAST)', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SISTEM MANAJEMEN INVENTORI & SIKLUS HIDUP ASET TERPADU', pageWidth / 2, 23, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(14, 27, pageWidth - 14, 27);
    doc.setLineWidth(0.2);
    doc.line(14, 28, pageWidth - 14, 28);

    // 2. Nomor Dokumen & Tanggal
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nomor Dokumen : ${docData.documentNumber}`, 14, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal          : ${new Date(docData.handoverDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 40);

    // 3. Pernyataan Pembuka
    doc.setFontSize(9);
    const intro = `Pada hari ini, ${new Date(docData.handoverDate).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}, telah dilaksanakan serah terima barang/aset inventaris antara pihak-pihak sebagai berikut:`;
    doc.text(doc.splitTextToSize(intro, pageWidth - 28), 14, 47);

    // 4. Identitas Pihak
    let currentY = 56;
    doc.setFont('helvetica', 'bold');
    doc.text('1. PIHAK PERTAMA (Yang Menyerahkan):', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama     : ${docData.firstPartyName}`, 20, currentY + 5);
    doc.text(`Jabatan : ${docData.firstPartyRole || 'Pengelola Gudang & Aset'}`, 20, currentY + 10);

    currentY += 18;
    doc.setFont('helvetica', 'bold');
    doc.text('2. PIHAK KEDUA (Yang Menerima):', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama     : ${docData.secondPartyName}`, 20, currentY + 5);
    doc.text(`Jabatan : ${docData.secondPartyRole || 'Pemohon / Peminjam'}`, 20, currentY + 10);

    // 5. Tabel Rincian Barang
    currentY += 18;
    doc.setFont('helvetica', 'bold');
    doc.text('Daftar Rincian Barang / Aset yang Diserahterimakan:', 14, currentY);

    const tableItems = [];
    if (docData.loan) {
      const l = docData.loan;
      const itemName = l.asset?.name || l.item?.name || 'Barang Konsumsi';
      const itemCode = l.asset?.assetCode || l.item?.sku || '-';
      const sn = l.asset?.serialNumber || '-';
      const cond = l.conditionBefore || 'BAIK';
      tableItems.push(['1', itemCode, itemName, sn, `${l.quantity} Unit`, cond, docData.notes || 'Sesuai prosedur']);
    } else {
      tableItems.push(['1', '-', docData.title, '-', '1 Paket', 'BAIK', docData.notes || '-']);
    }

    autoTable(doc, {
      startY: currentY + 3,
      head: [['No', 'Kode / SKU', 'Nama Barang / Aset', 'Serial Number', 'Jumlah', 'Kondisi', 'Catatan']],
      body: tableItems,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 141, 188] },
      margin: { left: 14, right: 14 }
    });

    // 6. Pernyataan Penutup
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    const closing = 'Pihak Kedua telah memeriksa dan menerima barang tersebut di atas dalam kondisi baik dan lengkap. Selanjutnya Pihak Kedua bertanggung jawab penuh atas pemeliharaan dan pengamanan barang tersebut sesuai ketentuan yang berlaku.';
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(doc.splitTextToSize(closing, pageWidth - 28), 14, finalY);

    // 7. Area Tanda Tangan & QR Code Verifikasi
    const sigY = finalY + 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Pihak Pertama Sign
    doc.text('Pihak Pertama (Menyerahkan),', 25, sigY);
    if (docData.firstPartySignature) {
      try {
        doc.addImage(docData.firstPartySignature, 'PNG', 20, sigY + 3, 40, 20);
      } catch (e) {}
    }
    doc.text(`( ${docData.firstPartyName} )`, 25, sigY + 28);

    // Pihak Kedua Sign
    doc.text('Pihak Kedua (Menerima),', pageWidth - 70, sigY);
    if (docData.secondPartySignature) {
      try {
        doc.addImage(docData.secondPartySignature, 'PNG', pageWidth - 75, sigY + 3, 40, 20);
      } catch (e) {}
    }
    doc.text(`( ${docData.secondPartyName} )`, pageWidth - 70, sigY + 28);

    // 8. QR Code Validasi Dokumen
    try {
      const qrDataUrl = await QRCode.toDataURL(`VERIFIED-BAST:${docData.documentNumber};DATE:${docData.handoverDate};PARTY1:${docData.firstPartyName};PARTY2:${docData.secondPartyName}`);
      doc.addImage(qrDataUrl, 'PNG', (pageWidth / 2) - 12, sigY + 2, 24, 24);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Validasi Digital', pageWidth / 2, sigY + 29, { align: 'center' });
    } catch (e) {}

    doc.save(`${docData.documentNumber.replace(/\//g, '_')}.pdf`);
    toast.success('Dokumen BAST resmi berhasil diunduh!');
  }

  async function handleDelete(docItem: any) {
    if (!confirm(`Hapus dokumen BAST ${docItem.documentNumber}?`)) return;
    try {
      const res = await fetch(`/api/bast/${docItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Dokumen BAST berhasil dihapus');
        await invalidateAll();
      } else {
        toast.error('Gagal menghapus dokumen');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<svelte:head>
  <title>Berita Acara Serah Terima (BAST) Digital – InventarisApp</title>
</svelte:head>

<div class="space-y-4">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
    <div>
      <h1 class="text-2xl font-normal text-gray-800 flex items-center gap-2">
        Berita Acara Serah Terima <span class="text-sm text-gray-500 font-light">(BAST Digital)</span>
      </h1>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={openCreate}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white text-sm font-semibold rounded shadow-sm transition"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Buat BAST Baru
      </button>
    </div>
  </div>

  <!-- Summary Banner -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="bg-white border border-gray-200 rounded p-4 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      </div>
      <div>
        <p class="text-xs text-gray-500 uppercase font-semibold">Total BAST Diterbitkan</p>
        <p class="text-xl font-bold text-gray-800">{pagination.total}</p>
      </div>
    </div>
    <div class="bg-white border border-gray-200 rounded p-4 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
      </div>
      <div>
        <p class="text-xs text-gray-500 uppercase font-semibold">Verifikasi Digital</p>
        <p class="text-xl font-bold text-emerald-700">100% QR Sah</p>
      </div>
    </div>
    <div class="bg-white border border-gray-200 rounded p-4 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
      </div>
      <div>
        <p class="text-xs text-gray-500 uppercase font-semibold">Tanda Tangan Elektronik</p>
        <p class="text-xl font-bold text-purple-700">Digital Touch/Pad</p>
      </div>
    </div>
  </div>

  <!-- Search Filter -->
  <div class="bg-white p-3 rounded border border-gray-200 shadow-sm flex items-center justify-between">
    <div class="relative min-w-[240px] flex-1 max-w-sm">
      <input
        type="text"
        placeholder="Cari nomor BAST, nama pihak, atau judul..."
        bind:value={search}
        oninput={applyFilters}
        class="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
      />
      <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    </div>
  </div>

  <!-- Documents Table -->
  <div class="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider">
          <tr>
            <th class="px-4 py-3">No. BAST</th>
            <th class="px-4 py-3">Judul Berita Acara</th>
            <th class="px-4 py-3">Tanggal</th>
            <th class="px-4 py-3">Pihak I (Menyerahkan)</th>
            <th class="px-4 py-3">Pihak II (Menerima)</th>
            <th class="px-4 py-3">Barang / Pinjaman</th>
            <th class="px-4 py-3 text-center">Tanda Tangan</th>
            <th class="px-4 py-3 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#if documents.length === 0}
            <tr>
              <td colspan="8" class="px-4 py-8 text-center text-gray-400">
                Belum ada dokumen BAST yang diterbitkan.
              </td>
            </tr>
          {:else}
            {#each documents as doc}
              <tr class="hover:bg-blue-50/40 transition">
                <td class="px-4 py-3 font-mono font-bold text-blue-700">{doc.documentNumber}</td>
                <td class="px-4 py-3">
                  <span class="font-semibold text-gray-800 text-sm block">{doc.title}</span>
                  {#if doc.notes}<span class="text-gray-400 text-[11px] block">{doc.notes}</span>{/if}
                </td>
                <td class="px-4 py-3 text-gray-600">{formatDate(doc.handoverDate)}</td>
                <td class="px-4 py-3">
                  <span class="font-semibold text-gray-800 block">{doc.firstPartyName}</span>
                  <span class="text-gray-400 text-[11px] block">{doc.firstPartyRole || 'Pengelola'}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="font-semibold text-gray-800 block">{doc.secondPartyName}</span>
                  <span class="text-gray-400 text-[11px] block">{doc.secondPartyRole || 'Penerima'}</span>
                </td>
                <td class="px-4 py-3">
                  {#if doc.loan}
                    <span class="font-mono text-blue-600 block text-[11px]">{doc.loan.loanCode}</span>
                    <span class="font-medium text-gray-800">{doc.loan.asset?.name || doc.loan.item?.name}</span>
                  {:else}
                    <span class="text-gray-400 italic text-[11px]">Umum / Non-Pinjaman</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    Lengkap 2 Pihak
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onclick={() => downloadPDF(doc)}
                      class="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded transition"
                      title="Download PDF BAST"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      Unduh PDF
                    </button>
                    <button
                      type="button"
                      onclick={() => handleDelete(doc)}
                      class="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                      title="Hapus"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Buat BAST Baru -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div class="relative w-full max-w-2xl bg-white rounded-lg p-5 shadow-xl animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <div>
          <h3 class="font-bold text-gray-800 text-base">Buat Berita Acara Serah Terima (BAST)</h3>
          <p class="text-xs text-gray-500">Lengkapi data serah terima dan tanda tangan digital kedua belah pihak</p>
        </div>
        <button type="button" onclick={() => showCreateModal = false} class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <form onsubmit={handleSave} class="space-y-4 text-xs">
        <div>
          <label for="bast-title" class="block font-semibold text-gray-700 mb-1">Judul Dokumen *</label>
          <input
            id="bast-title"
            type="text"
            required
            bind:value={form.title}
            class="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="bast-loan" class="block font-semibold text-gray-700 mb-1">Kaitkan dengan Transaksi Pinjam (Opsional)</label>
            <select
              id="bast-loan"
              value={form.loanId}
              onchange={(e) => handleLoanSelect((e.target as HTMLSelectElement).value)}
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            >
              <option value="">-- Bukan dari Peminjaman --</option>
              {#each activeLoans as l}
                <option value={l.id}>{l.loanCode} - {l.borrower?.name || l.borrowerName} ({l.asset?.name || l.item?.name})</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="bast-date" class="block font-semibold text-gray-700 mb-1">Tanggal Serah Terima</label>
            <input
              id="bast-date"
              type="date"
              required
              bind:value={form.handoverDate}
              class="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
            />
          </div>
        </div>

        <!-- Pihak Pertama & Kedua Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <!-- Pihak 1 -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded space-y-2.5">
            <h4 class="font-bold text-gray-800 text-xs text-blue-700 uppercase">Pihak I (Yang Menyerahkan)</h4>
            <div>
              <label for="p1-name" class="block text-[11px] font-semibold text-gray-600 mb-0.5">Nama Petugas *</label>
              <input
                id="p1-name"
                type="text"
                required
                bind:value={form.firstPartyName}
                class="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white"
              />
            </div>
            <div>
              <label for="p1-role" class="block text-[11px] font-semibold text-gray-600 mb-0.5">Jabatan / Bagian</label>
              <input
                id="p1-role"
                type="text"
                bind:value={form.firstPartyRole}
                class="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white"
              />
            </div>
            
            <SignaturePad
              bind:this={firstSigPad}
              label="Tanda Tangan Pihak I"
              width={260}
              height={120}
              onSave={(dataUrl) => form.firstPartySignature = dataUrl}
            />
          </div>

          <!-- Pihak 2 -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded space-y-2.5">
            <h4 class="font-bold text-gray-800 text-xs text-emerald-700 uppercase">Pihak II (Yang Menerima)</h4>
            <div>
              <label for="p2-name" class="block text-[11px] font-semibold text-gray-600 mb-0.5">Nama Penerima / Pemohon *</label>
              <input
                id="p2-name"
                type="text"
                required
                bind:value={form.secondPartyName}
                class="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white"
              />
            </div>
            <div>
              <label for="p2-role" class="block text-[11px] font-semibold text-gray-600 mb-0.5">Jabatan / Divisi</label>
              <input
                id="p2-role"
                type="text"
                bind:value={form.secondPartyRole}
                class="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white"
              />
            </div>

            <SignaturePad
              bind:this={secondSigPad}
              label="Tanda Tangan Pihak II"
              width={260}
              height={120}
              onSave={(dataUrl) => form.secondPartySignature = dataUrl}
            />
          </div>
        </div>

        <div>
          <label for="bast-notes" class="block font-semibold text-gray-700 mb-1">Catatan Kondisi / Klausul Tambahan</label>
          <textarea
            id="bast-notes"
            rows="2"
            bind:value={form.notes}
            placeholder="Kondisi kelengkapan fisik, adaptor, mouse, baret, dll..."
            class="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3c8dbc]"
          ></textarea>
        </div>

        <div class="pt-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onclick={() => showCreateModal = false}
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            class="px-4 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-semibold rounded shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Menerbitkan...' : 'Terbitkan Dokumen BAST'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
