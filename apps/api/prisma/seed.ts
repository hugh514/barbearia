import {
  AppointmentStatus,
  ConversationChannel,
  ConversationStatus,
  CustomerOrigin,
  MessageDirection,
  PaymentMethod,
  PaymentStatus,
  PlanStatus,
  PrismaClient,
  SubscriptionStatus,
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

  // Login do app do cliente (papel CLIENTE), vinculado ao João. Só para ambiente local.
  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'cliente@barbearia.example',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'João Silva',
      email: 'cliente@barbearia.example',
      passwordHash: await bcrypt.hash('Cliente123', 12),
      role: UserRole.CLIENTE,
      customerId: joao.id,
      active: true,
    },
  });
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

  const planMensal = await prisma.plan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000601' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000601',
      tenantId: tenant.id,
      name: 'Plano Mensal 4 Cortes',
      description: '4 cortes por mês com desconto',
      priceCents: 12000,
      intervalDays: 30,
      benefits: ['4 cortes/mês', '10% desconto em produtos'],
      active: true,
    },
  });

  const planQuinzenal = await prisma.plan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000602' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000602',
      tenantId: tenant.id,
      name: 'Plano Quinzenal',
      description: '2 cortes a cada 15 dias',
      priceCents: 7000,
      intervalDays: 15,
      benefits: ['2 cortes/quinzena'],
      active: true,
    },
  });

  await prisma.plan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000603' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000603',
      tenantId: tenant.id,
      name: 'Plano Legado',
      description: 'Plano descontinuado',
      priceCents: 5000,
      intervalDays: 30,
      benefits: ['1 corte/mês'],
      active: false,
    },
  });

  const startedAt = new Date();
  const nextBillingAt = new Date();
  nextBillingAt.setDate(nextBillingAt.getDate() + planMensal.intervalDays);

  const joaoSubscription = await prisma.subscription.upsert({
    where: { id: '00000000-0000-4000-8000-000000000611' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000611',
      tenantId: tenant.id,
      customerId: joao.id,
      planId: planMensal.id,
      status: SubscriptionStatus.ATIVO,
      startedAt,
      nextBillingAt,
    },
  });

  await prisma.customer.update({
    where: { id: joao.id },
    data: { planStatus: PlanStatus.ACTIVE },
  });

  const mariaSubscription = await prisma.subscription.upsert({
    where: { id: '00000000-0000-4000-8000-000000000612' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000612',
      tenantId: tenant.id,
      customerId: maria.id,
      planId: planQuinzenal.id,
      status: SubscriptionStatus.PENDENTE,
    },
  });

  await prisma.customer.update({
    where: { id: maria.id },
    data: { planStatus: PlanStatus.PENDING },
  });

  const joaoPayment = await prisma.payment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000701' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000701',
      tenantId: tenant.id,
      subscriptionId: joaoSubscription.id,
      customerId: joao.id,
      externalId: 'mp-seed-joao-approved',
      method: PaymentMethod.PIX,
      amountCents: planMensal.priceCents,
      status: PaymentStatus.APROVADO,
      paymentUrl: 'https://pay.mock/mp-seed-joao-approved',
      paidAt: startedAt,
      gatewayData: { mock: true, seed: true },
    },
  });

  const mariaPayment = await prisma.payment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000702' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000702',
      tenantId: tenant.id,
      subscriptionId: mariaSubscription.id,
      customerId: maria.id,
      externalId: 'mp-seed-maria-pending',
      method: PaymentMethod.PIX,
      amountCents: planQuinzenal.priceCents,
      status: PaymentStatus.PENDENTE,
      paymentUrl: 'https://pay.mock/mp-seed-maria-pending',
      qrCode: '00020126PIXSEEDMARIA',
      gatewayData: { mock: true, seed: true },
    },
  });

  const cancelledAt = new Date();
  cancelledAt.setDate(cancelledAt.getDate() - 5);

  const carlosSubscription = await prisma.subscription.upsert({
    where: { id: '00000000-0000-4000-8000-000000000613' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000613',
      tenantId: tenant.id,
      customerId: carlos.id,
      planId: planQuinzenal.id,
      status: SubscriptionStatus.CANCELADO,
      startedAt: new Date(cancelledAt.getTime() - 30 * 24 * 60 * 60 * 1000),
      cancelledAt,
    },
  });

  await prisma.customer.update({
    where: { id: carlos.id },
    data: { planStatus: PlanStatus.CANCELLED },
  });

  const ana = customers[4];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoFinished = new Date(weekAgo);
  weekAgoFinished.setHours(weekAgoFinished.getHours() + 1);

  await prisma.appointment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000504' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000504',
      tenantId: tenant.id,
      customerId: ana.id,
      barberId: barber.id,
      status: AppointmentStatus.FINALIZADO,
      services: ['Corte'],
      totalPrice: 45.0,
      startedAt: weekAgo,
      finishedAt: weekAgoFinished,
    },
  });

  await prisma.channelConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      businessName: 'Barbearia Modelo',
      services: [
        { name: 'Corte', price: 'R$ 45,00' },
        { name: 'Barba', price: 'R$ 30,00' },
        { name: 'Corte + Barba', price: 'R$ 65,00' },
        { name: 'Sobrancelha', price: 'R$ 15,00' },
      ],
      address: 'Rua das Flores, 123 — Centro, São Paulo - SP',
      phone: '11999990000',
      workingHours: 'Segunda a Sábado, das 9h às 19h',
      rules:
        'Aceitamos cartão e PIX. Atendimento por ordem de chegada, sem agendamento.',
      whatsappInstance: 'barbearia-modelo',
      instagramPageId: 'barbearia-modelo-page',
    },
  });

  await prisma.appointment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000505' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000505',
      tenantId: tenant.id,
      customerId: joao.id,
      barberId: barber.id,
      status: AppointmentStatus.FINALIZADO,
      services: ['Corte'],
      totalPrice: 50.0,
      startedAt: weekAgo,
      finishedAt: weekAgoFinished,
    },
  });

  console.log(
    `Seed completed: tenant + users + customers + conversations/messages + appointments (waiting: ${waitingAppointment.id}) + plans/subscriptions (active: ${joaoSubscription.id}, pending: ${mariaSubscription.id}, cancelled: ${carlosSubscription.id}) + payments (approved: ${joaoPayment.id}, pending: ${mariaPayment.id})`,
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
