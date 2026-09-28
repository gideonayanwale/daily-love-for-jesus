import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HymnsService } from './hymns.service';

@ApiTags('Hymns')
@Controller('api/hymns')
export class HymnsController {
  constructor(private readonly hymnsService: HymnsService) {}

  @Get()
  @ApiOperation({ summary: 'List or search hymns' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  async list(
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.hymnsService.list(search, category);
  }

  @Get('random')
  @ApiOperation({ summary: 'Get a featured random hymn' })
  async getRandom() {
    return this.hymnsService.getRandom();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all unique hymn categories' })
  async getCategories() {
    return this.hymnsService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hymn details by internal ID' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.hymnsService.getById(id);
  }

  @Get('number/:number')
  @ApiOperation({ summary: 'Get hymn details by hymn book number' })
  async getByNumber(@Param('number', ParseIntPipe) hymnNumber: number) {
    return this.hymnsService.getByNumber(hymnNumber);
  }
}
