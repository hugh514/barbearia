import { Injectable, NotFoundException } from '@nestjs/common';
import { Plan, Prisma } from '@prisma/client';
import {
  buildPaginatedResult,
  getPaginationSkip,
} from '@common/pagination/pagination.util';
import { PaginatedResult } from '@common/pagination/pagination.types';
import { CreatePlanDto } from '@modules/plans/dto/create-plan.dto';
import { PlanQueryDto } from '@modules/plans/dto/plan-query.dto';
import { PlanResponseDto } from '@modules/plans/dto/plan-response.dto';
import { UpdatePlanDto } from '@modules/plans/dto/update-plan.dto';
import { toPlanResponse } from '@modules/plans/plans.mapper';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePlanDto): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        intervalDays: dto.intervalDays,
        benefits: dto.benefits,
        active: dto.active,
      },
    });

    return toPlanResponse(plan);
  }

  async findAll(
    tenantId: string,
    query: PlanQueryDto,
  ): Promise<PaginatedResult<PlanResponseDto>> {
    const where: Prisma.PlanWhereInput = {
      tenantId,
      ...(query.active !== undefined ? { active: query.active } : {}),
    };
    const skip = getPaginationSkip(query.page, query.perPage);

    const [plans, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        skip,
        take: query.perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return buildPaginatedResult(
      plans.map(toPlanResponse),
      total,
      query.page,
      query.perPage,
    );
  }

  async findOne(tenantId: string, planId: string): Promise<PlanResponseDto> {
    const plan = await this.findPlanInTenant(planId, tenantId);
    return toPlanResponse(plan);
  }

  async update(
    tenantId: string,
    planId: string,
    dto: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    await this.findPlanInTenant(planId, tenantId);

    const plan = await this.prisma.plan.update({
      where: { id: planId },
      data: dto,
    });

    return toPlanResponse(plan);
  }

  async softDisable(
    tenantId: string,
    planId: string,
  ): Promise<PlanResponseDto> {
    await this.findPlanInTenant(planId, tenantId);

    const plan = await this.prisma.plan.update({
      where: { id: planId },
      data: { active: false },
    });

    return toPlanResponse(plan);
  }

  private async findPlanInTenant(
    planId: string,
    tenantId: string,
  ): Promise<Plan> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, tenantId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }
}
