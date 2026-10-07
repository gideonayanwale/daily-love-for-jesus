import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VerseExplanationResponse {
  scripture: string;
  historicalContext: string;
  keyWordInsights: Array<{ word: string; originalLanguage: string; meaning: string }>;
  crossReferences: string[];
  lifeApplication: string;
  source: 'gemini' | 'openrouter' | 'theological_commentary';
}

export interface SermonSummaryResponse {
  title: string;
  coreThemes: string[];
  scripturesIdentified: string[];
  keyTakeaways: string[];
  discussionQuestions: string[];
  personalActionStep: string;
  source: 'gemini' | 'openrouter' | 'theological_commentary';
}

const OPENROUTER_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
  'mistralai/mistral-7b-instruct:free',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  private getGeminiKey(): string {
    return (
      this.configService.get<string>('integrations.geminiApiKey') ||
      process.env.GEMINI_API_KEY ||
      ''
    );
  }

  private getOpenRouterKey(): string {
    return (
      this.configService.get<string>('integrations.openrouterApiKey') ||
      process.env.OPENROUTER_API_KEY ||
      ''
    );
  }

  private async callOpenRouter(prompt: string): Promise<string | null> {
    const apiKey = this.getOpenRouterKey();
    if (!apiKey) return null;

    for (const model of OPENROUTER_FREE_MODELS) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://dailyloveforjesus.org',
            'X-Title': 'Daily Love For Jesus',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are a reverent, biblically sound Christian scholar and study assistant. Always reply strictly with valid JSON without markdown code fences or backticks when instructed.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content;
          if (content) {
            // Clean markdown blocks or extract JSON object if LLM included preamble
            const match = content.match(/\{[\s\S]*\}/);
            const cleaned = match ? match[0] : content.replace(/```json/g, '').replace(/```/g, '').trim();
            return cleaned;
          }
        }
      } catch (err: any) {
        this.logger.warn(`OpenRouter model ${model} failed: ${err.message}. Trying next free model...`);
      }
    }
    return null;
  }

  async explainPassage(
    scripture: string,
    verseText: string,
    userContext?: string,
  ): Promise<VerseExplanationResponse> {
    const prompt = `Analyze the following Holy Scripture passage:
Reference: "${scripture}"
Text: "${verseText}"
${userContext ? `User context/question: "${userContext}"` : ''}

Respond ONLY with valid JSON in this exact structure:
{
  "historicalContext": "Concise paragraph explaining who wrote this, when, to whom, and why.",
  "keyWordInsights": [
    { "word": "Word from text", "originalLanguage": "Hebrew or Greek", "meaning": "Deeper theological significance" }
  ],
  "crossReferences": ["Book Chapter:Verse", "Book Chapter:Verse"],
  "lifeApplication": "Practical, compassionate guidance for modern believers to walk this out."
}`;

    // 1. Primary: Google Gemini API
    const geminiKey = this.getGeminiKey();
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            const parsed = JSON.parse(responseText);
            return {
              scripture,
              historicalContext: parsed.historicalContext,
              keyWordInsights: parsed.keyWordInsights || [],
              crossReferences: parsed.crossReferences || [],
              lifeApplication: parsed.lifeApplication,
              source: 'gemini',
            };
          }
        } else {
          this.logger.warn(`Gemini passage explainer HTTP ${res.status}. Falling back to OpenRouter...`);
        }
      } catch (err: any) {
        this.logger.warn(`Gemini API explanation failed: ${err.message}. Attempting OpenRouter fallback...`);
      }
    }

    // 2. Secondary Fallback: OpenRouter Free Models
    const openRouterText = await this.callOpenRouter(prompt);
    if (openRouterText) {
      try {
        const parsed = JSON.parse(openRouterText);
        return {
          scripture,
          historicalContext: parsed.historicalContext,
          keyWordInsights: parsed.keyWordInsights || [],
          crossReferences: parsed.crossReferences || [],
          lifeApplication: parsed.lifeApplication,
          source: 'openrouter',
        };
      } catch (err: any) {
        this.logger.warn(`Failed to parse OpenRouter JSON: ${err.message}. Proceeding to commentary.`);
      }
    }

    // 3. Tertiary Fallback: Curated Theological Commentary
    return {
      scripture,
      historicalContext: `This sacred passage from ${scripture} anchors the believer in God's covenant faithfulness and divine sovereignty. Historically given to guide God's people through both trial and triumph, it points directly to Christ's redeeming love.`,
      keyWordInsights: [
        {
          word: 'Grace / Hesed',
          originalLanguage: 'Hebrew / Greek',
          meaning: "God's unmerited, covenant-keeping lovingkindness that never runs dry.",
        },
      ],
      crossReferences: ['Romans 8:38-39', 'Philippians 4:6-7', 'Proverbs 3:5-6'],
      lifeApplication:
        'Meditate on this verse today by entrusting any lingering anxiety into the hands of Jesus, knowing He cares for you deeply and directs your steps.',
      source: 'theological_commentary',
    };
  }

  async summarizeSermon(title: string, transcript: string): Promise<SermonSummaryResponse> {
    const safeTranscript = (transcript || '').substring(0, 15000);
    const prompt = `Summarize the following sermon transcript titled "${title || 'Sunday Message'}":
"""
${safeTranscript}
"""

Respond ONLY with valid JSON in this exact structure:
{
  "coreThemes": ["Theme 1", "Theme 2"],
  "scripturesIdentified": ["Reference 1", "Reference 2"],
  "keyTakeaways": ["Point 1", "Point 2", "Point 3"],
  "discussionQuestions": ["Question 1 for small groups?", "Question 2?"],
  "personalActionStep": "One tangible faith step to take this week."
}`;

    // 1. Primary: Gemini API
    const geminiKey = this.getGeminiKey();
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            const parsed = JSON.parse(responseText);
            return {
              title: title || 'Sermon Summary',
              coreThemes: parsed.coreThemes || [],
              scripturesIdentified: parsed.scripturesIdentified || [],
              keyTakeaways: parsed.keyTakeaways || [],
              discussionQuestions: parsed.discussionQuestions || [],
              personalActionStep: parsed.personalActionStep || '',
              source: 'gemini',
            };
          }
        } else {
          this.logger.warn(`Gemini sermon summarizer HTTP ${res.status}. Falling back to OpenRouter...`);
        }
      } catch (err: any) {
        this.logger.warn(`Gemini sermon summarizer failed: ${err.message}. Attempting OpenRouter fallback...`);
      }
    }

    // 2. Secondary Fallback: OpenRouter Free Models
    const openRouterText = await this.callOpenRouter(prompt);
    if (openRouterText) {
      try {
        const parsed = JSON.parse(openRouterText);
        return {
          title: title || 'Sermon Summary',
          coreThemes: parsed.coreThemes || [],
          scripturesIdentified: parsed.scripturesIdentified || [],
          keyTakeaways: parsed.keyTakeaways || [],
          discussionQuestions: parsed.discussionQuestions || [],
          personalActionStep: parsed.personalActionStep || '',
          source: 'openrouter',
        };
      } catch (err: any) {
        this.logger.warn(`OpenRouter sermon parse failed: ${err.message}. Proceeding to commentary.`);
      }
    }

    // 3. Tertiary Fallback: Theological Commentary
    return {
      title: title || 'Sermon Notes',
      coreThemes: ['Living by Faith', "Walking in God's Grace"],
      scripturesIdentified: ['James 1:22', 'Hebrews 11:1'],
      keyTakeaways: [
        'Hearing the Word must translate into active, loving obedience.',
        'Spiritual growth happens day by day as we fix our eyes on Christ.',
      ],
      discussionQuestions: [
        'How does this message challenge your daily devotional routine?',
        'In what area of your life is God calling you to step out in greater trust?',
      ],
      personalActionStep:
        'Commit to set aside 15 uninterrupted minutes each morning to pray and read scripture before checking your phone.',
      source: 'theological_commentary',
    };
  }
}
