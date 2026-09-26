import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  Users,
  KeyRound,
  GraduationCap,
  Megaphone,
  BookOpen,
  Flame,
  CheckCircle2,
  Calendar,
  Send,
  Download,
  Bell,
  Check,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

/** Reads the Supabase session access token from localStorage for REST API calls */
function getAuthHeader(): Record<string, string> {
  try {
    const session = localStorage.getItem('daily_love_supabase_session')
    if (session) {
      const token = JSON.parse(session)?.access_token
      if (token) return { Authorization: `Bearer ${token}` }
    }
  } catch {}
  return {}
}


export default function Community() {
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [teacherTab, setTeacherTab] = useState<'overview' | 'roster' | 'attendance' | 'report'>('overview')

  // Announcement composer state
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal')
  const [isPosting, setIsPosting] = useState(false)

  // Roster, Attendance & Report States
  const [roster, setRoster] = useState<any[]>([])
  const [isRosterLoading, setIsRosterLoading] = useState(false)
  const [attendanceRecordsState, setAttendanceRecordsState] = useState<Record<string, 'present' | 'absent' | 'excused' | 'late'>>({})
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState<any | null>(null)
  const [isReportLoading, setIsReportLoading] = useState(false)

  // tRPC queries
  const { data: myGroups, refetch: refetchGroups, isLoading: groupsLoading } =
    trpc.community.myGroups.useQuery()

  // Auto-select first group
  const activeGroupId = selectedGroupId ?? myGroups?.[0]?.id ?? null

  const { data: groupDetails, refetch: refetchDetails } =
    trpc.community.groupDetails.useQuery(
      { groupId: activeGroupId! },
      { enabled: !!activeGroupId }
    )

  const { data: teacherOverview } = trpc.community.teacherOverview.useQuery(
    { groupId: activeGroupId! },
    {
      enabled:
        !!activeGroupId &&
        (groupDetails?.myRole === 'teacher' || groupDetails?.myRole === 'assistant_teacher'),
    }
  )

  const isTeacher =
    groupDetails?.myRole === 'teacher' || groupDetails?.myRole === 'assistant_teacher'

  // Fetch Teacher Roster
  const fetchRoster = async () => {
    if (!activeGroupId || !isTeacher) return
    setIsRosterLoading(true)
    try {
      const res = await fetch(`/api/dashboard/roster?groupId=${activeGroupId}`, {
        headers: { ...getAuthHeader() },
      })
      const data = await res.json()
      if (res.ok) {
        setRoster(data.students || [])
        // Initialize attendance defaults
        const initialAttendance: Record<string, any> = {}
        data.students?.forEach((s: any) => {
          initialAttendance[s.userId] = 'present'
        })
        setAttendanceRecordsState(initialAttendance)
      }
    } catch {
      // Ignored
    } finally {
      setIsRosterLoading(false)
    }
  }

  // Fetch Weekly Report
  const fetchWeeklyReport = async () => {
    if (!activeGroupId || !isTeacher) return
    setIsReportLoading(true)
    try {
      const res = await fetch(`/api/dashboard/reports/weekly?groupId=${activeGroupId}`, {
        headers: { ...getAuthHeader() },
      })
      const data = await res.json()
      if (res.ok) {
        setWeeklyReport(data)
      }
    } catch {
      // Ignored
    } finally {
      setIsReportLoading(false)
    }
  }

  useEffect(() => {
    if (activeGroupId && isTeacher) {
      if (teacherTab === 'roster' || teacherTab === 'attendance') {
        fetchRoster()
      } else if (teacherTab === 'report') {
        fetchWeeklyReport()
      }
    }
  }, [activeGroupId, teacherTab, isTeacher])

  // Join group using 6-digit code
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setIsJoining(true)
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join group')
      }

      toast.success(data.message || `Joined ${data.groupName}!`)
      setInviteCode('')
      refetchGroups()
      setSelectedGroupId(data.groupId)
    } catch (err: any) {
      toast.error(err.message || 'Could not join class. Check the invite code.')
    } finally {
      setIsJoining(false)
    }
  }

  // Publish announcement
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeGroupId || !announcementTitle.trim() || !announcementBody.trim()) return

    setIsPosting(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          groupId: activeGroupId,
          title: announcementTitle.trim(),
          body: announcementBody.trim(),
          priority,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to post announcement')
      }

      toast.success('Announcement published & push notification dispatched!')
      setAnnouncementTitle('')
      setAnnouncementBody('')
      refetchDetails()
    } catch (err: any) {
      toast.error(err.message || 'Error posting announcement.')
    } finally {
      setIsPosting(false)
    }
  }

  // Generate / refresh invite code
  const handleGenerateCode = async () => {
    if (!activeGroupId) return
    try {
      const res = await fetch('/api/groups/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ groupId: activeGroupId, regenerate: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`New invite code generated: ${data.inviteCode}`)
      refetchGroups()
      refetchDetails()
    } catch (err: any) {
      toast.error(err.message || 'Could not generate code')
    }
  }

  // Send gentle reminder to student
  const handleSendReminder = async (studentId: string, studentName: string) => {
    if (!activeGroupId) return
    try {
      const res = await fetch('/api/teacher/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          groupId: activeGroupId,
          studentId,
          actionType: 'reminder_sent',
        }),
      })
      if (!res.ok) throw new Error('Failed to send reminder')
      toast.success(`Gentle reading reminder sent to ${studentName}`)
    } catch (err: any) {
      toast.error('Could not send reminder')
    }
  }

  // Save attendance session and records
  const handleSaveAttendance = async () => {
    if (!activeGroupId || roster.length === 0) return
    setIsSavingAttendance(true)

    try {
      // 1. Create session
      const sessionRes = await fetch('/api/attendance/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          groupId: activeGroupId,
          title: `Sunday School - ${format(new Date(), 'MMM d, yyyy')}`,
          sessionType: 'sunday_school',
        }),
      })
      const sessionData = await sessionRes.json()
      if (!sessionRes.ok) throw new Error(sessionData.error || 'Failed to create session')

      // 2. Record students
      const records = Object.entries(attendanceRecordsState).map(([userId, status]) => ({
        userId,
        status,
      }))

      const recordRes = await fetch('/api/attendance/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          sessionId: sessionData.session.id,
          records,
        }),
      })

      if (!recordRes.ok) throw new Error('Failed to save attendance marks')

      toast.success(`Attendance saved for ${records.length} students!`)
    } catch (err: any) {
      toast.error(err.message || 'Error recording attendance')
    } finally {
      setIsSavingAttendance(false)
    }
  }

  // Download CSV report
  const handleDownloadCsv = () => {
    if (!weeklyReport?.csvExport) return
    const blob = new Blob([weeklyReport.csvExport], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${groupDetails?.group.name || 'class'}_weekly_report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV report downloaded!')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            Community & Sunday School
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Bible reading tracking, discipleship & announcements
          </p>
        </div>
      </div>

      {/* Join Group with 6-Digit Code */}
      <section className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-4 h-4 text-amber-100" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-100">
            Join Class or Small Group
          </h2>
        </div>
        <p className="text-xs text-white/90 mb-3">
          Enter the 6-digit invite code provided by your Sunday School teacher or fellowship leader.
        </p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. LF8421"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            maxLength={10}
            className="flex-1 px-3 py-2 rounded-xl bg-white text-gray-900 font-mono font-bold tracking-wider placeholder:font-sans placeholder:font-normal placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            type="submit"
            disabled={isJoining || !inviteCode.trim()}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            {isJoining ? 'Joining...' : 'Join Class'}
          </button>
        </form>
      </section>

      {/* Group Selector Pills */}
      {myGroups && myGroups.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            My Enrolled Classes
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {myGroups.map((g) => {
              const isActive = g.id === activeGroupId
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGroupId(g.id)
                    setTeacherTab('overview')
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-400'
                  }`}
                >
                  {g.role === 'teacher' ? (
                    <GraduationCap className="w-3.5 h-3.5 text-amber-200" />
                  ) : (
                    <Users className="w-3.5 h-3.5 opacity-60" />
                  )}
                  {g.name}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase ${
                      isActive ? 'bg-amber-700/60 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {g.role}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Group Content View */}
      {activeGroupId && groupDetails?.group ? (
        <div className="space-y-6">
          {/* Group Header Card */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                  {groupDetails.group.category}
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">
                  {groupDetails.group.name}
                </h2>
                <p className="text-xs text-gray-500">{groupDetails.group.description}</p>
              </div>

              {/* Class Invite Code Badge */}
              <div className="text-right">
                <span className="text-[10px] font-medium text-gray-400">Class Code</span>
                <p className="text-sm font-mono font-bold text-amber-700 bg-amber-100/60 px-2.5 py-1 rounded-lg">
                  {groupDetails.group.inviteCode || 'N/A'}
                </p>
                {isTeacher && (
                  <button
                    onClick={handleGenerateCode}
                    className="text-[10px] text-amber-600 hover:underline mt-0.5 block"
                  >
                    New Code
                  </button>
                )}
              </div>
            </div>

            {/* Teacher Workstation Tabs */}
            {isTeacher && (
              <div className="pt-2 border-t border-gray-100 flex gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setTeacherTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    teacherTab === 'overview'
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Overview & Reading
                </button>
                <button
                  onClick={() => setTeacherTab('roster')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    teacherTab === 'roster'
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Student Streaks ({roster.length || teacherOverview?.totalStudents || 0})
                </button>
                <button
                  onClick={() => setTeacherTab('attendance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    teacherTab === 'attendance'
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Take Attendance
                </button>
                <button
                  onClick={() => setTeacherTab('report')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    teacherTab === 'report'
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Weekly Report
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: OVERVIEW & READING ASSIGNMENTS */}
          {teacherTab === 'overview' && (
            <>
              {/* Active Reading Assignments */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  Weekly Reading Assignments
                </h3>

                {groupDetails.assignments && groupDetails.assignments.length > 0 ? (
                  <div className="space-y-2">
                    {groupDetails.assignments.map((assignment: any) => (
                      <div
                        key={assignment.id}
                        onClick={() =>
                          navigate(`/bible/${assignment.bookNumber}/${assignment.chapter}`)
                        }
                        className="bg-white rounded-xl p-3.5 border border-gray-200/80 hover:border-amber-400 transition-all cursor-pointer shadow-sm flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-gray-800">{assignment.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {assignment.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}</span>
                          </div>
                        </div>

                        <button className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600">
                          Read Passage
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400">No active reading assignments for this class.</p>
                  </div>
                )}
              </section>

              {/* Teacher: Announcement Composer */}
              {isTeacher && (
                <section className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-amber-600" />
                      Post Class Announcement
                    </h3>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                      Dispatches Push
                    </span>
                  </div>

                  <form onSubmit={handlePostAnnouncement} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Announcement title"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <textarea
                      placeholder="Type your message to all class members..."
                      value={announcementBody}
                      onChange={(e) => setAnnouncementBody(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <select
                        value={priority}
                        onChange={(e: any) => setPriority(e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-700 bg-white"
                      >
                        <option value="normal">Priority: Normal</option>
                        <option value="high">Priority: High</option>
                        <option value="urgent">Priority: Urgent</option>
                      </select>

                      <button
                        type="submit"
                        disabled={isPosting || !announcementTitle.trim() || !announcementBody.trim()}
                        className="px-4 py-1.5 bg-amber-600 text-white font-semibold text-xs rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        {isPosting ? 'Sending...' : 'Broadcast'}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* Announcements Feed */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  Class Announcements Feed
                </h3>

                {groupDetails.announcements && groupDetails.announcements.length > 0 ? (
                  <div className="space-y-2.5">
                    {groupDetails.announcements.map((ann: any) => (
                      <div
                        key={ann.id}
                        className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">{ann.title}</h4>
                          {ann.priority === 'urgent' && (
                            <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{ann.body}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[10px] text-gray-400">
                          <span>Posted by {ann.authorName || 'Teacher'}</span>
                          <span>{format(new Date(ann.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400">No announcements posted yet.</p>
                  </div>
                )}
              </section>
            </>
          )}

          {/* TAB 2: STUDENT ROSTER & STREAKS */}
          {teacherTab === 'roster' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Student Reading Streaks & Activity
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {roster.length} enrolled students
                </span>
              </div>

              {isRosterLoading ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading student roster...</div>
              ) : roster.length > 0 ? (
                <div className="space-y-2">
                  {roster.map((student: any) => (
                    <div
                      key={student.userId}
                      className="bg-white rounded-xl p-3 border border-gray-200 shadow-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          {student.name ? student.name.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{student.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                            <span className="flex items-center text-amber-600 font-bold">
                              <Flame className="w-3 h-3 mr-0.5 fill-amber-500" />
                              {student.currentStreakDays}d streak
                            </span>
                            <span>•</span>
                            <span>{student.totalChaptersRead} ch. read</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReminder(student.userId, student.name)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1"
                          title="Send gentle push reminder"
                        >
                          <Bell className="w-3 h-3" />
                          Remind
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center text-xs text-gray-400">
                  No students have joined this class yet. Share code <span className="font-mono font-bold text-amber-600">{groupDetails.group.inviteCode}</span>!
                </div>
              )}
            </section>
          )}

          {/* TAB 3: TAKE ATTENDANCE */}
          {teacherTab === 'attendance' && (
            <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Today's Class Attendance
                  </h3>
                  <p className="text-[11px] text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <button
                  onClick={handleSaveAttendance}
                  disabled={isSavingAttendance || roster.length === 0}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSavingAttendance ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>

              {roster.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {roster.map((student: any) => {
                    const status = attendanceRecordsState[student.userId] || 'present'
                    return (
                      <div key={student.userId} className="py-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-800">{student.name}</span>
                        <div className="flex gap-1">
                          {(['present', 'absent', 'late', 'excused'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() =>
                                setAttendanceRecordsState((prev) => ({
                                  ...prev,
                                  [student.userId]: s,
                                }))
                              }
                              className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize transition-all ${
                                status === s
                                  ? s === 'present'
                                    ? 'bg-emerald-500 text-white'
                                    : s === 'absent'
                                    ? 'bg-rose-500 text-white'
                                    : s === 'late'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">No enrolled students to mark.</p>
              )}
            </section>
          )}

          {/* TAB 4: WEEKLY REPORT & CSV EXPORT */}
          {teacherTab === 'report' && (
            <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    Weekly Participation Report
                  </h3>
                  <p className="text-[11px] text-gray-500">Last 7 Days Activity Analysis</p>
                </div>
                <button
                  onClick={handleDownloadCsv}
                  disabled={!weeklyReport?.csvExport}
                  className="px-3.5 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>

              {isReportLoading ? (
                <div className="py-12 text-center text-xs text-gray-400">Calculating report...</div>
              ) : weeklyReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-semibold text-gray-500">Active Rate</span>
                      <p className="text-lg font-bold text-amber-700">
                        {weeklyReport?.metrics?.readingCompletionRate ?? 0}%
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-semibold text-emerald-600">Chapters Read</span>
                      <p className="text-lg font-bold text-emerald-700">
                        {weeklyReport?.metrics?.totalChaptersCompleted ?? 0}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-semibold text-blue-600">Trend (vs Prev Wk)</span>
                      <p className="text-lg font-bold text-blue-700">
                        {(weeklyReport?.metrics?.chaptersTrendPercent ?? 0) >= 0 ? '+' : ''}
                        {weeklyReport?.metrics?.chaptersTrendPercent ?? 0}%
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                    <div className="bg-gray-50 px-3 py-2 font-bold text-gray-700 flex justify-between">
                      <span>Student</span>
                      <span>Chapters Read (7d)</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {weeklyReport.students?.map((s: any) => (
                        <div key={s.userId} className="px-3 py-2 flex items-center justify-between">
                          <span className="text-gray-800 font-medium">{s.name}</span>
                          <span className={`font-bold ${s.chaptersReadThisWeek > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {s.chaptersReadThisWeek} ch ({s.timeSpentMinutes} mins)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          )}
        </div>
      ) : !groupsLoading && (!myGroups || myGroups.length === 0) ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-gray-200 shadow-sm space-y-3">
          <Users className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">You haven't joined a class yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Ask your Sunday School teacher for their 6-digit class code to start tracking your reading and stay connected with your fellowship.
          </p>
        </div>
      ) : null}
    </div>
  )
}
