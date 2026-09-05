/**
 * Seed de arranque: crea sucursales, usuarios y catálogo de ejemplo SOLO si
 * la base de datos está vacía (no hay usuarios). Es idempotente y seguro de
 * correr en cada despliegue — no requiere devDependencies (ts-node) porque
 * se compila junto con el resto del backend (dist/bootstrap-seed.js) y se
 * ejecuta con `node` en la imagen de producción.
 */
import { PrismaClient, Role, StorageArea } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Ya existen usuarios; se omite el seed de arranque.');
    return;
  }

  console.log('Base de datos vacía. Creando datos de ejemplo...');

  const centro = await prisma.branch.upsert({
    where: { code: 'CENTRO' },
    update: {},
    create: {
      name: 'Sucursal Centro',
      code: 'CENTRO',
      operationalCloseHour: '04:00',
      timezone: 'America/Mexico_City',
    },
  });

  const norte = await prisma.branch.upsert({
    where: { code: 'NORTE' },
    update: {},
    create: {
      name: 'Sucursal Norte',
      code: 'NORTE',
      operationalCloseHour: '00:00',
      timezone: 'America/Mexico_City',
    },
  });

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@restaurante.com',
      name: 'Administrador General',
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
    },
  });

  const encargado = await prisma.user.create({
    data: {
      email: 'encargado@restaurante.com',
      name: 'Encargado Centro',
      role: Role.ENCARGADO,
      passwordHash,
      canCorrectClosedCounts: true,
      isActive: true,
    },
  });

  const capturista = await prisma.user.create({
    data: {
      email: 'capturista@restaurante.com',
      name: 'Capturista Turno Noche',
      role: Role.CAPTURISTA,
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userBranch.createMany({
    data: [
      { userId: encargado.id, branchId: centro.id },
      { userId: encargado.id, branchId: norte.id },
      { userId: capturista.id, branchId: centro.id },
    ],
  });

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
    const id = `${p.name}-${p.presentation ?? ''}`.replace(/\s/g, '_');
    const product = await prisma.product.create({
      data: {
        id,
        name: p.name,
        category: p.category,
        presentation: p.presentation,
        storageArea: p.storageArea,
        displayOrder: p.displayOrder,
      },
    });
    await prisma.productBranch.createMany({
      data: branches.map((b) => ({ productId: product.id, branchId: b.id })),
    });
  }

  console.log('Seed de arranque completado.');
  console.log('Usuarios de prueba (contraseña: Password123!):');
  console.log('  ADMIN       -> admin@restaurante.com');
  console.log('  ENCARGADO   -> encargado@restaurante.com');
  console.log('  CAPTURISTA  -> capturista@restaurante.com');
}

main()
  .catch((e) => {
    console.error('Error en el seed de arranque:', e);
    // No detenemos el arranque de la API por un fallo de seed.
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
