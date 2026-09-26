/**
 * Synthetic Seed Data Generator for Love Fellowship Christian International (LFCI)
 * Run: npx tsx db/seed-community.ts
 */
import { getDb } from "../api/queries/connection";
import {
  communities,
  communityMembers,
  groups,
  groupMembers,
  announcements,
  readingAssignments,
  readingLogs,
  users,
} from "./schema";
import { eq } from "drizzle-orm";

export async function seedCommunityData() {
  const db = getDb();
  console.log("🌱 Seeding Love Fellowship Christian International Community Data...");

  // 1. Seed or find Community Admin
  const adminId = "00000000-0000-4000-a000-000000000001";
  await db
    .insert(users)
    .values({
      id: adminId,
      name: "Pastor David Adeleke",
      email: "pastor.david@lovefellowship.org",
      role: "admin",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
    })
    .onConflictDoNothing();

  // 2. Create Love Fellowship Christian International
  const communitySlug = "love-fellowship-christian-international";
  let community = await db.query.communities.findFirst({
    where: eq(communities.slug, communitySlug),
  });

  if (!community) {
    const [created] = await db
      .insert(communities)
      .values({
        name: "Love Fellowship Christian International",
        slug: communitySlug,
        description: "A Christ-centered fellowship dedicated to spiritual growth, biblical discipleship, and fervent love.",
        location: "Lagos, Nigeria",
        timezone: "Africa/Lagos",
        contactEmail: "info@lovefellowship.org",
        status: "active",
        createdBy: adminId,
        brandingSettings: {
          primaryColor: "#D97706",
          accentColor: "#F59E0B",
          welcomeMessage: "Welcome to our spiritual family. Let us grow together in God's Word.",
        },
      })
      .returning();
    community = created;
  }

  console.log(`✓ Community ready: ${community.name} (${community.id})`);

  // 3. Create Sunday School and Discipleship Groups
  const groupDefs = [
    {
      name: "Adult Sunday School",
      slug: "adult-sunday-school",
      category: "Sunday School",
      description: "In-depth Bible study and theological discussion for adult believers.",
      inviteCode: "LF8421",
    },
    {
      name: "Youth Sunday School",
      slug: "youth-sunday-school",
      category: "Sunday School",
      description: "Dynamic scripture discussion, peer accountability, and practical discipleship for youth.",
      inviteCode: "LF9032",
    },
    {
      name: "Young Adults Fellowship",
      slug: "young-adults",
      category: "Bible Study",
      description: "Career, relationship, and faith foundations grounded in Scripture.",
      inviteCode: "LF5510",
    },
    {
      name: "Teens Discipleship Class",
      slug: "teens-discipleship",
      category: "Discipleship",
      description: "Interactive lessons and daily Bible reading challenges for teenagers.",
      inviteCode: "LF7743",
    },
  ];

  for (const def of groupDefs) {
    let group = await db.query.groups.findFirst({
      where: eq(groups.inviteCode, def.inviteCode),
    });

    if (!group) {
      const [newGroup] = await db
        .insert(groups)
        .values({
          communityId: community.id,
          name: def.name,
          slug: def.slug,
          category: def.category,
          description: def.description,
          inviteCode: def.inviteCode,
          privacySetting: "public",
          status: "active",
          createdBy: adminId,
        })
        .returning();
      group = newGroup;

      // Seed a sample announcement
      await db.insert(announcements).values({
        groupId: group.id,
        communityId: community.id,
        authorId: adminId,
        title: `Welcome to ${def.name}!`,
        body: `Welcome everyone to this month's Bible reading journey. Please check our weekly reading plan and complete your reflections before Sunday morning.`,
        priority: "normal",
        announcementType: "general",
        status: "published",
      });

      // Seed a sample reading assignment (Matthew 5)
      await db.insert(readingAssignments).values({
        groupId: group.id,
        communityId: community.id,
        title: "Week 1: The Sermon on the Mount",
        description: "Read Matthew Chapter 5 and consider Christ's teaching on the Beatitudes.",
        bookNumber: 40, // Matthew
        chapter: 5,
        startVerse: 1,
        endVerse: 48,
        dueDate: new Date(Date.now() + 7 * 86400000), // Next Sunday
        isRequired: true,
        reflectionPrompt: "Which of the Beatitudes challenges your daily walk the most, and how can you live it out this week?",
        status: "published",
        createdBy: adminId,
      });

      console.log(`  ✓ Created group: ${group.name} (Code: ${group.inviteCode})`);
    }
  }

  console.log("✅ Synthetic community seed completed successfully.");
}

// Auto-run if executed directly
if (process.argv[1]?.includes("seed-community")) {
  seedCommunityData().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
