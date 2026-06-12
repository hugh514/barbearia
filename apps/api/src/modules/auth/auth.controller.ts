import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { Public } from '@modules/auth/decorators/public.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { AuthService } from '@modules/auth/auth.service';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import { LoginDto, loginSchema } from '@modules/auth/dto/login.dto';
import { RefreshDto, refreshSchema } from '@modules/auth/dto/refresh.dto';
import { LogoutDto, logoutSchema } from '@modules/auth/dto/logout.dto';
import { TokenResponseDto } from '@modules/auth/dto/login-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
  ): Promise<TokenResponseDto> {
    return this.authService.login(body.email, body.password, body.tenantSlug);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens (rotação)' })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshDto,
  ): Promise<TokenResponseDto> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Encerrar sessão' })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({ status: 204, description: 'Sessão encerrada' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(logoutSchema)) body: LogoutDto,
  ): Promise<void> {
    await this.authService.logout(
      user.tenantId,
      user.userId,
      body.refreshToken,
    );
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Perfil do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId, user.tenantId);
  }
}
