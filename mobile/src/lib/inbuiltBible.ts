import { MobileVerse } from './bibleApi';

/**
 * Pre-bundled Inbuilt Default Bible (King James Version)
 * Enables instant mobile reading with 0 network calls required upon first installation.
 */
const INBUILT_CHAPTERS: Record<string, Array<{ verse: number; text: string }>> = {
  // Genesis 1 (Creation)
  '1:1': [
    { verse: 1, text: 'In the beginning God created the heaven and the earth.' },
    { verse: 2, text: 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.' },
    { verse: 3, text: 'And God said, Let there be light: and there was light.' },
    { verse: 4, text: 'And God saw the light, that it was good: and God divided the light from the darkness.' },
    { verse: 5, text: 'And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.' },
    { verse: 26, text: 'And God said, Let us make man in our image, after our likeness: and let them have dominion over the fish of the sea, and over the fowl of the air, and over the cattle, and over all the earth, and over every creeping thing that creepeth upon the earth.' },
    { verse: 27, text: 'So God created man in his own image, in the image of God created he him; male and female created he them.' },
    { verse: 31, text: 'And God saw every thing that he had made, and, behold, it was very good. And the evening and the morning were the sixth day.' }
  ],
  // Psalm 23 (The Lord is My Shepherd)
  '19:23': [
    { verse: 1, text: 'The LORD is my shepherd; I shall not want.' },
    { verse: 2, text: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.' },
    { verse: 3, text: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.' },
    { verse: 4, text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.' },
    { verse: 5, text: 'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.' },
    { verse: 6, text: 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.' }
  ],
  // Psalm 91 (Abiding in the Shadow of the Almighty)
  '19:91': [
    { verse: 1, text: 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.' },
    { verse: 2, text: 'I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust.' },
    { verse: 3, text: 'Surely he shall deliver thee from the snare of the fowler, and from the noisome pestilence.' },
    { verse: 4, text: 'He shall cover thee with his feathers, and under his wings shalt thou trust: his truth shall be thy shield and buckler.' },
    { verse: 5, text: 'Thou shalt not be afraid for the terror by night; nor for the arrow that flieth by day;' },
    { verse: 11, text: 'For he shall give his angels charge over thee, to keep thee in all thy ways.' },
    { verse: 12, text: 'They shall bear thee up in their hands, lest thou dash thy foot against a stone.' }
  ],
  // Proverbs 3 (Trust in the LORD)
  '20:3': [
    { verse: 1, text: 'My son, forget not my law; but let thine heart keep my commandments:' },
    { verse: 2, text: 'For length of days, and long life, and peace, shall they add to thee.' },
    { verse: 5, text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
    { verse: 6, text: 'In all thy ways acknowledge him, and he shall direct thy paths.' },
    { verse: 7, text: 'Be not wise in thine own eyes: fear the LORD, and depart from evil.' },
    { verse: 8, text: 'It shall be health to thy navel, and marrow to thy bones.' }
  ],
  // Matthew 5 (The Beatitudes)
  '40:5': [
    { verse: 1, text: 'And seeing the multitudes, he went up into a mountain: and when he was set, his disciples came unto him:' },
    { verse: 2, text: 'And he opened his mouth, and taught them, saying,' },
    { verse: 3, text: 'Blessed are the poor in spirit: for theirs is the kingdom of heaven.' },
    { verse: 4, text: 'Blessed are they that mourn: for they shall be comforted.' },
    { verse: 5, text: 'Blessed are the meek: for they shall inherit the earth.' },
    { verse: 6, text: 'Blessed are they which do hunger and thirst after righteousness: for they shall be filled.' },
    { verse: 7, text: 'Blessed are the merciful: for they shall obtain mercy.' },
    { verse: 8, text: 'Blessed are the pure in heart: for they shall see God.' },
    { verse: 9, text: 'Blessed are the peacemakers: for they shall be called the children of God.' },
    { verse: 14, text: 'Ye are the light of the world. A city that is set on an hill cannot be hid.' },
    { verse: 16, text: 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.' }
  ],
  // John 1 (The Word Became Flesh)
  '43:1': [
    { verse: 1, text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
    { verse: 2, text: 'The same was in the beginning with God.' },
    { verse: 3, text: 'All things were made by him; and without him was not any thing made that was made.' },
    { verse: 4, text: 'In him was life; and the life was the light of men.' },
    { verse: 5, text: 'And the light shineth in darkness; and the darkness comprehended it not.' },
    { verse: 12, text: 'But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name:' },
    { verse: 14, text: 'And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth.' }
  ],
  // John 3 (God So Loved the World)
  '43:3': [
    { verse: 1, text: 'There was a man of the Pharisees, named Nicodemus, a ruler of the Jews:' },
    { verse: 2, text: 'The same came to Jesus by night, and said unto him, Rabbi, we know that thou art a teacher come from God: for no man can do these miracles that thou doest, except God be with him.' },
    { verse: 3, text: 'Jesus answered and said unto him, Verily, verily, I say unto thee, Except a man be born again, he cannot see the kingdom of God.' },
    { verse: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
    { verse: 17, text: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.' }
  ],
  // Romans 8 (Life in the Spirit)
  '45:8': [
    { verse: 1, text: 'There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.' },
    { verse: 2, text: 'For the law of the Spirit of life in Christ Jesus hath made me free from the law of sin and death.' },
    { verse: 28, text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
    { verse: 31, text: 'What shall we then say to these things? If God be for us, who can be against us?' },
    { verse: 38, text: 'For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come,' },
    { verse: 39, text: 'Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.' }
  ],
  // 1 Corinthians 13 (The Love Chapter)
  '46:13': [
    { verse: 1, text: 'Though I speak with the tongues of men and of angels, and have not charity, I am become as sounding brass, or a tinkling cymbal.' },
    { verse: 4, text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,' },
    { verse: 7, text: 'Beareth all things, believeth all things, hopeth all things, endureth all things.' },
    { verse: 8, text: 'Charity never faileth: but whether there be prophecies, they shall fail; whether there be tongues, they shall cease; whether there be knowledge, it shall vanish away.' },
    { verse: 13, text: 'And now abideth faith, hope, charity, these three; but the greatest of these is charity.' }
  ],
  // Revelation 21 (A New Heaven and a New Earth)
  '66:21': [
    { verse: 1, text: 'And I saw a new heaven and a new earth: for the first heaven and the first earth were passed away; and there was no more sea.' },
    { verse: 2, text: 'And I John saw the holy city, new Jerusalem, coming down from God out of heaven, prepared as a bride adorned for her husband.' },
    { verse: 3, text: 'And I heard a great voice out of heaven saying, Behold, the tabernacle of God is with men, and he will dwell with them, and they shall be his people, and God himself shall be with them, and be their God.' },
    { verse: 4, text: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.' },
    { verse: 5, text: 'And he that sat upon the throne said, Behold, I make all things new. And he said unto me, Write: for these words are true and faithful.' }
  ]
};

/**
 * Retrieve inbuilt chapter verses
 */
export function getInbuiltChapter(bookNumber: number, chapter: number): MobileVerse[] | null {
  const key = `${bookNumber}:${chapter}`;
  const verses = INBUILT_CHAPTERS[key];
  if (!verses) return null;

  return verses.map((v, idx) => ({
    id: bookNumber * 100000 + chapter * 1000 + v.verse,
    bookNumber,
    chapter,
    verse: v.verse,
    text: v.text,
    translation: 'KJV',
  }));
}

/**
 * Check if a chapter is pre-bundled in the inbuilt default Bible
 */
export function hasInbuiltChapter(bookNumber: number, chapter: number): boolean {
  return `${bookNumber}:${chapter}` in INBUILT_CHAPTERS;
}
