import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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
    return this.aiService.explainPassage(body.scripture, body.verseText, body.userContext);
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
    return this.aiService.summarizeSermon(body.title || '', body.transcript);
  }
}
