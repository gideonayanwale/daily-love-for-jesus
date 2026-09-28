import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
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
    return this.bibleService.getBookById(id);
  }

  @Get('chapters')
  @ApiOperation({ summary: 'Get list of chapters for a given book number' })
  @ApiQuery({ name: 'bookNumber', required: true, type: Number })
  async getChapters(@Query('bookNumber', ParseIntPipe) bookNumber: number) {
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
    const list = translations ? translations.split(',') : ['KJV', 'WEB', 'ESV', 'NIV'];
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
    return this.bibleService.search(translation || 'KJV', query);
  }

  @Get('random')
  @ApiOperation({ summary: 'Get an inspirational random verse of the day' })
  @ApiQuery({ name: 'translation', required: false, type: String })
  async getRandomVerse(@Query('translation') translation?: string) {
    return this.bibleService.getRandomVerse(translation || 'KJV');
  }
}
