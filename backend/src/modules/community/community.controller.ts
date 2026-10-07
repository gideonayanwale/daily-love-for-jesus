import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService, ReadingLogItemDto } from './community.service';
import { ChatArchiveService } from './archive.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Community')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('api')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly archiveService: ChatArchiveService,
  ) {}

  // ─── 1. Group Invite Code ──────────────────────────────────────────────────
  @Post('groups/invite')
  @ApiOperation({ summary: 'Generate or regenerate 6-digit class invite code' })
  async generateInvite(
    @CurrentUser('id') userId: string,
    @Body() body: { groupId: number; regenerate?: boolean },
  ) {
    return this.communityService.generateInvite(userId, body.groupId, body.regenerate);
  }

  // ─── 2. Join Group ─────────────────────────────────────────────────────────
  @Post('groups/join')
  @ApiOperation({ summary: 'Join Sunday School class using 6-digit invite code' })
  async joinGroup(
    @CurrentUser('id') userId: string,
    @Body() body: { inviteCode: string; whatsappNumber?: string },
  ) {
    return this.communityService.joinGroup(userId, body.inviteCode, body.whatsappNumber);
  }

  // ─── 3. Offline Reading Tracking Sync ──────────────────────────────────────
  @Post('tracking/sync')
  @ApiOperation({ summary: 'Batch offline reading log synchronization with idempotency' })
  async syncTracking(
    @CurrentUser('id') userId: string,
    @Body() body: { logs: ReadingLogItemDto[] },
  ) {
    return this.communityService.syncTracking(userId, body.logs || []);
  }

  // ─── 4. Teacher Roster with Streaks ────────────────────────────────────────
  @Get('dashboard/roster')
  @ApiOperation({ summary: 'Get class roster, total chapters, reading minutes, and streaks' })
  @ApiQuery({ name: 'groupId', required: true, type: Number })
  async getRoster(
    @CurrentUser('id') userId: string,
    @Query('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.communityService.getRoster(userId, groupId);
  }

  // ─── 5. Create Announcement with Push Notification ─────────────────────────
  @Post('announcements')
  @ApiOperation({ summary: 'Create class announcement and dispatch push notification' })
  async createAnnouncement(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      groupId: number;
      title: string;
      body: string;
      priority?: 'normal' | 'high' | 'urgent';
      announcementType?: 'general' | 'assignment' | 'event' | 'reminder';
    },
  ) {
    return this.communityService.createAnnouncement(userId, body);
  }

  // ─── 6. Create Attendance Session ──────────────────────────────────────────
  @Post('attendance/session')
  @ApiOperation({ summary: 'Create new class attendance session' })
  async createAttendanceSession(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      groupId: number;
      title?: string;
      sessionType?: 'sunday_school' | 'bible_study' | 'prayer_meeting' | 'event';
      sessionDate?: string;
    },
  ) {
    return this.communityService.createAttendanceSession(userId, body);
  }

  // ─── 7. Record Attendance (Supports Registered Students & Guest Attendees) ─
  @Post('attendance/record')
  @ApiOperation({ summary: 'Mark student attendance statuses (supports guest attendees)' })
  async recordAttendance(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      sessionId: number;
      records: Array<{
        userId?: string;
        guestName?: string;
        guestPhone?: string;
        isGuest?: boolean;
        status: 'present' | 'absent' | 'excused' | 'late';
        notes?: string;
      }>;
    },
  ) {
    return this.communityService.recordAttendance(userId, body.sessionId, body.records || []);
  }

  // ─── 8. Weekly Report & CSV Export ─────────────────────────────────────────
  @Get('dashboard/reports/weekly')
  @ApiOperation({ summary: 'Get weekly reading report, metrics, and CSV export string' })
  @ApiQuery({ name: 'groupId', required: true, type: Number })
  async getWeeklyReport(
    @CurrentUser('id') userId: string,
    @Query('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.communityService.getWeeklyReport(userId, groupId);
  }

  // ─── 9. Teacher Followup ───────────────────────────────────────────────────
  @Post('teacher/followup')
  @ApiOperation({ summary: 'Send gentle reminder push notification or record private note' })
  async teacherFollowup(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      groupId: number;
      studentId: string;
      actionType: 'reminder_sent' | 'note_added';
      message?: string;
    },
  ) {
    return this.communityService.teacherFollowup(userId, body);
  }

  // ─── Community queries ─────────────────────────────────────────────────────
  @Get('community/my-communities')
  @ApiOperation({ summary: 'List communities current user belongs to' })
  async getMyCommunities(@CurrentUser('id') userId: string) {
    return this.communityService.getMyCommunities(userId);
  }

  @Get('community/my-groups')
  @ApiOperation({ summary: 'List groups/classes current user belongs to' })
  async getMyGroups(@CurrentUser('id') userId: string) {
    return this.communityService.getMyGroups(userId);
  }

  @Get('community/groups/:id')
  @ApiOperation({ summary: 'Get group details with announcements and active assignments' })
  async getGroupDetails(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) groupId: number,
  ) {
    return this.communityService.getGroupDetails(userId, groupId);
  }

  @Get('community/teacher-overview')
  @ApiOperation({ summary: 'Get teacher dashboard overview for class' })
  @ApiQuery({ name: 'groupId', required: true, type: Number })
  async getTeacherOverview(
    @CurrentUser('id') userId: string,
    @Query('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.communityService.getTeacherOverview(userId, groupId);
  }

  @Post('community/push-token')
  @ApiOperation({ summary: 'Register Expo / FCM push token for current user' })
  async registerPushToken(
    @CurrentUser('id') userId: string,
    @Body() body: { token: string; platform?: 'expo' | 'fcm' | 'apns' },
  ) {
    return this.communityService.registerPushToken(userId, body.token, body.platform);
  }

  // ─── 10. Role Hierarchy & Elevation ────────────────────────────────────────
  @Get('admin/users')
  @ApiOperation({ summary: 'Elevated admin directory access to all users and admins' })
  async getAllUsersAndAdmins(@CurrentUser('id') userId: string) {
    return this.communityService.getAllUsersAndAdmins(userId);
  }

  @Post('admin/elevate')
  @ApiOperation({ summary: 'Elevate or modify user admin status' })
  async elevateUser(
    @CurrentUser('id') userId: string,
    @Body() body: { targetUserId: string; targetRole: 'elevated_admin' | 'admin' | 'user' },
  ) {
    return this.communityService.elevateUser(userId, body.targetUserId, body.targetRole);
  }

  // ─── 11. Custom Fellowships & Approval ─────────────────────────────────────
  @Post('communities/custom')
  @ApiOperation({ summary: 'Create custom fellowship/community (requires approval if not admin)' })
  async createCustomCommunity(
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; description?: string; location?: string; category?: string },
  ) {
    return this.communityService.createCustomCommunity(userId, body);
  }

  @Get('communities/pending')
  @ApiOperation({ summary: 'List communities pending approval by elevated admin' })
  async getPendingCommunities(@CurrentUser('id') userId: string) {
    return this.communityService.getPendingCommunities(userId);
  }

  @Post('communities/:id/approve')
  @ApiOperation({ summary: 'Approve or reject custom fellowship by elevated admin' })
  async approveCommunity(
    @CurrentUser('id') userId: string,
    @Param('id') communityId: string,
    @Body() body: { approve: boolean },
  ) {
    return this.communityService.approveCommunity(userId, communityId, body.approve);
  }

  @Get('communities/:id/members')
  @ApiOperation({ summary: 'List members belonging to a specific community' })
  async getCommunityMembers(
    @CurrentUser('id') userId: string,
    @Param('id') communityId: string,
  ) {
    return this.communityService.getCommunityMembers(userId, communityId);
  }

  // ─── 12. Slack-like Chat & Direct Messages ─────────────────────────────────
  @Post('chat/messages')
  @ApiOperation({ summary: 'Send message in general channel, leadership group, community, group, or DM' })
  async sendChatMessage(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      channelType: 'general' | 'community' | 'group' | 'dm' | 'leadership';
      communityId?: string;
      groupId?: number;
      receiverId?: string;
      content: string;
      mediaUrl?: string;
      isAnnouncement?: boolean;
      isEncrypted?: boolean;
    },
  ) {
    return this.communityService.sendChatMessage(userId, body);
  }

  @Get('chat/messages')
  @ApiOperation({ summary: 'List chat messages for channel, community, group, leadership, or DM' })
  @ApiQuery({ name: 'channelType', required: true, enum: ['general', 'community', 'group', 'dm', 'leadership'] })
  async listChatMessages(
    @CurrentUser('id') userId: string,
    @Query('channelType') channelType: 'general' | 'community' | 'group' | 'dm' | 'leadership',
    @Query('communityId') communityId?: string,
    @Query('groupId') groupId?: string,
    @Query('receiverId') receiverId?: string,
  ) {
    return this.communityService.listChatMessages(userId, channelType, {
      communityId,
      groupId: groupId ? parseInt(groupId, 10) : undefined,
      receiverId,
    });
  }

  @Post('chat/messages/:id/moderate')
  @ApiOperation({ summary: 'Moderate or retain message (pin, unpin, keep permanently, or delete)' })
  async moderateMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) messageId: number,
    @Body() body: { action: 'pin' | 'unpin' | 'delete' | 'keep' | 'unkeep' },
  ) {
    return this.communityService.moderateMessage(userId, messageId, body.action);
  }

  @Post('groups/:id/admin-only')
  @ApiOperation({ summary: 'Toggle WhatsApp-like admin-only posting controls for group' })
  async toggleGroupAdminOnlyPosting(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) groupId: number,
    @Body() body: { onlyAdminsCanPost: boolean },
  ) {
    return this.communityService.toggleGroupAdminOnlyPosting(userId, groupId, body.onlyAdminsCanPost);
  }

  // ─── 13. Cloudinary Backup & 7-Day Auto-Purge ──────────────────────────────
  @Post('communities/:id/chat/backup-to-cloudinary')
  @ApiOperation({ summary: 'Superadmin: sync and archive community chat messages into Cloudinary' })
  async backupCommunityChatToCloudinary(
    @CurrentUser('id') userId: string,
    @Param('id') communityId: string,
  ) {
    return this.communityService.backupCommunityChatToCloudinary(userId, communityId);
  }

  @Post('chat/cleanup-expired')
  @ApiOperation({ summary: 'Purge messages older than 7 days from active community chats' })
  async cleanupExpiredChatMessages() {
    return this.communityService.cleanupExpiredChatMessages();
  }

  // ─── 14. Dedicated Secondary Supabase Bulk Cold Storage Archives ─────────────
  @Post('chat/archives/snapshot')
  @ApiOperation({ summary: 'Create bulk snapshot of messages to Secondary Supabase cold storage' })
  async createChatSnapshot(
    @CurrentUser('id') userId: string,
    @Body() body: { communityId?: string; groupId?: number; channelType?: string; snapshotAll?: boolean },
  ) {
    if (body.snapshotAll) {
      return this.archiveService.snapshotAllActiveCommunities();
    }
    return this.archiveService.createBulkSnapshot({
      communityId: body.communityId,
      groupId: body.groupId,
      channelType: body.channelType,
    });
  }

  @Get('chat/archives')
  @ApiOperation({ summary: 'List available cloud archive snapshots from Secondary Supabase storage' })
  async listChatArchives(
    @Query('communityId') communityId?: string,
    @Query('groupId') groupId?: string,
  ) {
    const parsedGroupId = groupId ? parseInt(groupId, 10) : undefined;
    return this.archiveService.listAvailableSnapshots({
      communityId,
      groupId: Number.isFinite(parsedGroupId) ? parsedGroupId : undefined,
    });
  }

  @Get('chat/archives/:id/download')
  @ApiOperation({ summary: 'Download and restore chat messages from cloud archive snapshot' })
  async downloadChatArchive(
    @Param('id', ParseIntPipe) snapshotId: number,
  ) {
    return this.archiveService.downloadSnapshot(snapshotId);
  }
}
