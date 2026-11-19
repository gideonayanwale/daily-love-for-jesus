import { getDb } from "../api/queries/connection";
import { bibleBooks, bibleVerses, hymns } from "./schema";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedBibleBooks() {
  const db = await getDb();
  console.log("Seeding Bible books...");

  const rawData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data/bible_books.json"), "utf-8")
  );

  const booksData = rawData.map((b: any) => ({
    bookNumber: b.book_number,
    name: b.name,
    shortName: b.short_name,
    testament: b.testament,
    genre: b.genre,
    chapters: b.chapters,
    order: b.order,
  }));

  await db.insert(bibleBooks).values(booksData).onConflictDoNothing();
  console.log(`Seeded ${booksData.length} Bible books (skipped duplicates)`);
}

async function seedBibleVerses() {
  const db = await getDb();
  console.log("Seeding Bible verses (this may take a few minutes)...");

  const fileStream = fs.readFileSync(
    path.join(__dirname, "data/kjv_verses.jsonl"),
    "utf-8"
  );
  const lines = fileStream.split("\n").filter((l) => l.trim());

  const batchSize = 500;
  let inserted = 0;

  const allBooks = await db.select().from(bibleBooks);
  const bookIdMap = new Map<number, number>();
  for (const book of allBooks) {
    bookIdMap.set(book.bookNumber, book.id);
  }

  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines
      .slice(i, i + batchSize)
      .map((line: string) => {
        const v = JSON.parse(line);
        return {
          bookId: bookIdMap.get(v.book_number) ?? 1,
          bookNumber: v.book_number,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text,
        };
      });

    await db.insert(bibleVerses).values(batch).onConflictDoNothing();
    inserted += batch.length;

    if (inserted % 5000 === 0) {
      console.log(`  ... inserted ${inserted} verses`);
    }
  }

  console.log(`Seeded ${inserted} Bible verses`);
}

async function seedHymns() {
  const db = await getDb();
  console.log("Seeding hymns...");

  const rawData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data/hymns.json"), "utf-8")
  );

  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < rawData.length; i += batchSize) {
    const batch = rawData.slice(i, i + batchSize).map((h: any) => ({
      hymnNumber: h.hymn_number,
      title: h.title,
      author: h.author,
      composer: h.composer,
      meter: h.meter,
      key: h.key,
      stanzas: JSON.stringify(h.stanzas),
      chorus: h.chorus,
      category: h.category,
    }));

    await db.insert(hymns).values(batch).onConflictDoNothing();
    inserted += batch.length;
  }

  console.log(`Seeded ${inserted} hymns`);
}

async function main() {
  console.log("Starting database seed...\n");

  try {
    await seedBibleBooks();
    await seedBibleVerses();
    await seedHymns();

    console.log("\nSeed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
