/**
 * Dados extras de demonstração: equipe completa, fila do dia em vários
 * estados, assinaturas e pagamentos de teste em três barbearias.
 * Nomes, e-mails e telefones são fictícios. Senhas só para ambiente local.
 *
 * Idempotente (upsert com update vazio): rodar de novo não altera nada.
 * A "fila do dia" fica com a data em que o banco foi populado; para recriar,
 * `docker compose down -v` e suba de novo.
 */
import {
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  PlanStatus,
  PrismaClient,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';

type Fila = {
  cliente: number; // índice em clientes
  status: AppointmentStatus;
  servicos: string[];
  minutosAtras: number; // quando entrou na fila
  barbeiro?: number; // índice em barbeiros
  preco?: number;
  duracaoMin?: number; // para EM_ATENDIMENTO e FINALIZADO
  motivo?: string; // para CANCELADO
};

type Assinatura = {
  cliente: number;
  plano: number;
  status: SubscriptionStatus;
  pagamento?: { method: PaymentMethod; status: PaymentStatus };
};

type Barbearia = {
  slug: string;
  nome: string;
  base: number; // faixa de ids fixos desta barbearia
  dominio: string;
  gerente?: string;
  barbeiros: string[];
  clientes: { nome: string; telefone: string }[];
  planos: {
    nome: string;
    precoCents: number;
    dias: number;
    beneficios: string[];
  }[];
  servicos?: { name: string; price: string }[];
  fila: Fila[];
  assinaturas: Assinatura[];
};

const uuid = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

const minutosAtras = (min: number): Date => new Date(Date.now() - min * 60_000);

const PLANO_STATUS: Record<SubscriptionStatus, PlanStatus> = {
  ATIVO: PlanStatus.ACTIVE,
  PENDENTE: PlanStatus.PENDING,
  SUSPENSO: PlanStatus.OVERDUE,
  CANCELADO: PlanStatus.CANCELLED,
};

const BARBEARIAS: Barbearia[] = [
  {
    // Complementa a Barbearia Modelo criada em seed.ts.
    slug: 'barbearia-modelo',
    nome: 'Barbearia Modelo',
    base: 1000,
    dominio: 'barbearia.example',
    gerente: 'Gerente Demo',
    barbeiros: ['Rafael Demo', 'Lucas Demo'],
    clientes: [
      { nome: 'Bruno Teixeira', telefone: '11900000101' },
      { nome: 'Diego Ramos', telefone: '11900000102' },
      { nome: 'Felipe Moura', telefone: '11900000103' },
      { nome: 'Gustavo Lima', telefone: '11900000104' },
      { nome: 'Henrique Alves', telefone: '11900000105' },
      { nome: 'Igor Castro', telefone: '11900000106' },
      { nome: 'Leandro Pires', telefone: '11900000107' },
      { nome: 'Marcos Vieira', telefone: '11900000108' },
    ],
    planos: [
      {
        nome: 'Plano Barba Ilimitada',
        precoCents: 9000,
        dias: 30,
        beneficios: ['Barba sempre que quiser'],
      },
    ],
    fila: [
      {
        cliente: 0,
        status: 'AGUARDANDO',
        servicos: ['Corte'],
        minutosAtras: 35,
      },
      {
        cliente: 1,
        status: 'AGUARDANDO',
        servicos: ['Corte', 'Barba'],
        minutosAtras: 20,
      },
      {
        cliente: 2,
        status: 'AGUARDANDO',
        servicos: ['Barba'],
        minutosAtras: 8,
      },
      {
        cliente: 3,
        status: 'EM_ATENDIMENTO',
        servicos: ['Corte'],
        minutosAtras: 50,
        barbeiro: 0,
        duracaoMin: 15,
      },
      {
        cliente: 4,
        status: 'EM_ATENDIMENTO',
        servicos: ['Corte', 'Barba'],
        minutosAtras: 45,
        barbeiro: 1,
        duracaoMin: 5,
      },
      {
        cliente: 5,
        status: 'FINALIZADO',
        servicos: ['Corte'],
        minutosAtras: 180,
        barbeiro: 0,
        preco: 45,
        duracaoMin: 30,
      },
      {
        cliente: 6,
        status: 'FINALIZADO',
        servicos: ['Corte + Barba'],
        minutosAtras: 150,
        barbeiro: 1,
        preco: 65,
        duracaoMin: 45,
      },
      {
        cliente: 7,
        status: 'CANCELADO',
        servicos: ['Corte'],
        minutosAtras: 120,
        motivo: 'Cliente desistiu da espera',
      },
    ],
    assinaturas: [
      {
        cliente: 5,
        plano: 0,
        status: 'ATIVO',
        pagamento: { method: 'CARD', status: 'APROVADO' },
      },
      {
        cliente: 6,
        plano: 0,
        status: 'SUSPENSO',
        pagamento: { method: 'PIX', status: 'EXPIRADO' },
      },
    ],
  },
  {
    slug: 'barbearia-centro',
    nome: 'Barbearia do Centro',
    base: 2000,
    dominio: 'centro.example',
    gerente: 'Gerente Centro',
    barbeiros: ['Paulo Centro', 'Sergio Centro'],
    clientes: [
      { nome: 'André Souza', telefone: '21900000201' },
      { nome: 'Caio Martins', telefone: '21900000202' },
      { nome: 'Eduardo Nunes', telefone: '21900000203' },
      { nome: 'Fábio Rocha', telefone: '21900000204' },
      { nome: 'Otávio Dias', telefone: '21900000205' },
    ],
    planos: [
      {
        nome: 'Clube do Corte',
        precoCents: 11000,
        dias: 30,
        beneficios: ['4 cortes/mês'],
      },
      {
        nome: 'Corte e Barba Mensal',
        precoCents: 18000,
        dias: 30,
        beneficios: ['4 cortes e 4 barbas/mês'],
      },
    ],
    servicos: [
      { name: 'Corte', price: 'R$ 50,00' },
      { name: 'Barba', price: 'R$ 35,00' },
      { name: 'Corte + Barba', price: 'R$ 75,00' },
      { name: 'Pigmentação', price: 'R$ 40,00' },
    ],
    fila: [
      {
        cliente: 0,
        status: 'AGUARDANDO',
        servicos: ['Corte'],
        minutosAtras: 15,
      },
      {
        cliente: 1,
        status: 'AGUARDANDO',
        servicos: ['Barba'],
        minutosAtras: 5,
      },
      {
        cliente: 2,
        status: 'EM_ATENDIMENTO',
        servicos: ['Corte + Barba'],
        minutosAtras: 40,
        barbeiro: 0,
        duracaoMin: 20,
      },
      {
        cliente: 3,
        status: 'FINALIZADO',
        servicos: ['Corte'],
        minutosAtras: 200,
        barbeiro: 1,
        preco: 50,
        duracaoMin: 30,
      },
      {
        cliente: 4,
        status: 'FINALIZADO',
        servicos: ['Pigmentação'],
        minutosAtras: 160,
        barbeiro: 0,
        preco: 40,
        duracaoMin: 25,
      },
    ],
    assinaturas: [
      {
        cliente: 3,
        plano: 0,
        status: 'ATIVO',
        pagamento: { method: 'PIX', status: 'APROVADO' },
      },
      {
        cliente: 4,
        plano: 1,
        status: 'PENDENTE',
        pagamento: { method: 'PIX', status: 'PENDENTE' },
      },
    ],
  },
  {
    slug: 'navalha-norte',
    nome: 'Navalha Norte',
    base: 3000,
    dominio: 'navalha.example',
    barbeiros: ['Tiago Navalha'],
    clientes: [
      { nome: 'Vitor Barros', telefone: '31900000301' },
      { nome: 'Wagner Freitas', telefone: '31900000302' },
    ],
    planos: [
      {
        nome: 'Plano Único',
        precoCents: 8000,
        dias: 30,
        beneficios: ['2 cortes/mês'],
      },
    ],
    servicos: [
      { name: 'Corte', price: 'R$ 40,00' },
      { name: 'Barba', price: 'R$ 25,00' },
    ],
    fila: [
      {
        cliente: 0,
        status: 'AGUARDANDO',
        servicos: ['Corte'],
        minutosAtras: 10,
      },
      {
        cliente: 1,
        status: 'FINALIZADO',
        servicos: ['Corte', 'Barba'],
        minutosAtras: 90,
        barbeiro: 0,
        preco: 65,
        duracaoMin: 40,
      },
    ],
    assinaturas: [
      {
        cliente: 1,
        plano: 0,
        status: 'ATIVO',
        pagamento: { method: 'PIX', status: 'APROVADO' },
      },
    ],
  },
];

async function seedBarbearia(
  prisma: PrismaClient,
  b: Barbearia,
  passwordHash: string,
): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: b.slug },
    update: {},
    create: { name: b.nome, slug: b.slug, active: true },
  });
  const tenantId = tenant.id;

  const usuario = (email: string, name: string, role: UserRole) =>
    prisma.user.upsert({
      where: { tenantId_email: { tenantId, email } },
      update: {},
      create: { tenantId, name, email, passwordHash, role, active: true },
    });

  if (b.slug !== 'barbearia-modelo') {
    await usuario(`dono@${b.dominio}`, `Dono ${b.nome}`, UserRole.ADMIN);
  }
  if (b.gerente) {
    await usuario(`gerente@${b.dominio}`, b.gerente, UserRole.GERENTE);
  }
  const barbeiros = [];
  for (const nome of b.barbeiros) {
    const email = `${nome.split(' ')[0].toLowerCase()}@${b.dominio}`;
    barbeiros.push(await usuario(email, nome, UserRole.BARBEIRO));
  }

  const clientes = [];
  for (const c of b.clientes) {
    clientes.push(
      await prisma.customer.upsert({
        where: { tenantId_phone: { tenantId, phone: c.telefone } },
        update: {},
        create: { tenantId, name: c.nome, phone: c.telefone },
      }),
    );
  }

  const planos = [];
  for (const [i, p] of b.planos.entries()) {
    planos.push(
      await prisma.plan.upsert({
        where: { id: uuid(b.base + 100 + i) },
        update: {},
        create: {
          id: uuid(b.base + 100 + i),
          tenantId,
          name: p.nome,
          priceCents: p.precoCents,
          intervalDays: p.dias,
          benefits: p.beneficios,
          active: true,
        },
      }),
    );
  }

  for (const [i, f] of b.fila.entries()) {
    const createdAt = minutosAtras(f.minutosAtras);
    const startedAt =
      f.duracaoMin !== undefined ? minutosAtras(f.minutosAtras - 5) : undefined;
    const finishedAt =
      f.status === 'FINALIZADO' && startedAt
        ? new Date(startedAt.getTime() + (f.duracaoMin ?? 30) * 60_000)
        : undefined;
    await prisma.appointment.upsert({
      where: { id: uuid(b.base + 200 + i) },
      update: {},
      create: {
        id: uuid(b.base + 200 + i),
        tenantId,
        customerId: clientes[f.cliente].id,
        barberId:
          f.barbeiro !== undefined ? barbeiros[f.barbeiro].id : undefined,
        status: f.status,
        services: f.servicos,
        totalPrice: f.preco,
        cancelReason: f.motivo,
        createdAt,
        startedAt,
        finishedAt,
      },
    });
    if (finishedAt) {
      await prisma.customer.updateMany({
        where: { id: clientes[f.cliente].id, lastVisit: null },
        data: { lastVisit: finishedAt },
      });
    }
  }

  for (const [i, a] of b.assinaturas.entries()) {
    const plano = planos[a.plano];
    const cliente = clientes[a.cliente];
    const ativa = a.status !== 'PENDENTE';
    const inicio = minutosAtras(60 * 24 * 10);
    const sub = await prisma.subscription.upsert({
      where: { id: uuid(b.base + 300 + i) },
      update: {},
      create: {
        id: uuid(b.base + 300 + i),
        tenantId,
        customerId: cliente.id,
        planId: plano.id,
        status: a.status,
        startedAt: ativa ? inicio : undefined,
        nextBillingAt:
          a.status === 'ATIVO'
            ? new Date(inicio.getTime() + plano.intervalDays * 86_400_000)
            : undefined,
      },
    });
    await prisma.customer.update({
      where: { id: cliente.id },
      data: { planStatus: PLANO_STATUS[a.status] },
    });
    if (a.pagamento) {
      const id = uuid(b.base + 400 + i);
      await prisma.payment.upsert({
        where: { id },
        update: {},
        create: {
          id,
          tenantId,
          subscriptionId: sub.id,
          customerId: cliente.id,
          externalId: `mp-seed-${b.slug}-${i}`,
          method: a.pagamento.method,
          amountCents: plano.priceCents,
          status: a.pagamento.status,
          paymentUrl: `https://pay.mock/mp-seed-${b.slug}-${i}`,
          paidAt: a.pagamento.status === 'APROVADO' ? inicio : undefined,
          gatewayData: { mock: true, seed: true },
        },
      });
    }
  }

  if (b.servicos) {
    await prisma.channelConfig.upsert({
      where: { tenantId },
      update: {},
      create: {
        tenantId,
        businessName: b.nome,
        services: b.servicos,
        address: 'Endereço fictício para demonstração',
        phone: b.clientes[0].telefone.slice(0, 2) + '00000000',
        workingHours: 'Segunda a sábado, das 9h às 19h',
        rules: 'Atendimento por ordem de chegada, sem agendamento.',
      },
    });
  }
}

export async function seedBarbearias(
  prisma: PrismaClient,
  passwordHash: string,
): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed de demonstração não roda com NODE_ENV=production');
  }
  for (const b of BARBEARIAS) {
    await seedBarbearia(prisma, b, passwordHash);
  }
}
