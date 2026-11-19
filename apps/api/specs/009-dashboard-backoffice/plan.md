# Plano Técnico 009: Dashboard e Métricas

---

## Estrutura

```
src/modules/dashboard/
  dashboard.module.ts
  dashboard.controller.ts
  dashboard.service.ts
  dto/
    dashboard-query.dto.ts
    summary-response.dto.ts
    customers-metrics.dto.ts
    revenue-metrics.dto.ts
    plans-metrics.dto.ts
    conversations-metrics.dto.ts
    barbers-metrics.dto.ts
```

## Strategy de Cache

```typescript
// Decorator customizado para cache
@CacheMetric('dashboard:summary', 300) // TTL 5min
async getSummary(tenantId: string, period: Period) { ... }

// Redis key pattern: metric:{tenantId}:{endpoint}:{period}
// Invalidação: não precisa, TTL curto é suficiente
```

## Period Enum e Date Ranges

```typescript
enum Period {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

function getDateRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case 'today': return { from: startOfDay(now), to: now };
    case 'week': return { from: startOfWeek(now), to: now };
    case 'month': return { from: startOfMonth(now), to: now };
    case 'year': return { from: startOfYear(now), to: now };
  }
}
```

## Agregações Prisma Exemplo

```typescript
// Receita por barbeiro
const revenueByBarber = await this.prisma.appointment.groupBy({
  by: ['barberId'],
  where: { tenantId, status: 'FINALIZADO', finishedAt: { gte: from, lte: to } },
  _sum: { totalPrice: true },
  _count: true,
});
```
