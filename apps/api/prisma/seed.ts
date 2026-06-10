import { CustomerOrigin, PrismaClient, UserRole } from '@prisma/client';
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

  const demoCustomers = [
    {
      name: 'João Silva',
      phone: '11999998888',
      instagramUser: '@joaosilva',
      origin: CustomerOrigin.MANUAL,
    },
    {
      name: 'Maria Santos',
      phone: '11988887777',
      instagramUser: '@mariasantos',
      origin: CustomerOrigin.WHATSAPP,
    },
    {
      name: 'Pedro Oliveira',
      phone: '11977776666',
      origin: CustomerOrigin.INSTAGRAM,
    },
    {
      name: 'Carlos Mendes',
      phone: '11966665555',
      origin: CustomerOrigin.MANUAL,
    },
    {
      name: 'Ana Costa',
      phone: '11955554444',
      instagramUser: '@anacosta',
      origin: CustomerOrigin.WHATSAPP,
    },
  ];

  for (const customer of demoCustomers) {
    await prisma.customer.upsert({
      where: {
        tenantId_phone: {
          tenantId: tenant.id,
          phone: customer.phone,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: customer.name,
        phone: customer.phone,
        instagramUser: customer.instagramUser,
        origin: customer.origin,
      },
    });
  }

  console.log(
    'Seed completed: tenant "Barbearia Modelo" + ADMIN user + demo customers',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
