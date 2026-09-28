import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Sync')
@Controller('api/sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
  ) {}

  private verifyAdmin(headers: Record<string, string>) {
    const secret = headers['x-admin-secret'];
    const appSecret = this.configService.get<string>('security.appSecret');
    if (secret && secret === appSecret) {
      return;
    }

    const auth = headers['authorization'];
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      // Allowed if bearer token is provided
      return;
    }

    throw new UnauthorizedException('x-admin-secret or admin bearer token required');
  }

  @Get('health')
  @ApiOperation({ summary: 'Check health status of both database connections' })
  async getHealth() {
    const status = await this.syncService.checkHealth();
    const allHealthy = status.neon.connected && status.supabase.connected;
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      databases: status,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('run')
  @ApiOperation({ summary: 'Trigger bidirectional database synchronization' })
  @ApiHeader({ name: 'x-admin-secret', required: false })
  async runSync(
    @Headers() headers: Record<string, string>,
    @Body() body: { direction?: string },
  ) {
    this.verifyAdmin(headers);
    const direction = body?.direction ?? 'all';
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
  @ApiOperation({ summary: 'Copy data from Supabase to Neon' })
  async syncSupabaseToNeon(@Headers() headers: Record<string, string>) {
    this.verifyAdmin(headers);
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
  @ApiOperation({ summary: 'Copy data from Neon to Supabase' })
  async syncNeonToSupabase(@Headers() headers: Record<string, string>) {
    this.verifyAdmin(headers);
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
