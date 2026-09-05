import { PrismaClient, Role, StorageArea } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando datos de ejemplo...');

  // ---- Sucursales ----------------------------------------------------------
  const centro = await prisma.branch.upsert({
    where: { code: 'CENTRO' },
    update: {},
    create: {
      name: 'Sucursal Centro',
      code: 'CENTRO',
      operationalCloseHour: '04:00', // cierra tarde, después de medianoche
      timezone: 'America/Mexico_City',
    },
  });

  const norte = await prisma.branch.upsert({
    where: { code: 'NORTE' },
    update: {},
    create: {
      name: 'Sucursal Norte',
      code: 'NORTE',
      operationalCloseHour: '00:00', // cierra a medianoche
      timezone: 'America/Mexico_City',
    },
  });

  // ---- Usuarios --------------------------------------------------------------
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@restaurante.com' },
    update: {},
    create: {
      email: 'admin@restaurante.com',
      name: 'Administrador General',
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
    },
  });

  const encargado = await prisma.user.upsert({
    where: { email: 'encargado@restaurante.com' },
    update: {},
    create: {
      email: 'encargado@restaurante.com',
      name: 'Encargado Centro',
      role: Role.ENCARGADO,
      passwordHash,
      canCorrectClosedCounts: true,
      isActive: true,
    },
  });

  const capturista = await prisma.user.upsert({
    where: { email: 'capturista@restaurante.com' },
    update: {},
    create: {
      email: 'capturista@restaurante.com',
      name: 'Capturista Turno Noche',
      role: Role.CAPTURISTA,
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: encargado.id, branchId: centro.id } },
    update: {},
    create: { userId: encargado.id, branchId: centro.id },
  });
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: encargado.id, branchId: norte.id } },
    update: {},
    create: { userId: encargado.id, branchId: norte.id },
  });
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: capturista.id, branchId: centro.id } },
    update: {},
    create: { userId: capturista.id, branchId: centro.id },
  });

  // ---- Catálogo de productos --------------------------------------------------
  const products: {
    name: string;
    category: string;
    presentation?: string;
    storageArea: StorageArea;
    displayOrder: number;
  }[] = [
    { name: 'Coca-Cola', category: 'Refresco', presentation: '355ml', storageArea: StorageArea.REFRIGERADOR, displayOrder: 1 },
    { name: 'Coca-Cola Light', category: 'Refresco', presentation: '355ml', storageArea: StorageArea.REFRIGERADOR, displayOrder: 2 },
    { name: 'Sprite', category: 'Refresco', presentation: '355ml', storageArea: StorageArea.REFRIGERADOR, displayOrder: 3 },
    { name: 'Agua Mineral', category: 'Agua', presentation: '355ml', storageArea: StorageArea.REFRIGERADOR, displayOrder: 4 },
    { name: 'Cerveza Corona', category: 'Cerveza', presentation: '355ml', storageArea: StorageArea.REFRIGERADOR, displayOrder: 5 },
    { name: 'Cerveza Modelo Especial', category: 'Cerveza', presentation: '355ml', storageArea: StorageArea.REFRIGERADOR, displayOrder: 6 },
    { name: 'Agua Natural 1L', category: 'Agua', presentation: '1L', storageArea: StorageArea.ALMACEN, displayOrder: 1 },
    { name: 'Refresco 2L Cola', category: 'Refresco', presentation: '2L', storageArea: StorageArea.ALMACEN, displayOrder: 2 },
    { name: 'Tequila Reposado', category: 'Licor', presentation: '750ml', storageArea: StorageArea.ALMACEN, displayOrder: 3 },
    { name: 'Ron Blanco', category: 'Licor', presentation: '750ml', storageArea: StorageArea.ALMACEN, displayOrder: 4 },
    { name: 'Whisky', category: 'Licor', presentation: '750ml', storageArea: StorageArea.ALMACEN, displayOrder: 5 },
    { name: 'Vino Tinto Casa', category: 'Vino', presentation: '750ml', storageArea: StorageArea.ALMACEN, displayOrder: 6 },
  ];

  const branches = [centro, norte];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { id: `${p.name}-${p.presentation ?? ''}`.replace(/\s/g, '_') },
      update: {},
      create: {
        id: `${p.name}-${p.presentation ?? ''}`.replace(/\s/g, '_'),
        name: p.name,
        category: p.category,
        presentation: p.presentation,
        storageArea: p.storageArea,
        displayOrder: p.displayOrder,
      },
    });

    for (const branch of branches) {
      await prisma.productBranch.upsert({
        where: { productId_branchId: { productId: product.id, branchId: branch.id } },
        update: {},
        create: { productId: product.id, branchId: branch.id },
      });
    }
  }

  console.log('Seed completado.');
  console.log('Usuarios de prueba (password: Password123!):');
  console.log('  ADMIN       -> admin@restaurante.com');
  console.log('  ENCARGADO   -> encargado@restaurante.com (Sucursal Centro y Norte)');
  console.log('  CAPTURISTA  -> capturista@restaurante.com (Sucursal Centro)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
