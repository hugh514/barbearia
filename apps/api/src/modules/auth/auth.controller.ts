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
import {
  ForgotPasswordDto,
  forgotPasswordSchema,
} from '@modules/auth/dto/forgot-password.dto';
import {
  ResetPasswordDto,
  resetPasswordSchema,
} from '@modules/auth/dto/reset-password.dto';
import {
  RegisterClientDto,
  registerClientSchema,
} from '@modules/auth/dto/register-client.dto';

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

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 202, description: 'Solicitação recebida (genérico)' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordDto,
  ): Promise<{ ok: true }> {
    await this.authService.forgotPassword(body.email, body.tenantSlug);
    return { ok: true };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Senha redefinida' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordDto,
  ): Promise<{ ok: true }> {
    await this.authService.resetPassword(body.token, body.password);
    return { ok: true };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @Post('register-client')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Auto-cadastro de cliente' })
  @ApiBody({ type: RegisterClientDto })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async registerClient(
    @Body(new ZodValidationPipe(registerClientSchema)) body: RegisterClientDto,
  ): Promise<TokenResponseDto> {
    return this.authService.registerClient(body);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Perfil do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId, user.tenantId);
  }
}
