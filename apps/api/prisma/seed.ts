import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'barbearia-modelo' },
    update: {},
    create: {
      name: 'Barbearia Modelo',
      slug: 'barbearia-modelo',
      active: true,
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@barbearia.example',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administrador Demo',
      email: 'admin@barbearia.example',
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
    },
  });

  console.log('Seed completed: tenant "Barbearia Modelo" + ADMIN user');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
