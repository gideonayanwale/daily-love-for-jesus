import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService, AddFavoriteDto } from './favorites.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('api/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List user bookmarked verses, hymns, devotionals' })
  @ApiQuery({ name: 'type', required: false, enum: ['verse', 'hymn', 'devotional'] })
  async list(
    @CurrentUser('id') userId: string,
    @Query('type') type?: 'verse' | 'hymn' | 'devotional',
  ) {
    return this.favoritesService.list(userId, type);
  }

  @Post()
  @ApiOperation({ summary: 'Add an item to favorites' })
  async add(
    @CurrentUser('id') userId: string,
    @Body() dto: AddFavoriteDto,
  ) {
    return this.favoritesService.add(userId, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove an item from favorites' })
  @ApiQuery({ name: 'type', required: true, enum: ['verse', 'hymn', 'devotional'] })
  @ApiQuery({ name: 'itemId', required: true, type: Number })
  async remove(
    @CurrentUser('id') userId: string,
    @Query('type') type: 'verse' | 'hymn' | 'devotional',
    @Query('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.favoritesService.remove(userId, type, itemId);
  }
}
