import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, UpdateProfileDto } from './auth.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Response } from 'express';
import * as cookie from 'cookie';

@ApiTags('Auth')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get currently authenticated user' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile (name, avatar)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Log out current session and clear auth cookie' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('sb-access-token', '', {
        path: '/',
        maxAge: 0,
      }),
    );
    return { success: true };
  }
}
