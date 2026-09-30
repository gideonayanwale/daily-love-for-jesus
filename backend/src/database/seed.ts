import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';
import { eq } from 'drizzle-orm';

const fullSchema = { ...schema, ...relations };

// Connect using Neon or Supabase DB URL
const connectionString =
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/daily_love';

console.log('🌱 Starting database seed script...');
console.log(`📡 Target database connection: ${connectionString.split('@')[1] || 'local'}`);

const sql = postgres(connectionString, {
  ssl: connectionString.includes('neon.tech') || connectionString.includes('supabase.co') ? 'require' : undefined,
  max: 1,
});

const db = drizzle(sql, { schema: fullSchema });

// ─── 1. Canonical 66 Bible Books ─────────────────────────────────────────────
const BIBLE_BOOKS = [
  // Old Testament (39)
  { bookNumber: 1, name: 'Genesis', shortName: 'Gen', testament: 'old', genre: 'Law', chapters: 50, order: 1 },
  { bookNumber: 2, name: 'Exodus', shortName: 'Exo', testament: 'old', genre: 'Law', chapters: 40, order: 2 },
  { bookNumber: 3, name: 'Leviticus', shortName: 'Lev', testament: 'old', genre: 'Law', chapters: 27, order: 3 },
  { bookNumber: 4, name: 'Numbers', shortName: 'Num', testament: 'old', genre: 'Law', chapters: 36, order: 4 },
  { bookNumber: 5, name: 'Deuteronomy', shortName: 'Deu', testament: 'old', genre: 'Law', chapters: 34, order: 5 },
  { bookNumber: 6, name: 'Joshua', shortName: 'Jos', testament: 'old', genre: 'History', chapters: 24, order: 6 },
  { bookNumber: 7, name: 'Judges', shortName: 'Jdg', testament: 'old', genre: 'History', chapters: 21, order: 7 },
  { bookNumber: 8, name: 'Ruth', shortName: 'Rth', testament: 'old', genre: 'History', chapters: 4, order: 8 },
  { bookNumber: 9, name: '1 Samuel', shortName: '1Sa', testament: 'old', genre: 'History', chapters: 31, order: 9 },
  { bookNumber: 10, name: '2 Samuel', shortName: '2Sa', testament: 'old', genre: 'History', chapters: 24, order: 10 },
  { bookNumber: 11, name: '1 Kings', shortName: '1Ki', testament: 'old', genre: 'History', chapters: 22, order: 11 },
  { bookNumber: 12, name: '2 Kings', shortName: '2Ki', testament: 'old', genre: 'History', chapters: 25, order: 12 },
  { bookNumber: 13, name: '1 Chronicles', shortName: '1Ch', testament: 'old', genre: 'History', chapters: 29, order: 13 },
  { bookNumber: 14, name: '2 Chronicles', shortName: '2Ch', testament: 'old', genre: 'History', chapters: 36, order: 14 },
  { bookNumber: 15, name: 'Ezra', shortName: 'Ezr', testament: 'old', genre: 'History', chapters: 10, order: 15 },
  { bookNumber: 16, name: 'Nehemiah', shortName: 'Neh', testament: 'old', genre: 'History', chapters: 13, order: 16 },
  { bookNumber: 17, name: 'Esther', shortName: 'Est', testament: 'old', genre: 'History', chapters: 10, order: 17 },
  { bookNumber: 18, name: 'Job', shortName: 'Job', testament: 'old', genre: 'Poetry', chapters: 42, order: 18 },
  { bookNumber: 19, name: 'Psalms', shortName: 'Psa', testament: 'old', genre: 'Poetry', chapters: 150, order: 19 },
  { bookNumber: 20, name: 'Proverbs', shortName: 'Pro', testament: 'old', genre: 'Wisdom', chapters: 31, order: 20 },
  { bookNumber: 21, name: 'Ecclesiastes', shortName: 'Ecc', testament: 'old', genre: 'Wisdom', chapters: 12, order: 21 },
  { bookNumber: 22, name: 'Song of Solomon', shortName: 'Sng', testament: 'old', genre: 'Poetry', chapters: 8, order: 22 },
  { bookNumber: 23, name: 'Isaiah', shortName: 'Isa', testament: 'old', genre: 'Major Prophets', chapters: 66, order: 23 },
  { bookNumber: 24, name: 'Jeremiah', shortName: 'Jer', testament: 'old', genre: 'Major Prophets', chapters: 52, order: 24 },
  { bookNumber: 25, name: 'Lamentations', shortName: 'Lam', testament: 'old', genre: 'Poetry', chapters: 5, order: 25 },
  { bookNumber: 26, name: 'Ezekiel', shortName: 'Ezk', testament: 'old', genre: 'Major Prophets', chapters: 48, order: 26 },
  { bookNumber: 27, name: 'Daniel', shortName: 'Dan', testament: 'old', genre: 'Major Prophets', chapters: 12, order: 27 },
  { bookNumber: 28, name: 'Hosea', shortName: 'Hos', testament: 'old', genre: 'Minor Prophets', chapters: 14, order: 28 },
  { bookNumber: 29, name: 'Joel', shortName: 'Jol', testament: 'old', genre: 'Minor Prophets', chapters: 3, order: 29 },
  { bookNumber: 30, name: 'Amos', shortName: 'Amo', testament: 'old', genre: 'Minor Prophets', chapters: 9, order: 30 },
  { bookNumber: 31, name: 'Obadiah', shortName: 'Oba', testament: 'old', genre: 'Minor Prophets', chapters: 1, order: 31 },
  { bookNumber: 32, name: 'Jonah', shortName: 'Jon', testament: 'old', genre: 'Minor Prophets', chapters: 4, order: 32 },
  { bookNumber: 33, name: 'Micah', shortName: 'Mic', testament: 'old', genre: 'Minor Prophets', chapters: 7, order: 33 },
  { bookNumber: 34, name: 'Nahum', shortName: 'Nah', testament: 'old', genre: 'Minor Prophets', chapters: 3, order: 34 },
  { bookNumber: 35, name: 'Habakkuk', shortName: 'Hab', testament: 'old', genre: 'Minor Prophets', chapters: 3, order: 35 },
  { bookNumber: 36, name: 'Zephaniah', shortName: 'Zep', testament: 'old', genre: 'Minor Prophets', chapters: 3, order: 36 },
  { bookNumber: 37, name: 'Haggai', shortName: 'Hag', testament: 'old', genre: 'Minor Prophets', chapters: 2, order: 37 },
  { bookNumber: 38, name: 'Zechariah', shortName: 'Zec', testament: 'old', genre: 'Minor Prophets', chapters: 14, order: 38 },
  { bookNumber: 39, name: 'Malachi', shortName: 'Mal', testament: 'old', genre: 'Minor Prophets', chapters: 4, order: 39 },
  // New Testament (27)
  { bookNumber: 40, name: 'Matthew', shortName: 'Mat', testament: 'new', genre: 'Gospel', chapters: 28, order: 40 },
  { bookNumber: 41, name: 'Mark', shortName: 'Mrk', testament: 'new', genre: 'Gospel', chapters: 16, order: 41 },
  { bookNumber: 42, name: 'Luke', shortName: 'Luk', testament: 'new', genre: 'Gospel', chapters: 24, order: 42 },
  { bookNumber: 43, name: 'John', shortName: 'Jhn', testament: 'new', genre: 'Gospel', chapters: 21, order: 43 },
  { bookNumber: 44, name: 'Acts', shortName: 'Act', testament: 'new', genre: 'History', chapters: 28, order: 44 },
  { bookNumber: 45, name: 'Romans', shortName: 'Rom', testament: 'new', genre: 'Epistle', chapters: 16, order: 45 },
  { bookNumber: 46, name: '1 Corinthians', shortName: '1Co', testament: 'new', genre: 'Epistle', chapters: 16, order: 46 },
  { bookNumber: 47, name: '2 Corinthians', shortName: '2Co', testament: 'new', genre: 'Epistle', chapters: 13, order: 47 },
  { bookNumber: 48, name: 'Galatians', shortName: 'Gal', testament: 'new', genre: 'Epistle', chapters: 6, order: 48 },
  { bookNumber: 49, name: 'Ephesians', shortName: 'Eph', testament: 'new', genre: 'Epistle', chapters: 6, order: 49 },
  { bookNumber: 50, name: 'Philippians', shortName: 'Php', testament: 'new', genre: 'Epistle', chapters: 4, order: 50 },
  { bookNumber: 51, name: 'Colossians', shortName: 'Col', testament: 'new', genre: 'Epistle', chapters: 4, order: 51 },
  { bookNumber: 52, name: '1 Thessalonians', shortName: '1Th', testament: 'new', genre: 'Epistle', chapters: 5, order: 52 },
  { bookNumber: 53, name: '2 Thessalonians', shortName: '2Th', testament: 'new', genre: 'Epistle', chapters: 3, order: 53 },
  { bookNumber: 54, name: '1 Timothy', shortName: '1Ti', testament: 'new', genre: 'Epistle', chapters: 6, order: 54 },
  { bookNumber: 55, name: '2 Timothy', shortName: '2Ti', testament: 'new', genre: 'Epistle', chapters: 4, order: 55 },
  { bookNumber: 56, name: 'Titus', shortName: 'Tit', testament: 'new', genre: 'Epistle', chapters: 3, order: 56 },
  { bookNumber: 57, name: 'Philemon', shortName: 'Phm', testament: 'new', genre: 'Epistle', chapters: 1, order: 57 },
  { bookNumber: 58, name: 'Hebrews', shortName: 'Heb', testament: 'new', genre: 'Epistle', chapters: 13, order: 58 },
  { bookNumber: 59, name: 'James', shortName: 'Jas', testament: 'new', genre: 'Epistle', chapters: 5, order: 59 },
  { bookNumber: 60, name: '1 Peter', shortName: '1Pe', testament: 'new', genre: 'Epistle', chapters: 5, order: 60 },
  { bookNumber: 61, name: '2 Peter', shortName: '2Pe', testament: 'new', genre: 'Epistle', chapters: 3, order: 61 },
  { bookNumber: 62, name: '1 John', shortName: '1Jn', testament: 'new', genre: 'Epistle', chapters: 5, order: 62 },
  { bookNumber: 63, name: '2 John', shortName: '2Jn', testament: 'new', genre: 'Epistle', chapters: 1, order: 63 },
  { bookNumber: 64, name: '3 John', shortName: '3Jn', testament: 'new', genre: 'Epistle', chapters: 1, order: 64 },
  { bookNumber: 65, name: 'Jude', shortName: 'Jud', testament: 'new', genre: 'Epistle', chapters: 1, order: 65 },
  { bookNumber: 66, name: 'Revelation', shortName: 'Rev', testament: 'new', genre: 'Prophecy', chapters: 22, order: 66 },
];

// ─── 2. Baptist Hymnal Classics ──────────────────────────────────────────────
const HYMNS = [
  {
    hymnNumber: 1,
    title: 'Amazing Grace',
    author: 'John Newton',
    meter: '8.6.8.6 (CM)',
    category: 'Praise & Thanksgiving',
    lyrics: `1. Amazing grace! how sweet the sound
That saved a wretch like me!
I once was lost, but now am found,
Was blind, but now I see.

2. 'Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear
The hour I first believed!

3. Through many dangers, toils and snares
I have already come;
'Tis grace hath brought me safe thus far,
And grace will lead me home.

4. When we've been there ten thousand years,
Bright shining as the sun,
We've no less days to sing God's praise
Than when we'd first begun.`,
  },
  {
    hymnNumber: 2,
    title: 'Great Is Thy Faithfulness',
    author: 'Thomas O. Chisholm',
    meter: '11.10.11.10 with Refrain',
    category: 'Faith & Trust',
    lyrics: `1. Great is Thy faithfulness, O God my Father,
There is no shadow of turning with Thee;
Thou changest not, Thy compassions, they fail not;
As Thou hast been Thou forever wilt be.

Refrain:
Great is Thy faithfulness! Great is Thy faithfulness!
Morning by morning new mercies I see;
All I have needed Thy hand hath provided—
Great is Thy faithfulness, Lord, unto me!

2. Summer and winter, and springtime and harvest,
Sun, moon and stars in their courses above,
Join with all nature in manifold witness
To Thy great faithfulness, mercy and love.

3. Pardon for sin and a peace that endureth,
Thine own dear presence to cheer and to guide;
Strength for today and bright hope for tomorrow,
Blessings all mine, with ten thousand beside!`,
  },
  {
    hymnNumber: 3,
    title: 'Blessed Assurance',
    author: 'Fanny J. Crosby',
    meter: '9.10.9.9 with Refrain',
    category: 'Assurance & Joy',
    lyrics: `1. Blessed assurance, Jesus is mine!
O what a foretaste of glory divine!
Heir of salvation, purchase of God,
Born of His Spirit, washed in His blood.

Refrain:
This is my story, this is my song,
Praising my Savior all the day long;
This is my story, this is my song,
Praising my Savior all the day long.

2. Perfect submission, perfect delight,
Visions of rapture now burst on my sight;
Angels descending bring from above
Echoes of mercy, whispers of love.

3. Perfect submission, all is at rest;
I in my Savior am happy and blest,
Watching and waiting, looking above,
Filled with His goodness, lost in His love.`,
  },
  {
    hymnNumber: 4,
    title: 'How Great Thou Art',
    author: 'Stuart K. Hine',
    meter: '11.10.11.10 with Refrain',
    category: 'Adoration & Worship',
    lyrics: `1. O Lord my God, when I in awesome wonder
Consider all the worlds Thy hands have made,
I see the stars, I hear the rolling thunder,
Thy power throughout the universe displayed.

Refrain:
Then sings my soul, my Savior God, to Thee:
How great Thou art! How great Thou art!
Then sings my soul, my Savior God, to Thee:
How great Thou art! How great Thou art!

2. And when I think that God, His Son not sparing,
Sent Him to die, I scarce can take it in;
That on the cross, my burden gladly bearing,
He bled and died to take away my sin.

3. When Christ shall come, with shout of acclamation,
And take me home, what joy shall fill my heart!
Then I shall bow in humble adoration,
And there proclaim: "My God, how great Thou art!"`,
  },
];

// ─── 3. Inaugural Sample Devotionals ──────────────────────────────────────────
const DEVOTIONALS = [
  {
    title: 'Walking in the Light of His Unfailing Love',
    scripture: 'Psalm 36:7',
    scriptureText: 'How priceless is your unfailing love, O God! People take refuge in the shadow of your wings.',
    body: `Beloved of God, the love of Jesus is not an abstract doctrine or a distant theological concept; it is the very breath of our spiritual existence. In times of uncertainty, sorrow, or trial, the enemy seeks to convince us that we are isolated and forgotten. But the Word of God reminds us that His love is unfailing, steadfast, and eternal.

When you wake each morning, consciously anchor your soul in this truth: you are deeply loved by the Creator of heaven and earth. His love is your high tower, your refuge in the storm, and your peace that surpasses all human understanding.

Let this love overflow through your words today. Show patience where there is frustration, kindness where there is bitterness, and faith where there is doubt. You are an ambassador of His matchless grace.`,
    reflection: 'What worries can you surrender today into the gentle, capable hands of Jesus?',
    prayer: 'Lord Jesus, thank You for Your unfailing love that never gives up on me. Help me to dwell securely in Your presence today and to be a living vessel of Your grace and compassion to everyone I meet. In Jesus\' name, Amen.',
    author: 'Love Fellowship Christian International',
    source: 'manual' as const,
    devotionalDate: new Date(),
  },
  {
    title: 'Strength for the Weary Soul',
    scripture: 'Isaiah 40:31',
    scriptureText: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
    body: `Human strength is finite. Even the most energetic and determined will eventually stumble and grow weary if they rely solely on their own resources. But the strength that comes from waiting on the Lord is infinite, supernatural, and inexhaustible.

Waiting on the Lord is not passive idleness; it is an active posture of expectant faith, prayer, and quiet trust. As we spend time in His Word and worship, He exchanges our weakness for His divine vigor.`,
    reflection: 'Where in your life are you currently trying to operate in your own strength rather than His?',
    prayer: 'Heavenly Father, I confess that I often tire when trying to manage life on my own. Today, I turn my eyes to You. Fill me with Your Holy Spirit and renew my strength as I place my hope entirely in You. Amen.',
    author: 'Love Fellowship Christian International',
    source: 'manual' as const,
    devotionalDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  },
];

async function seed() {
  try {
    // 1. Seed Books
    console.log('📖 Seeding 66 Bible books...');
    for (const book of BIBLE_BOOKS) {
      await db
        .insert(schema.bibleBooks)
        .values(book)
        .onConflictDoUpdate({
          target: schema.bibleBooks.bookNumber,
          set: {
            name: book.name,
            shortName: book.shortName,
            testament: book.testament,
            genre: book.genre,
            chapters: book.chapters,
            order: book.order,
          },
        });
    }
    console.log('✅ 66 Bible books seeded successfully!');

    // 2. Seed Hymns
    console.log('🎵 Seeding Baptist Hymns...');
    for (const hymn of HYMNS) {
      const stanzas = [{ number: 1, text: hymn.lyrics }];
      await db
        .insert(schema.hymns)
        .values({
          hymnNumber: hymn.hymnNumber,
          title: hymn.title,
          author: hymn.author,
          meter: hymn.meter,
          category: hymn.category,
          stanzas,
        })
        .onConflictDoUpdate({
          target: schema.hymns.hymnNumber,
          set: {
            title: hymn.title,
            author: hymn.author,
            meter: hymn.meter,
            category: hymn.category,
            stanzas,
          },
        });
    }
    console.log('✅ Baptist Hymns seeded successfully!');

    // 3. Seed Devotionals
    console.log('☀️ Seeding Daily Devotionals...');
    for (const dev of DEVOTIONALS) {
      await db
        .insert(schema.devotionals)
        .values(dev);
    }
    console.log('✅ Daily Devotionals seeded successfully!');

    console.log('🎉 Database seeding completed with 0 errors!');
  } catch (err: any) {
    console.error(`❌ Seeding failed: ${err.message}`);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
