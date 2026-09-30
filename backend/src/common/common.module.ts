import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [Reflector, SupabaseAuthGuard, RolesGuard],
  exports: [Reflector, SupabaseAuthGuard, RolesGuard],
})
export class CommonModule {}
