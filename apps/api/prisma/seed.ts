import {
  AppointmentStatus,
  ConversationChannel,
  ConversationStatus,
  CustomerOrigin,
  MessageDirection,
  PrismaClient,
  UserRole,
} from '@prisma/client';
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

  const admin = await prisma.user.upsert({
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

  const barber = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'barbeiro@barbearia.example',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Barbeiro Demo',
      email: 'barbeiro@barbearia.example',
      passwordHash,
      role: UserRole.BARBEIRO,
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

  const customers = [];

  for (const customer of demoCustomers) {
    const created = await prisma.customer.upsert({
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
    customers.push(created);
  }

  const joao = customers[0];
  const maria = customers[1];

  const whatsappConversation = await prisma.conversation.upsert({
    where: { id: '00000000-0000-4000-8000-000000000401' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000401',
      tenantId: tenant.id,
      customerId: joao.id,
      channel: ConversationChannel.WHATSAPP,
      status: ConversationStatus.EM_ATENDIMENTO,
      assignedTo: admin.id,
    },
  });

  const instagramConversation = await prisma.conversation.upsert({
    where: { id: '00000000-0000-4000-8000-000000000402' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000402',
      tenantId: tenant.id,
      customerId: maria.id,
      channel: ConversationChannel.INSTAGRAM,
      status: ConversationStatus.AGUARDANDO,
    },
  });

  const closedConversation = await prisma.conversation.upsert({
    where: { id: '00000000-0000-4000-8000-000000000403' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000403',
      tenantId: tenant.id,
      customerId: joao.id,
      channel: ConversationChannel.INSTAGRAM,
      status: ConversationStatus.FECHADA,
    },
  });

  const demoMessages = [
    {
      id: '00000000-0000-4000-8000-000000000411',
      conversationId: whatsappConversation.id,
      content: 'Olá, gostaria de saber o horário de funcionamento.',
      direction: MessageDirection.INBOUND,
      channel: ConversationChannel.WHATSAPP,
      externalId: 'wamid.demo001',
    },
    {
      id: '00000000-0000-4000-8000-000000000412',
      conversationId: whatsappConversation.id,
      content: 'Funcionamos de segunda a sábado, das 9h às 19h.',
      direction: MessageDirection.OUTBOUND,
      channel: ConversationChannel.WHATSAPP,
      externalId: 'wamid.demo002',
    },
    {
      id: '00000000-0000-4000-8000-000000000413',
      conversationId: instagramConversation.id,
      content: 'Vocês fazem degradê?',
      direction: MessageDirection.INBOUND,
      channel: ConversationChannel.INSTAGRAM,
      externalId: 'ig.demo001',
    },
    {
      id: '00000000-0000-4000-8000-000000000414',
      conversationId: closedConversation.id,
      content: 'Obrigado pelo atendimento!',
      direction: MessageDirection.INBOUND,
      channel: ConversationChannel.INSTAGRAM,
      externalId: 'ig.demo002',
    },
  ];

  for (const message of demoMessages) {
    await prisma.message.upsert({
      where: { id: message.id },
      update: {},
      create: {
        id: message.id,
        tenantId: tenant.id,
        conversationId: message.conversationId,
        content: message.content,
        direction: message.direction,
        channel: message.channel,
        externalId: message.externalId,
      },
    });
  }

  const pedro = customers[2];
  const carlos = customers[3];

  const waitingAppointment = await prisma.appointment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000501' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000501',
      tenantId: tenant.id,
      customerId: pedro.id,
      status: AppointmentStatus.AGUARDANDO,
      services: ['Corte', 'Barba'],
    },
  });

  const inProgressStartedAt = new Date();
  inProgressStartedAt.setMinutes(inProgressStartedAt.getMinutes() - 15);

  await prisma.appointment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000502' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000502',
      tenantId: tenant.id,
      customerId: carlos.id,
      barberId: barber.id,
      status: AppointmentStatus.EM_ATENDIMENTO,
      services: ['Corte'],
      startedAt: inProgressStartedAt,
    },
  });

  const finishedStartedAt = new Date();
  finishedStartedAt.setHours(finishedStartedAt.getHours() - 2);
  const finishedAt = new Date();
  finishedAt.setHours(finishedAt.getHours() - 1);

  await prisma.appointment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000503' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000503',
      tenantId: tenant.id,
      customerId: joao.id,
      barberId: barber.id,
      status: AppointmentStatus.FINALIZADO,
      services: ['Corte', 'Sobrancelha'],
      totalPrice: 55.0,
      notes: 'Cliente satisfeito',
      startedAt: finishedStartedAt,
      finishedAt,
    },
  });

  await prisma.customer.update({
    where: { id: joao.id },
    data: { lastVisit: finishedAt },
  });

  console.log(
    `Seed completed: tenant + users + customers + conversations/messages + appointments (waiting: ${waitingAppointment.id})`,
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
