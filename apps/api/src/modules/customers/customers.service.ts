import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import {
  CLIENTE_CADASTRADO,
  ClienteCadastradoPayload,
} from '@common/events/customer.events';
import {
  buildPaginatedResult,
  getPaginationSkip,
} from '@common/pagination/pagination.util';
import { PaginatedResult } from '@common/pagination/pagination.types';
import { CreateCustomerDto } from '@modules/customers/dto/create-customer.dto';
import { CustomerQueryDto } from '@modules/customers/dto/customer-query.dto';
import {
  CustomerProfileResponseDto,
  CustomerResponseDto,
  UpsertCustomerResponseDto,
} from '@modules/customers/dto/customer-response.dto';
import { UpdateCustomerDto } from '@modules/customers/dto/update-customer.dto';
import { UpsertCustomerDto } from '@modules/customers/dto/upsert-customer.dto';
import { toCustomerResponse } from '@modules/customers/customers.mapper';
import { ConversationResponseDto } from '@modules/conversations/dto/conversation-response.dto';
import { ConversationsService } from '@modules/conversations/conversations.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly conversationsService: ConversationsService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    await this.assertPhoneAvailable(tenantId, dto.phone);

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        instagramUser: dto.instagram,
        origin: dto.origin,
      },
    });

    return toCustomerResponse(customer);
  }

  async findAll(
    tenantId: string,
    query: CustomerQueryDto,
  ): Promise<PaginatedResult<CustomerResponseDto>> {
    const where = this.buildSearchWhere(tenantId, query.search);
    const skip = getPaginationSkip(query.page, query.perPage);

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: query.perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return buildPaginatedResult(
      customers.map(toCustomerResponse),
      total,
      query.page,
      query.perPage,
    );
  }

  async findOne(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerProfileResponseDto> {
    const customer = await this.findCustomerInTenant(customerId, tenantId);

    return {
      ...toCustomerResponse(customer),
      recentAppointments: [],
      activePlan: null,
    };
  }

  async update(
    tenantId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    await this.findCustomerInTenant(customerId, tenantId);

    if (dto.phone !== undefined) {
      await this.assertPhoneAvailable(tenantId, dto.phone, customerId);
    }

    const updateData: Prisma.CustomerUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }
    if (dto.instagram !== undefined) {
      updateData.instagramUser = dto.instagram;
    }

    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    return toCustomerResponse(customer);
  }

  async upsert(
    tenantId: string,
    dto: UpsertCustomerDto,
  ): Promise<UpsertCustomerResponseDto> {
    const existing = await this.prisma.customer.findUnique({
      where: {
        tenantId_phone: {
          tenantId,
          phone: dto.phone,
        },
      },
    });

    if (existing) {
      return {
        ...toCustomerResponse(existing),
        created: false,
      };
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        phone: dto.phone,
        name: dto.name ?? dto.phone,
        origin: dto.origin,
      },
    });

    const payload: ClienteCadastradoPayload = {
      customerId: customer.id,
      tenantId: customer.tenantId,
      phone: customer.phone,
      name: customer.name,
      origin: customer.origin,
    };

    this.eventEmitter.emit(CLIENTE_CADASTRADO, payload);

    return {
      ...toCustomerResponse(customer),
      created: true,
    };
  }

  async getHistory(
    tenantId: string,
    customerId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<unknown>> {
    await this.findCustomerInTenant(customerId, tenantId);
    return buildPaginatedResult([], 0, page, perPage);
  }

  async getConversations(
    tenantId: string,
    customerId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<ConversationResponseDto>> {
    return this.conversationsService.findByCustomer(
      tenantId,
      customerId,
      page,
      perPage,
    );
  }

  private buildSearchWhere(
    tenantId: string,
    search?: string,
  ): Prisma.CustomerWhereInput {
    if (!search) {
      return { tenantId };
    }

    return {
      tenantId,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { instagramUser: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  private async findCustomerInTenant(
    customerId: string,
    tenantId: string,
  ): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  private async assertPhoneAvailable(
    tenantId: string,
    phone: string,
    excludeCustomerId?: string,
  ): Promise<void> {
    const existing = await this.prisma.customer.findUnique({
      where: {
        tenantId_phone: {
          tenantId,
          phone,
        },
      },
    });

    if (existing && existing.id !== excludeCustomerId) {
      throw new ConflictException('Phone already exists in this tenant');
    }
  }
}
