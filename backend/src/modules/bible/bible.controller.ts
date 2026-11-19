import { Controller, Get, Param, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { BibleService } from './bible.service';

@ApiTags('Bible')
@Controller('api/bible')
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Get('translations')
  @ApiOperation({ summary: 'Get all available Bible translations' })
  async getTranslations() {
    return this.bibleService.getTranslations();
  }

  @Get('translations/popular')
  @ApiOperation({ summary: 'Get curated popular translations' })
  getPopularTranslations() {
    return this.bibleService.getPopularTranslations();
  }

  @Get('books')
  @ApiOperation({ summary: 'Get all 66 books of the Bible' })
  async getBooks() {
    return this.bibleService.getBooks();
  }

  @Get('books/:id')
  @ApiOperation({ summary: 'Get single Bible book metadata by ID' })
  async getBookById(@Param('id', ParseIntPipe) id: number) {
    if (id < 1 || id > 66) throw new BadRequestException('Book ID must be between 1 and 66.');
    return this.bibleService.getBookById(id);
  }

  @Get('chapters')
  @ApiOperation({ summary: 'Get list of chapters for a given book number' })
  @ApiQuery({ name: 'bookNumber', required: true, type: Number })
  async getChapters(@Query('bookNumber', ParseIntPipe) bookNumber: number) {
    if (bookNumber < 1 || bookNumber > 66) throw new BadRequestException('Book number must be between 1 and 66.');
    return this.bibleService.getChapters(bookNumber);
  }

  @Get('verses')
  @ApiOperation({ summary: 'Get verses for a specific chapter and translation' })
  @ApiQuery({ name: 'bookNumber', required: true, type: Number })
  @ApiQuery({ name: 'chapter', required: true, type: Number })
  @ApiQuery({ name: 'translation', required: false, type: String })
  async getVerses(
    @Query('bookNumber', ParseIntPipe) bookNumber: number,
    @Query('chapter', ParseIntPipe) chapter: number,
    @Query('translation') translation?: string,
  ) {
    if (bookNumber < 1 || bookNumber > 66 || chapter < 1 || chapter > 200) throw new BadRequestException('Invalid book or chapter number.');
    if (translation && !/^[A-Za-z0-9_-]{1,12}$/.test(translation)) throw new BadRequestException('Invalid translation code.');
    return this.bibleService.getChapter(translation || 'KJV', bookNumber, chapter);
  }

  @Get('verse')
  @ApiOperation({ summary: 'Get a single specific verse' })
  @ApiQuery({ name: 'bookNumber', required: true, type: Number })
  @ApiQuery({ name: 'chapter', required: true, type: Number })
  @ApiQuery({ name: 'verse', required: true, type: Number })
  @ApiQuery({ name: 'translation', required: false, type: String })
  async getVerse(
    @Query('bookNumber', ParseIntPipe) bookNumber: number,
    @Query('chapter', ParseIntPipe) chapter: number,
    @Query('verse', ParseIntPipe) verse: number,
    @Query('translation') translation?: string,
  ) {
    if (bookNumber < 1 || bookNumber > 66 || chapter < 1 || chapter > 200 || verse < 1 || verse > 200) throw new BadRequestException('Invalid book, chapter or verse number.');
    if (translation && !/^[A-Za-z0-9_-]{1,12}$/.test(translation)) throw new BadRequestException('Invalid translation code.');
    return this.bibleService.getVerse(translation || 'KJV', bookNumber, chapter, verse);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare a verse across multiple translations' })
  @ApiQuery({ name: 'bookNumber', required: true, type: Number })
  @ApiQuery({ name: 'chapter', required: true, type: Number })
  @ApiQuery({ name: 'verse', required: true, type: Number })
  @ApiQuery({ name: 'translations', required: false, type: String })
  async compareVerse(
    @Query('bookNumber', ParseIntPipe) bookNumber: number,
    @Query('chapter', ParseIntPipe) chapter: number,
    @Query('verse', ParseIntPipe) verse: number,
    @Query('translations') translations?: string,
  ) {
    if (bookNumber < 1 || bookNumber > 66 || chapter < 1 || chapter > 200 || verse < 1 || verse > 200) throw new BadRequestException('Invalid book, chapter or verse number.');
    const list = translations ? translations.split(',').slice(0, 8) : ['KJV', 'WEB', 'ESV', 'NIV'];
    if (list.some((code) => !/^[A-Za-z0-9_-]{1,12}$/.test(code))) throw new BadRequestException('Invalid translation list.');
    return this.bibleService.compareVerse(bookNumber, chapter, verse, list);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search scripture by keywords' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'translation', required: false, type: String })
  async search(
    @Query('query') query: string,
    @Query('translation') translation?: string,
  ) {
    if (typeof query !== 'string' || query.trim().length < 1 || query.length > 100) throw new BadRequestException('Search query must be between 1 and 100 characters.');
    if (translation && !/^[A-Za-z0-9_-]{1,12}$/.test(translation)) throw new BadRequestException('Invalid translation code.');
    return this.bibleService.search(translation || 'KJV', query.trim());
  }

  @Get('random')
  @ApiOperation({ summary: 'Get an inspirational random verse of the day' })
  @ApiQuery({ name: 'translation', required: false, type: String })
  async getRandomVerse(@Query('translation') translation?: string) {
    return this.bibleService.getRandomVerse(translation || 'KJV');
  }
}
