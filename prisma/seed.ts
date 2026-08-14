import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const manajemenPassword = await bcrypt.hash('manajemen123', 10);
  const devPassword = await bcrypt.hash('Qwerty@!#099', 10);
  
  // 1. Buat User Admin & Manajemen & Dev
  await prisma.user.upsert({
    where: { username: 'rijal' },
    update: {},
    create: {
      username: 'rijal',
      email: 'rijal@dev.local',
      password: devPassword,
      role: 'dev'
    }
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'Ahmad Jhony',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    }
  });
  
  await prisma.user.upsert({
    where: { email: 'manajemen@example.com' },
    update: {},
    create: {
      username: 'Maimun',
      email: 'manajemen@example.com',
      password: manajemenPassword,
      role: 'manajemen'
    }
  });

  // 2. Buat Supplier
  const suppliers = [
    { name: 'CV. CIMITA LESTARI', address: 'JL. MERPATI ALI NO.89', phone: '08937373383' },
    { name: 'PT. JAYA SEJAHTERA', address: 'JL. KELELAWAR NO.98', phone: '08766373733' },
    { name: 'CV. KARYA ANAK NEGERI', address: 'JL. MERDEKA no. 898', phone: '08737363734' }
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { name: s.name },
      update: {},
      create: s
    });
  }

  // 3. Buat Kategori Contoh
  const categories = [
    { name: 'Sarana' },
    { name: 'Prasarana' }
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c
    });
  }

  // 4. Buat Barang Contoh
  const sarana = await prisma.category.findUnique({ where: { name: 'Sarana' } });
  const prasarana = await prisma.category.findUnique({ where: { name: 'Prasarana' } });

  const items = [
    {
      name: 'KURSI',
      description: 'DI BELI BARU',
      location: 'KELAS X2',
      quantity: 94,
      minStock: 5,
      price: 50000,
      categoryId: sarana?.id
    },
    {
      name: 'MEJA',
      description: '',
      location: 'KELAS X2',
      quantity: 11,
      minStock: 5,
      price: 150000,
      categoryId: sarana?.id
    },
    {
      name: 'WC',
      description: '4 WA PRIA, 4 WC WANITA',
      location: 'BELAKANG KANTIN',
      quantity: 7,
      minStock: 2,
      price: 5000000,
      categoryId: prasarana?.id
    },
    {
      name: 'PENSIL 2B',
      description: 'BARU',
      location: 'GUDANG',
      quantity: 400,
      minStock: 50,
      price: 3000,
      categoryId: sarana?.id
    }
  ];

  for (const item of items) {
    const existing = await prisma.item.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.item.create({ data: item });
    }
  }

  console.log('All seed data completed successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
