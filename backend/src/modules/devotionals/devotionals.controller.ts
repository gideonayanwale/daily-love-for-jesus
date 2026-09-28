import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DevotionalsService, CreateDevotionalDto } from './devotionals.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Devotionals')
@Controller('api/devotionals')
export class DevotionalsController {
  constructor(private readonly devotionalsService: DevotionalsService) {}

  @Get('today')
  @ApiOperation({ summary: "Get today's devotional, or the most recent one" })
  async getToday() {
    return this.devotionalsService.getToday();
  }

  @Get()
  @ApiOperation({ summary: 'List published devotionals with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 20;
    const o = offset ? parseInt(offset, 10) : 0;
    return this.devotionalsService.list(l, o);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single devotional by ID' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.devotionalsService.getById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create new devotional (Admin only)' })
  async create(@Body() dto: CreateDevotionalDto) {
    return this.devotionalsService.create(dto);
  }
}
