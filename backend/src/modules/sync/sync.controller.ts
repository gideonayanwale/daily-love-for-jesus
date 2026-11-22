import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Sync')
@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Check database service health without exposing connection diagnostics' })
  async getHealth() {
    const status = await this.syncService.checkHealth();
    const allHealthy = status.neon.connected && status.supabase.connected;
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('run')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger database synchronization (platform admin only)' })
  async runSync(@Body() body: { direction?: string }) {
    const direction = body?.direction ?? 'all';
    if (!['all', 'supabase→neon', 'neon→supabase'].includes(direction)) {
      throw new BadRequestException('Invalid sync direction.');
    }
    const start = Date.now();
    const results = await this.syncService.runSync(direction);
    const totalRows = results.reduce((acc, r) => acc + r.rowsSynced, 0);
    const totalErrors = results.flatMap((r) => r.errors);
    return {
      ok: totalErrors.length === 0,
      direction,
      totalRowsSynced: totalRows,
      durationMs: Date.now() - start,
      tables: results,
      errors: totalErrors.length > 0 ? totalErrors : undefined,
    };
  }

  @Post('supabase-to-neon')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Copy data from Supabase to Neon (platform admin only)' })
  async syncSupabaseToNeon() {
    const start = Date.now();
    const results = await this.syncService.runSync('supabase→neon');
    return {
      ok: true,
      totalRowsSynced: results.reduce((acc, r) => acc + r.rowsSynced, 0),
      durationMs: Date.now() - start,
      tables: results,
    };
  }

  @Post('neon-to-supabase')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Copy data from Neon to Supabase (platform admin only)' })
  async syncNeonToSupabase() {
    const start = Date.now();
    const results = await this.syncService.runSync('neon→supabase');
    return {
      ok: true,
      totalRowsSynced: results.reduce((acc, r) => acc + r.rowsSynced, 0),
      durationMs: Date.now() - start,
      tables: results,
    };
  }
}
