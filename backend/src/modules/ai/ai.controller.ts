import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('AI Study Assistant')
@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('explain')
  @ApiOperation({ summary: 'Get theological context, Greek/Hebrew keywords, and application for scripture' })
  async explainVerse(
    @Body()
    body: {
      scripture: string;
      verseText: string;
      userContext?: string;
    },
  ) {
    if (!body || typeof body.scripture !== 'string' || body.scripture.trim().length < 1 || body.scripture.length > 200) {
      throw new BadRequestException('A valid scripture reference (max 200 characters) is required.');
    }
    if (typeof body.verseText !== 'string' || body.verseText.trim().length < 1 || body.verseText.length > 5000) {
      throw new BadRequestException('Verse text must be between 1 and 5,000 characters.');
    }
    if (body.userContext && body.userContext.length > 2000) {
      throw new BadRequestException('User context cannot exceed 2,000 characters.');
    }
    return this.aiService.explainPassage(body.scripture.trim(), body.verseText.trim(), body.userContext?.slice(0, 2000));
  }

  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard)
  @Post('sermon-notes')
  @ApiOperation({ summary: 'Summarize sermon transcript into key themes, scriptures, and small group questions' })
  async summarizeSermon(
    @Body()
    body: {
      title?: string;
      transcript: string;
    },
  ) {
    if (!body || typeof body.transcript !== 'string' || body.transcript.trim().length < 1 || body.transcript.length > 15000) {
      throw new BadRequestException('Sermon transcript must be between 1 and 15,000 characters.');
    }
    if (body.title && body.title.length > 200) {
      throw new BadRequestException('Sermon title cannot exceed 200 characters.');
    }
    return this.aiService.summarizeSermon(body.title?.trim() || '', body.transcript.trim());
  }
}
