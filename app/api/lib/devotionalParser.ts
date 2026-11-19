import { eq } from "drizzle-orm";
import { telegramMessages, devotionals } from "@db/schema";

// ─── Section markers recognised in Telegram devotional messages ───────────────
const SECTION_MARKERS: Array<{ pattern: RegExp; field: string }> = [
  { pattern: /^declaration of faith\s*:/i,   field: "declarationOfFaith" },
  { pattern: /^be your brother'?s keeper\s*:/i, field: "brothersKeeper" },
  { pattern: /^daily bible reading\s*:/i,    field: "dailyBibleReading" },
  { pattern: /^daily capsule\s*:/i,          field: "dailyCapsule" },
  { pattern: /^other info\s*:/i,             field: "otherInfo" },
  { pattern: /^topic\s*:/i,                  field: "topic" },
  { pattern: /^prayer\s*:/i,                 field: "prayer" },
  { pattern: /^let us pray\s*:/i,            field: "prayer" },
];

function matchSectionMarker(line: string): string | null {
  for (const { pattern, field } of SECTION_MARKERS) {
    if (pattern.test(line.trim())) return field;
  }
  return null;
}

function stripMarkerLabel(line: string): string {
  return line.replace(/^[^:]+:\s*/, "").trim();
}

export async function parseAndCreateDevotional(
  db: any,
  telegramMessageId: number,
  text: string
): Promise<number | null> {
  try {
    const lines = text.split("\n");
    const nonEmptyLines = lines.filter((l) => l.trim());
    if (nonEmptyLines.length < 2) return null;

    const title = nonEmptyLines[0].substring(0, 200);

    const sections: Record<string, string[]> = {};
    let currentField: string | null = null;
    let currentLines: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const field = matchSectionMarker(lines[i]);
      if (field !== null) {
        if (currentField !== null) {
          sections[currentField] = currentLines;
        }
        currentField = field;
        const inline = stripMarkerLabel(lines[i]);
        currentLines = inline ? [inline] : [];
      } else {
        if (currentField !== null) {
          currentLines.push(lines[i]);
        }
      }
    }
    if (currentField !== null) {
      sections[currentField] = currentLines;
    }

    function extractSection(field: string, maxLen: number): string | null {
      const raw = sections[field];
      if (!raw) return null;
      const value = raw.join("\n").trim();
      return value ? value.substring(0, maxLen) : null;
    }

    const scripturePattern = /(\d?\s?[A-Za-z]+\s?\d+[:\d\-]+)/;
    let scripture = "";
    let scriptureText = "";

    for (let i = 0; i < nonEmptyLines.length; i++) {
      const match = nonEmptyLines[i].match(scripturePattern);
      if (match) {
        scripture = match[0];
        let j = i + 1;
        const scriptureLines: string[] = [];
        while (
          j < nonEmptyLines.length &&
          !nonEmptyLines[j].match(/^(Reflection|Mediation|Prayer|Thought|Body)/i) &&
          matchSectionMarker(nonEmptyLines[j]) === null
        ) {
          scriptureLines.push(nonEmptyLines[j]);
          j++;
        }
        scriptureText = scriptureLines.join("\n").substring(0, 1000);
        break;
      }
    }

    const bodyText = text.substring(title.length).trim();
    let firstMarkerIndex = bodyText.length;
    for (const { pattern } of SECTION_MARKERS) {
      const lineIdx = bodyText.split("\n").findIndex((l) => pattern.test(l.trim()));
      if (lineIdx !== -1) {
        const charIdx = bodyText.split("\n").slice(0, lineIdx).join("\n").length;
        if (charIdx < firstMarkerIndex) firstMarkerIndex = charIdx;
      }
    }
    const body =
      bodyText.substring(0, firstMarkerIndex).trim().substring(0, 2000) ||
      bodyText.substring(0, 2000);

    const result = await db
      .insert(devotionals)
      .values({
        title,
        scripture: scripture || null,
        scriptureText: scriptureText || null,
        body,
        prayer:             extractSection("prayer", 3000),
        topic:              extractSection("topic", 500),
        declarationOfFaith: extractSection("declarationOfFaith", 5000),
        dailyCapsule:       extractSection("dailyCapsule", 5000),
        brothersKeeper:     extractSection("brothersKeeper", 5000),
        dailyBibleReading:  extractSection("dailyBibleReading", 5000),
        otherInfo:          extractSection("otherInfo", 5000),
        source: "telegram",
        telegramMessageId,
        devotionalDate: new Date(),
        isPublished: false,
      })
      .$returningId();

    await db
      .update(telegramMessages)
      .set({ processed: true, devotionalId: result[0].id })
      .where(eq(telegramMessages.id, telegramMessageId));

    return result[0].id;
  } catch (error) {
    console.error("Failed to create devotional from message:", error);
    return null;
  }
}
