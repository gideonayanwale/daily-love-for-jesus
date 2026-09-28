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
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Community')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('api')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

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
    @Body() body: { inviteCode: string },
  ) {
    return this.communityService.joinGroup(userId, body.inviteCode);
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

  // ─── 7. Record Attendance ──────────────────────────────────────────────────
  @Post('attendance/record')
  @ApiOperation({ summary: 'Mark student attendance statuses (present, absent, excused, late)' })
  async recordAttendance(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      sessionId: number;
      records: Array<{
        userId: string;
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
}
