import { getDb } from "../api/queries/connection";
import { bibleBooks, bibleVerses, hymns } from "./schema";
import { sql } from "drizzle-orm";

async function check() {
  const db = getDb();

  try {
    const books = await db.select().from(bibleBooks);
    console.log("Existing books:", books.length);
    if (books.length > 0) {
      console.log("First book:", books[0]);
    }
  } catch (e: any) {
    console.log("Books table error:", e.message);
  }

  try {
    const verses = await db.select({ count: sql<number>`count(*)` }).from(bibleVerses);
    console.log("Existing verses:", verses[0]?.count ?? 0);
  } catch (e: any) {
    console.log("Verses table error:", e.message);
  }

  try {
    const hymnsData = await db.select({ count: sql<number>`count(*)` }).from(hymns);
    console.log("Existing hymns:", hymnsData[0]?.count ?? 0);
  } catch (e: any) {
    console.log("Hymns table error:", e.message);
  }
}

check().catch(console.error);
