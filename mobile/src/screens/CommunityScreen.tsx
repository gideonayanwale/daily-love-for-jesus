import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavBar } from '../components/NavBar';
import GlassCard from '../components/GlassCard';
import {
  mobileCommunityApi,
  MobileGroup,
  MobileAnnouncement,
  MobileStudent,
} from '../lib/api-client';
import { encryptMessage, decryptMessage, isEncryptedMessage } from '../lib/e2ee';
import {
  getMobileLocalChatMessages,
  saveMobileLocalChatMessages,
  queueMobileOfflineMessage,
  syncMobileOfflineMessages,
} from '../lib/chatStorage';

export function CommunityScreen() {
  const navigation = useNavigation<any>();
  const [inviteCode, setInviteCode] = useState('');
  const [userWhatsApp, setUserWhatsApp] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [groups, setGroups] = useState<MobileGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<MobileGroup | null>(null);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Teacher & Member tools state
  const [activeTab, setActiveTab] = useState<'announcements' | 'chat' | 'roster' | 'attendance'>('announcements');
  const [roster, setRoster] = useState<MobileStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [guestList, setGuestList] = useState<Array<{ id: string; name: string; phone?: string; status: 'present' | 'absent' | 'late' }>>([]);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatChannel, setChatChannel] = useState<'general' | 'leadership' | 'group'>('group');
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isRestoringCloudArchive, setIsRestoringCloudArchive] = useState(false);

  // New announcement modal/form
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

  const isTeacher =
    groupDetails?.myRole === 'teacher' || groupDetails?.myRole === 'assistant_teacher';

  const getMobileChannelKey = () => {
    return `${chatChannel}_${selectedGroup?.id || 'all'}`;
  };

  // Instant local cache load
  useEffect(() => {
    if (activeTab === 'chat') {
      const key = getMobileChannelKey();
      getMobileLocalChatMessages(key).then((cached) => {
        if (cached && cached.length > 0) {
          setChatMessages(cached);
        }
      });
    }
  }, [activeTab, chatChannel, selectedGroup?.id]);

  async function loadChatMessages() {
    const key = getMobileChannelKey();
    try {
      // Sync any offline queued messages first
      await syncMobileOfflineMessages(async (payload) => {
        return mobileCommunityApi.sendChatMessage(payload);
      });

      const msgs = await mobileCommunityApi.listChatMessages(chatChannel, {
        groupId: chatChannel === 'group' ? selectedGroup?.id : undefined,
      });

      // Decrypt any encrypted messages
      const decrypted = await Promise.all(
        (msgs || []).map(async (m) => {
          if (m.isEncrypted || isEncryptedMessage(m.content)) {
            const encKey = selectedGroup ? String(selectedGroup.id) : 'community-default-key';
            const plain = await decryptMessage(m.content, encKey);
            return { ...m, decryptedContent: plain };
          }
          return { ...m, decryptedContent: m.content };
        })
      );

      await saveMobileLocalChatMessages(key, decrypted as any);
      setChatMessages(decrypted);
    } catch {
      // Offline fallback: keep existing messages from local storage
    }
  }

  useEffect(() => {
    if (activeTab === 'chat') {
      loadChatMessages();
      const interval = setInterval(loadChatMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, chatChannel, selectedGroup?.id]);

  const handleSendChatMessage = async () => {
    if (!chatInputText.trim()) return;
    setIsSendingMessage(true);
    const key = getMobileChannelKey();
    const shouldEncrypt = chatChannel === 'group';
    const encKey = selectedGroup ? String(selectedGroup.id) : 'community-default-key';
    const textToSend = chatInputText.trim();

    try {
      const finalContent = shouldEncrypt
        ? await encryptMessage(textToSend, encKey)
        : textToSend;

      await mobileCommunityApi.sendChatMessage({
        channelType: chatChannel,
        groupId: chatChannel === 'group' ? selectedGroup?.id : undefined,
        content: finalContent,
        isEncrypted: shouldEncrypt,
      });
      setChatInputText('');
      loadChatMessages();
    } catch (err: any) {
      // Fallback: Queue offline and save to local storage
      try {
        await queueMobileOfflineMessage({
          channelType: chatChannel,
          groupId: chatChannel === 'group' ? selectedGroup?.id : undefined,
          content: textToSend,
          isEncrypted: shouldEncrypt,
        });

        const offlineItem = {
          id: Date.now(),
          channelType: chatChannel,
          groupId: chatChannel === 'group' ? selectedGroup?.id : undefined,
          senderId: 'me',
          content: textToSend,
          decryptedContent: textToSend,
          isEncrypted: shouldEncrypt,
          isPinned: false,
          isKept: false,
          isAnnouncement: false,
          createdAt: new Date().toISOString(),
          senderName: 'You',
          senderAvatar: null,
          senderRole: isTeacher ? 'admin' : 'user',
          isOfflineQueued: true,
        };

        const updated = [...chatMessages, offlineItem];
        setChatMessages(updated);
        await saveMobileLocalChatMessages(key, updated as any);
        setChatInputText('');
        Alert.alert('Offline Mode', 'Message saved locally and will send when connection is restored.');
      } catch {
        Alert.alert('Error', err.message || 'Could not send message');
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleModerateChatMessage = async (
    messageId: number,
    action: 'pin' | 'unpin' | 'delete' | 'keep' | 'unkeep',
  ) => {
    try {
      await mobileCommunityApi.moderateChatMessage(messageId, action);
      const labels: Record<string, string> = {
        keep: 'Message kept permanently (saved from 7-day auto-purge).',
        unkeep: 'Message removed from kept messages.',
        pin: 'Message pinned.',
        unpin: 'Message unpinned.',
        delete: 'Message deleted.',
      };
      Alert.alert('Success', labels[action] || 'Updated message');
      loadChatMessages();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed');
    }
  };

  const handleRestoreMobileArchive = async () => {
    setIsRestoringCloudArchive(true);
    try {
      const archives = await mobileCommunityApi.listChatArchives({
        groupId: chatChannel === 'group' ? selectedGroup?.id : undefined,
      });

      if (!archives || archives.length === 0) {
        Alert.alert('No Archives', 'No secondary cloud archives found for this channel yet.');
        return;
      }

      const latest = archives[0];
      const data = await mobileCommunityApi.downloadChatArchive(latest.id);

      const decrypted = await Promise.all(
        (data.messages || []).map(async (m: any) => {
          if (m.isEncrypted || isEncryptedMessage(m.content)) {
            const encKey = selectedGroup ? String(selectedGroup.id) : 'community-default-key';
            const plain = await decryptMessage(m.content, encKey);
            return { ...m, decryptedContent: plain };
          }
          return { ...m, decryptedContent: m.content };
        })
      );

      const key = getMobileChannelKey();
      await saveMobileLocalChatMessages(key, decrypted as any);
      setChatMessages(decrypted);
      Alert.alert(
        'Archive Restored',
        `Restored ${decrypted.length} messages from Secondary Cloud Storage (${latest.archiveDate}) into local storage!`,
      );
    } catch (err: any) {
      Alert.alert('Restore Failed', err.message || 'Could not restore archive');
    } finally {
      setIsRestoringCloudArchive(false);
    }
  };

  const handleCreateMobileSnapshot = async () => {
    try {
      const res = await mobileCommunityApi.createChatArchiveSnapshot({
        groupId: chatChannel === 'group' ? selectedGroup?.id : undefined,
        channelType: chatChannel,
      });
      Alert.alert('Cloud Snapshot', `Archived ${res.messageCount || 0} messages to Secondary Supabase Cold Storage!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Snapshot failed');
    }
  };

  useEffect(() => {
    loadMyGroups();
  }, []);

  async function loadMyGroups() {
    setLoading(true);
    try {
      const myGroups = await mobileCommunityApi.getMyGroups();
      setGroups(myGroups || []);
      if (myGroups && myGroups.length > 0) {
        setSelectedGroup(myGroups[0]);
        loadGroupDetails(myGroups[0].id);
      }
    } catch (err: any) {
      console.warn('[CommunityScreen] Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupDetails(groupId: number) {
    try {
      const details = await mobileCommunityApi.getGroupDetails(groupId);
      setGroupDetails(details);
      if (details?.myRole === 'teacher' || details?.myRole === 'assistant_teacher') {
        loadRoster(groupId);
      }
    } catch (err: any) {
      console.warn('[CommunityScreen] Error fetching group details:', err);
    }
  }

  async function loadRoster(groupId: number) {
    setRosterLoading(true);
    try {
      const data = await mobileCommunityApi.getRoster(groupId);
      setRoster(data.students || []);
      const initial: Record<string, 'present' | 'absent' | 'late'> = {};
      data.students?.forEach((s) => {
        initial[s.userId] = 'present';
      });
      setAttendanceState(initial);
    } catch (err: any) {
      console.warn('[CommunityScreen] Error loading roster:', err);
    } finally {
      setRosterLoading(false);
    }
  }

  const handleJoinClass = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Required', 'Please enter a 6-digit class code (e.g. LF8421).');
      return;
    }

    setIsJoining(true);
    try {
      const res = await mobileCommunityApi.joinGroup(
        inviteCode.trim().toUpperCase(),
        userWhatsApp.trim() || undefined
      );
      Alert.alert('Success 🎉', `You have joined "${res.group?.name || 'the class'}"!`);
      setInviteCode('');
      loadMyGroups();
    } catch (err: any) {
      Alert.alert('Join Failed', err.message || 'Invalid or expired class code.');
    } finally {
      setIsJoining(false);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!newTitle.trim() || !newBody.trim() || !selectedGroup) {
      Alert.alert('Required', 'Please enter both title and announcement text.');
      return;
    }

    setIsPostingAnnouncement(true);
    try {
      await mobileCommunityApi.createAnnouncement(selectedGroup.id, newTitle.trim(), newBody.trim());
      Alert.alert('Success', 'Announcement posted and push notifications sent!');
      setNewTitle('');
      setNewBody('');
      setShowAnnouncementForm(false);
      loadGroupDetails(selectedGroup.id);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not post announcement.');
    } finally {
      setIsPostingAnnouncement(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedGroup || (roster.length === 0 && guestList.length === 0)) return;

    setIsSubmittingAttendance(true);
    try {
      const session = await mobileCommunityApi.createAttendanceSession(
        selectedGroup.id,
        `Session - ${new Date().toLocaleDateString()}`
      );
      const records = [
        ...roster.map((s) => ({
          userId: s.userId,
          status: attendanceState[s.userId] || 'present',
          isGuest: false,
        })),
        ...guestList.map((g) => ({
          guestName: g.name,
          guestPhone: g.phone || undefined,
          status: g.status,
          isGuest: true,
        })),
      ];

      await mobileCommunityApi.recordAttendance(session.id, records);
      Alert.alert(
        'Saved 📝',
        `Attendance recorded for ${records.length} attendees (${roster.length} students, ${guestList.length} visitors)!`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save attendance.');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900">
      <NavBar title="Sunday School & Fellowship" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ── 1. Join Class Code Card with WhatsApp Number ── */}
        <GlassCard title="Join Sunday School Class" subtitle="Enter class code and your WhatsApp number">
          <View className="space-y-2 mt-2">
            <TextInput
              placeholder="Class Code (e.g. LF8421)"
              placeholderTextColor="#94a3b8"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              className="bg-white/10 text-white rounded-xl px-4 py-2.5 border border-white/10 text-sm font-semibold tracking-wider"
            />
            <TextInput
              placeholder="Your WhatsApp Number (e.g. +234 801 234 5678)"
              placeholderTextColor="#94a3b8"
              value={userWhatsApp}
              onChangeText={setUserWhatsApp}
              keyboardType="phone-pad"
              className="bg-white/10 text-white rounded-xl px-4 py-2.5 border border-white/10 text-sm"
            />
            <TouchableOpacity
              onPress={handleJoinClass}
              disabled={isJoining}
              className="bg-amber-500 active:bg-amber-600 py-3 rounded-xl justify-center items-center mt-1"
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text className="text-slate-950 font-bold text-xs">Join Sunday School Class</Text>
              )}
            </TouchableOpacity>
            <Text className="text-white/40 text-[10px]">
              * Your WhatsApp number is automatically shared with your Sunday School teacher for class announcements.
            </Text>
          </View>
        </GlassCard>

        {/* ── 2. My Enrolled Classes Tabs ── */}
        {groups.length > 0 && (
          <View className="my-4">
            <Text className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
              My Classes & Fellowships
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => {
                    setSelectedGroup(g);
                    loadGroupDetails(g.id);
                  }}
                  className={`px-4 py-2.5 rounded-xl border flex-row items-center space-x-2 ${
                    selectedGroup?.id === g.id
                      ? 'bg-amber-500 border-amber-400'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs ${
                      selectedGroup?.id === g.id ? 'text-slate-950' : 'text-white'
                    }`}
                  >
                    {g.name}
                  </Text>
                  <View
                    className={`px-1.5 py-0.5 rounded-full ${
                      selectedGroup?.id === g.id ? 'bg-slate-950/20' : 'bg-white/10'
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-extrabold uppercase ${
                        selectedGroup?.id === g.id ? 'text-slate-950' : 'text-white/60'
                      }`}
                    >
                      {g.role}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 3. Selected Group Details & Activity Workspace ── */}
        {selectedGroup ? (
          <View className="space-y-4">
            <GlassCard
              title={selectedGroup.name}
              subtitle={`${selectedGroup.category} • Code: ${selectedGroup.inviteCode || 'N/A'}`}
            >
              <Text className="text-white/70 text-xs mt-1">{selectedGroup.description}</Text>
            </GlassCard>

            {/* Navigation Tabs */}
            <View className="flex-row bg-white/5 p-1 rounded-xl border border-white/10">
              <TouchableOpacity
                onPress={() => setActiveTab('announcements')}
                className={`flex-1 py-2 items-center rounded-lg ${
                  activeTab === 'announcements' ? 'bg-amber-500' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeTab === 'announcements' ? 'text-slate-950' : 'text-white/60'
                  }`}
                >
                  Announcements
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('chat')}
                className={`flex-1 py-2 items-center rounded-lg ${
                  activeTab === 'chat' ? 'bg-amber-500' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeTab === 'chat' ? 'text-slate-950' : 'text-white/60'
                  }`}
                >
                  Chat & Group
                </Text>
              </TouchableOpacity>

              {isTeacher && (
                <>
                  <TouchableOpacity
                    onPress={() => setActiveTab('roster')}
                    className={`flex-1 py-2 items-center rounded-lg ${
                      activeTab === 'roster' ? 'bg-amber-500' : ''
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        activeTab === 'roster' ? 'text-slate-950' : 'text-white/60'
                      }`}
                    >
                      Roster ({roster.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('attendance')}
                    className={`flex-1 py-2 items-center rounded-lg ${
                      activeTab === 'attendance' ? 'bg-amber-500' : ''
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        activeTab === 'attendance' ? 'text-slate-950' : 'text-white/60'
                      }`}
                    >
                      Attendance
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* TAB: Announcements */}
            {activeTab === 'announcements' && (
              <View className="space-y-3">
                {isTeacher && (
                  <TouchableOpacity
                    onPress={() => setShowAnnouncementForm(!showAnnouncementForm)}
                    className="bg-amber-500/20 border border-amber-500/30 p-3 rounded-xl flex-row items-center justify-between"
                  >
                    <Text className="text-amber-400 font-bold text-xs">
                      {showAnnouncementForm ? '✕ Close Composer' : '+ Post New Class Announcement'}
                    </Text>
                  </TouchableOpacity>
                )}

                {showAnnouncementForm && isTeacher && (
                  <GlassCard title="Broadcast Announcement">
                    <View className="space-y-2 mt-2">
                      <TextInput
                        placeholder="Title (e.g. Next Week Memory Verse)"
                        placeholderTextColor="#94a3b8"
                        value={newTitle}
                        onChangeText={setNewTitle}
                        className="bg-white/10 text-white rounded-xl px-3 py-2 text-xs border border-white/10"
                      />
                      <TextInput
                        placeholder="Announcement message..."
                        placeholderTextColor="#94a3b8"
                        value={newBody}
                        onChangeText={setNewBody}
                        multiline
                        numberOfLines={3}
                        className="bg-white/10 text-white rounded-xl px-3 py-2 text-xs border border-white/10"
                      />
                      <TouchableOpacity
                        onPress={handlePostAnnouncement}
                        disabled={isPostingAnnouncement}
                        className="bg-amber-500 active:bg-amber-600 py-2.5 rounded-xl items-center mt-1"
                      >
                        {isPostingAnnouncement ? (
                          <ActivityIndicator size="small" color="#0f172a" />
                        ) : (
                          <Text className="text-slate-950 font-bold text-xs">Publish & Push</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                )}

                {groupDetails?.announcements && groupDetails.announcements.length > 0 ? (
                  groupDetails.announcements.map((a: MobileAnnouncement) => (
                    <View
                      key={a.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-white font-bold text-xs">{a.title}</Text>
                        {a.priority === 'urgent' && (
                          <View className="bg-rose-500/20 px-1.5 py-0.5 rounded">
                            <Text className="text-rose-400 text-[9px] font-bold">Urgent</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-white/70 text-xs leading-relaxed">{a.body}</Text>
                      <Text className="text-white/40 text-[9px] pt-1">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-white/50 text-xs italic text-center py-4">
                    No announcements in this class yet.
                  </Text>
                )}
              </View>
            )}

            {/* TAB: Chat & Groups */}
            {activeTab === 'chat' && (
              <View className="space-y-3">
                {/* Channel Selector */}
                <View className="flex-row gap-1.5">
                  <TouchableOpacity
                    onPress={() => setChatChannel('group')}
                    className={`px-3 py-1.5 rounded-xl border ${
                      chatChannel === 'group'
                        ? 'bg-amber-500 border-amber-400'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        chatChannel === 'group' ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      💬 Class Group
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setChatChannel('general')}
                    className={`px-3 py-1.5 rounded-xl border ${
                      chatChannel === 'general'
                        ? 'bg-amber-500 border-amber-400'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        chatChannel === 'general' ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      📢 General
                    </Text>
                  </TouchableOpacity>

                  {isTeacher && (
                    <TouchableOpacity
                      onPress={() => setChatChannel('leadership')}
                      className={`px-3 py-1.5 rounded-xl border ${
                        chatChannel === 'leadership'
                          ? 'bg-purple-600 border-purple-400'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          chatChannel === 'leadership' ? 'text-white' : 'text-purple-300'
                        }`}
                      >
                        👑 Leadership Council
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Secondary Cloud Archive & Notice Bar */}
                <View className="flex-row items-center justify-between bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                  <View className="flex-1 mr-2">
                    <Text className="text-emerald-300 text-[10px]">
                      🔒 E2EE • Messages auto-delete after 7d (unless kept/pinned)
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <TouchableOpacity
                      onPress={handleRestoreMobileArchive}
                      disabled={isRestoringCloudArchive}
                      className="bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 rounded-lg"
                    >
                      <Text className="text-emerald-300 text-[10px] font-bold">
                        {isRestoringCloudArchive ? 'Restoring...' : '📥 Restore Cloud'}
                      </Text>
                    </TouchableOpacity>

                    {isTeacher && (
                      <TouchableOpacity
                        onPress={handleCreateMobileSnapshot}
                        className="bg-indigo-950/70 border border-indigo-500/40 px-2 py-1 rounded-lg"
                      >
                        <Text className="text-indigo-300 text-[10px] font-bold">☁️ Snapshot</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Chat Feed */}
                <View className="bg-white/5 border border-white/10 rounded-2xl p-3 h-72">
                  {chatMessages.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                      <Text className="text-white/40 text-xs italic">
                        {chatChannel === 'leadership'
                          ? 'Leadership council forum for admins.'
                          : 'No messages yet. Send a message to start!'}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView className="flex-1 space-y-2">
                      {chatMessages.map((m) => (
                        <View key={m.id} className="bg-white/5 rounded-xl p-2.5 mb-1.5">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-1.5 flex-wrap">
                              <Text className="text-amber-400 font-bold text-[11px]">
                                {m.senderName || 'Member'}
                              </Text>
                              {m.isPinned && (
                                <View className="bg-indigo-900/60 px-1.5 py-0.2 rounded">
                                  <Text className="text-indigo-300 text-[8px] font-bold">📌 Pinned</Text>
                                </View>
                              )}
                              {m.isKept && (
                                <View className="bg-amber-900/60 px-1.5 py-0.2 rounded">
                                  <Text className="text-amber-300 text-[8px] font-bold">⭐ Kept</Text>
                                </View>
                              )}
                              {m.isOfflineQueued && (
                                <View className="bg-slate-700/60 px-1.5 py-0.2 rounded">
                                  <Text className="text-slate-300 text-[8px] font-bold">📡 Offline</Text>
                                </View>
                              )}
                            </View>

                            <View className="flex-row items-center gap-1">
                              {m.isEncrypted && (
                                <Text className="text-emerald-400 text-[9px] font-mono">🔒 E2EE</Text>
                              )}
                              <Text className="text-white/40 text-[9px]">
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                            </View>
                          </View>

                          <Text className="text-white text-xs mt-1">
                            {m.decryptedContent || m.content}
                          </Text>

                          {/* Message Actions */}
                          <View className="flex-row items-center justify-end gap-2 mt-2 pt-1 border-t border-white/5">
                            <TouchableOpacity
                              onPress={() => handleModerateChatMessage(m.id, m.isKept ? 'unkeep' : 'keep')}
                              className="px-2 py-0.5 rounded bg-white/5 active:bg-white/10"
                            >
                              <Text className={`text-[10px] font-medium ${m.isKept ? 'text-amber-400' : 'text-white/60'}`}>
                                {m.isKept ? '⭐ Kept' : '☆ Keep'}
                              </Text>
                            </TouchableOpacity>

                            {isTeacher && (
                              <>
                                <TouchableOpacity
                                  onPress={() => handleModerateChatMessage(m.id, m.isPinned ? 'unpin' : 'pin')}
                                  className="px-2 py-0.5 rounded bg-white/5 active:bg-white/10"
                                >
                                  <Text className={`text-[10px] font-medium ${m.isPinned ? 'text-indigo-400' : 'text-white/60'}`}>
                                    {m.isPinned ? 'Unpin' : 'Pin'}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleModerateChatMessage(m.id, 'delete')}
                                  className="px-2 py-0.5 rounded bg-rose-950/40 active:bg-rose-900/60"
                                >
                                  <Text className="text-rose-400 text-[10px] font-medium">Delete</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Message Input */}
                <View className="flex-row items-center gap-2">
                  <TextInput
                    placeholder={
                      chatChannel === 'leadership'
                        ? 'Message leadership council...'
                        : `Message ${chatChannel === 'general' ? 'announcements' : 'class'} (E2EE)...`
                    }
                    placeholderTextColor="#94a3b8"
                    value={chatInputText}
                    onChangeText={setChatInputText}
                    className="flex-1 bg-white/10 text-white rounded-xl px-3 py-2 text-xs border border-white/10"
                  />
                  <TouchableOpacity
                    onPress={handleSendChatMessage}
                    disabled={isSendingMessage || !chatInputText.trim()}
                    className="bg-amber-500 active:bg-amber-600 px-4 py-2 rounded-xl justify-center items-center"
                  >
                    <Text className="text-slate-950 font-bold text-xs">Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB: Roster */}
            {activeTab === 'roster' && (
              <View className="space-y-2">
                {rosterLoading ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : roster.length > 0 ? (
                  roster.map((s) => (
                    <View
                      key={s.userId}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 flex-row items-center justify-between mb-1.5"
                    >
                      <View>
                        <Text className="text-white font-semibold text-xs">{s.name}</Text>
                        <Text className="text-white/50 text-[10px]">{s.email}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-amber-400 font-bold text-xs">
                          {s.chaptersCompleted || 0} Ch. Read
                        </Text>
                        <Text className="text-emerald-400 text-[10px] font-medium">
                          🔥 {s.streakDays || 0}d streak
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text className="text-white/50 text-xs italic text-center py-4">
                    No students currently enrolled. Share class code: {selectedGroup.inviteCode}
                  </Text>
                )}
              </View>
            )}

            {/* TAB: Attendance */}
            {activeTab === 'attendance' && (
              <View className="space-y-3">
                <Text className="text-white/70 text-xs mb-1">
                  Mark attendance for today's session:
                </Text>

                {roster.map((s) => (
                  <View
                    key={s.userId}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 flex-row items-center justify-between mb-2"
                  >
                    <Text className="text-white font-semibold text-xs flex-1">{s.name}</Text>
                    <View className="flex-row gap-1">
                      {(['present', 'absent', 'late'] as const).map((status) => (
                        <TouchableOpacity
                          key={status}
                          onPress={() =>
                            setAttendanceState((prev) => ({ ...prev, [s.userId]: status }))
                          }
                          className={`px-2.5 py-1 rounded-md border ${
                            attendanceState[s.userId] === status
                              ? status === 'present'
                                ? 'bg-emerald-500 border-emerald-400'
                                : status === 'absent'
                                ? 'bg-rose-500 border-rose-400'
                                : 'bg-amber-500 border-amber-400'
                              : 'bg-white/10 border-white/10'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              attendanceState[s.userId] === status
                                ? 'text-slate-950 font-extrabold'
                                : 'text-white/70'
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                {/* Visitors & Guests (Non-Users) */}
                <View className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <Text className="text-amber-400 font-bold text-xs">
                    Sunday School Visitors & Guests (Non-Users)
                  </Text>
                  <Text className="text-white/50 text-[10px]">
                    Collect visitor names & WhatsApp numbers for Sunday School records
                  </Text>

                  <View className="space-y-2">
                    <TextInput
                      placeholder="Visitor Full Name (e.g. Bro. David)"
                      placeholderTextColor="#94a3b8"
                      value={newGuestName}
                      onChangeText={setNewGuestName}
                      className="bg-white/10 text-white rounded-xl px-3 py-2 text-xs border border-white/10"
                    />
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        placeholder="WhatsApp Number (e.g. +234 801 234 5678)"
                        placeholderTextColor="#94a3b8"
                        value={newGuestPhone}
                        onChangeText={setNewGuestPhone}
                        keyboardType="phone-pad"
                        className="flex-1 bg-white/10 text-white rounded-xl px-3 py-2 text-xs border border-white/10"
                      />
                      <TouchableOpacity
                        onPress={() => {
                          if (!newGuestName.trim()) return;
                          setGuestList((prev) => [
                            ...prev,
                            {
                              id: `guest_${Date.now()}`,
                              name: newGuestName.trim(),
                              phone: newGuestPhone.trim(),
                              status: 'present',
                            },
                          ]);
                          setNewGuestName('');
                          setNewGuestPhone('');
                        }}
                        className="bg-amber-500 active:bg-amber-600 px-4 py-2 rounded-xl"
                      >
                        <Text className="text-slate-950 font-bold text-xs">+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {guestList.map((g) => (
                    <View
                      key={g.id}
                      className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex-row items-center justify-between mt-1"
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center space-x-1.5">
                          <Text className="text-white font-semibold text-xs">{g.name}</Text>
                          <View className="bg-amber-400/20 px-1 rounded">
                            <Text className="text-amber-300 text-[9px] font-bold">Guest</Text>
                          </View>
                        </View>
                        {g.phone ? (
                          <Text className="text-white/50 text-[10px]">📱 {g.phone}</Text>
                        ) : null}
                      </View>
                      <View className="flex-row items-center space-x-1">
                        {(['present', 'late', 'absent'] as const).map((st) => (
                          <TouchableOpacity
                            key={st}
                            onPress={() =>
                              setGuestList((prev) =>
                                prev.map((item) => (item.id === g.id ? { ...item, status: st } : item))
                              )
                            }
                            className={`px-2 py-0.5 rounded ${
                              g.status === st ? 'bg-amber-500' : 'bg-white/10'
                            }`}
                          >
                            <Text
                              className={`text-[9px] font-bold ${
                                g.status === st ? 'text-slate-950 font-extrabold' : 'text-white/60'
                              }`}
                            >
                              {st}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          onPress={() => setGuestList((prev) => prev.filter((item) => item.id !== g.id))}
                          className="px-1.5 py-0.5"
                        >
                          <Text className="text-rose-400 font-bold text-xs">✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleSaveAttendance}
                  disabled={isSubmittingAttendance || (roster.length === 0 && guestList.length === 0)}
                  className="bg-emerald-500 active:bg-emerald-600 py-3 rounded-xl items-center mt-3"
                >
                  {isSubmittingAttendance ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <Text className="text-slate-950 font-bold text-xs">Save Today's Attendance</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : !loading ? (
          <View className="items-center justify-center py-10">
            <Text className="text-white/60 text-xs text-center">
              You are not currently enrolled in any Sunday School classes.
            </Text>
            <Text className="text-white/40 text-[11px] text-center mt-1">
              Ask your class teacher for their 6-digit code and enter it above!
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
