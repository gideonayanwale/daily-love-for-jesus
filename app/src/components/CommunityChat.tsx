import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Pin,
  Trash2,
  Lock,
  Unlock,
  ShieldAlert,
  Users,
  MessageSquare,
  Megaphone,
  Check,
  UserCheck,
  PlusCircle,
  Clock,
  Sparkles,
  Image as ImageIcon,
  CloudUpload,
  Crown,
  Building2,
  X,
  ExternalLink,
  Bookmark,
  WifiOff,
  Archive,
  DownloadCloud,
  HardDrive,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { encryptMessage, decryptMessage, isEncryptedMessage } from '@/lib/e2ee';
import {
  getLocalChatMessages,
  saveLocalChatMessages,
  queueOfflineMessage,
  syncOfflineMessages,
} from '@/lib/chatStorage';

interface ChatMessageItem {
  id: number;
  channelType: 'general' | 'community' | 'group' | 'dm' | 'leadership';
  communityId?: string | null;
  groupId?: number | null;
  senderId: string;
  receiverId?: string | null;
  content: string;
  mediaUrl?: string | null;
  isEncrypted?: boolean;
  isPinned: boolean;
  isKept?: boolean;
  isAnnouncement: boolean;
  expiresAt?: string | null;
  createdAt: string;
  senderName: string | null;
  senderAvatar: string | null;
  senderRole: string | null;
  decryptedContent?: string;
  isOfflineQueued?: boolean;
}

interface CommunityChatProps {
  currentUserId?: string;
  currentUserRole?: string;
  communityId?: string;
  groupId?: number;
  groupName?: string;
  isGroupAdmin?: boolean;
}

function getAuthHeader(): Record<string, string> {
  try {
    const session = localStorage.getItem('daily_love_supabase_session');
    if (session) {
      const token = JSON.parse(session)?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
}

export function CommunityChat({
  currentUserId,
  currentUserRole = 'user',
  communityId,
  groupId,
  groupName = 'Class Group',
  isGroupAdmin = false,
}: CommunityChatProps) {
  const [activeChannel, setActiveChannel] = useState<'general' | 'leadership' | 'community' | 'group' | 'dm'>('group');
  const [activeDmUser, setActiveDmUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [onlyAdminsCanPost, setOnlyAdminsCanPost] = useState(false);
  const [isBackingUpCloudinary, setIsBackingUpCloudinary] = useState(false);

  // Directory & Approvals Modals for Elevated Admin
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingCommunities, setPendingCommunities] = useState<any[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');

  // Secondary Supabase Project Cold Storage Archive State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [availableArchives, setAvailableArchives] = useState<any[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperadmin = currentUserRole === 'superadmin';
  const isElevatedAdmin = currentUserRole === 'elevated_admin' || isSuperadmin;
  const isCommunityAdmin = currentUserRole === 'admin' || isGroupAdmin || isElevatedAdmin;
  const canPostInGeneral = isElevatedAdmin;
  const canAccessLeadership = isCommunityAdmin;
  const canModerateInGroup = isGroupAdmin || isElevatedAdmin;
  const currentChannelKey = `${activeChannel}_${communityId || ''}_${groupId || ''}_${activeDmUser?.id || ''}`;

  // Instant local cache load for 0ms transition
  useEffect(() => {
    const cached = getLocalChatMessages(currentChannelKey);
    if (cached && cached.length > 0) {
      setMessages(cached as ChatMessageItem[]);
    }
  }, [currentChannelKey]);

  // Sync offline queue when connection is active
  const syncOfflineQueue = async () => {
    try {
      const { syncedCount } = await syncOfflineMessages(async (payload) => {
        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Sync failed');
        return res.json();
      });
      if (syncedCount > 0) {
        toast.success(`Online: Successfully synchronized ${syncedCount} offline message(s)!`);
        loadMessages();
      }
    } catch {
      // background sync catch
    }
  };

  useEffect(() => {
    window.addEventListener('online', syncOfflineQueue);
    syncOfflineQueue();
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, [currentChannelKey]);

  // Poll or load messages
  const loadMessages = async () => {
    try {
      let query = `/api/chat/messages?channelType=${activeChannel}`;
      if (activeChannel === 'community' && communityId) {
        query += `&communityId=${communityId}`;
      } else if (activeChannel === 'group' && groupId) {
        query += `&groupId=${groupId}`;
      } else if (activeChannel === 'dm' && activeDmUser) {
        query += `&receiverId=${activeDmUser.id}`;
      }

      const res = await fetch(query, { headers: { ...getAuthHeader() } });
      if (res.ok) {
        const rawData: ChatMessageItem[] = await res.json();
        
        // Transparent client-side E2EE decryption
        const decryptedList = await Promise.all(
          (rawData || []).map(async (msg) => {
            if (msg.isEncrypted || isEncryptedMessage(msg.content)) {
              const encKey = msg.communityId || (msg.groupId ? String(msg.groupId) : 'community-default-key');
              const decrypted = await decryptMessage(msg.content, encKey);
              return { ...msg, decryptedContent: decrypted };
            }
            return { ...msg, decryptedContent: msg.content };
          })
        );

        saveLocalChatMessages(currentChannelKey, decryptedList as any);
        setMessages(decryptedList);
      }
    } catch {
      // Offline fallback: keep existing messages
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [activeChannel, communityId, groupId, activeDmUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Load Elevated Admin Data if applicable
  const loadElevatedAdminData = async () => {
    if (!isElevatedAdmin) return;
    try {
      const [usersRes, pendingRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { ...getAuthHeader() } }),
        fetch('/api/communities/pending', { headers: { ...getAuthHeader() } }),
      ]);
      if (usersRes.ok) {
        const users = await usersRes.json();
        setAllUsers(users || []);
      }
      if (pendingRes.ok) {
        const pending = await pendingRes.json();
        setPendingCommunities(pending || []);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (isElevatedAdmin) {
      loadElevatedAdminData();
    }
  }, [isElevatedAdmin]);

  // File to Base64 media handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMediaUrl(reader.result as string);
      toast.success('Media attached!');
    };
    reader.readAsDataURL(file);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !mediaUrl) return;

    if (activeChannel === 'general' && !canPostInGeneral) {
      toast.error('Only elevated administrators can broadcast in general announcements.');
      return;
    }

    if (activeChannel === 'leadership' && !canAccessLeadership) {
      toast.error('Only leadership council members can post in this group.');
      return;
    }

    setIsSending(true);
    const shouldEncrypt = activeChannel === 'community' || activeChannel === 'group';
    const encKey = communityId || (groupId ? String(groupId) : 'community-default-key');
    const textToSend = inputText.trim();

    try {
      const finalContent = shouldEncrypt
        ? await encryptMessage(textToSend || '[Media Attachment]', encKey)
        : textToSend;

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          channelType: activeChannel,
          communityId: activeChannel === 'community' ? communityId : undefined,
          groupId: activeChannel === 'group' ? groupId : undefined,
          receiverId: activeChannel === 'dm' ? activeDmUser?.id : undefined,
          content: finalContent,
          mediaUrl: mediaUrl || undefined,
          isAnnouncement,
          isEncrypted: shouldEncrypt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setInputText('');
      setMediaUrl(null);
      setShowMediaInput(false);
      setIsAnnouncement(false);
      loadMessages();
    } catch (err: any) {
      // Check if network error or offline
      if (typeof navigator !== 'undefined' && (!navigator.onLine || err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError'))) {
        queueOfflineMessage({
          channelType: activeChannel,
          communityId: activeChannel === 'community' ? communityId : undefined,
          groupId: activeChannel === 'group' ? groupId : undefined,
          receiverId: activeChannel === 'dm' ? activeDmUser?.id : undefined,
          content: textToSend,
          mediaUrl: mediaUrl || undefined,
          isAnnouncement,
          isEncrypted: shouldEncrypt,
        });

        const tempItem: ChatMessageItem = {
          id: Date.now(),
          channelType: activeChannel,
          communityId: activeChannel === 'community' ? communityId : undefined,
          groupId: activeChannel === 'group' ? groupId : undefined,
          receiverId: activeChannel === 'dm' ? activeDmUser?.id : undefined,
          senderId: currentUserId || 'me',
          content: textToSend,
          mediaUrl: mediaUrl || undefined,
          isEncrypted: shouldEncrypt,
          isPinned: false,
          isKept: false,
          isAnnouncement,
          createdAt: new Date().toISOString(),
          senderName: 'You',
          senderAvatar: null,
          senderRole: currentUserRole,
          decryptedContent: textToSend,
          isOfflineQueued: true,
        };

        const updated = [...messages, tempItem];
        setMessages(updated);
        saveLocalChatMessages(currentChannelKey, updated as any);
        setInputText('');
        setMediaUrl(null);
        setShowMediaInput(false);
        setIsAnnouncement(false);
        toast.info('Saved locally to storage (Queued to sync when online)');
        return;
      }
      toast.error(err.message || 'Could not send message');
    } finally {
      setIsSending(false);
    }
  };

  // WhatsApp-like message moderation: Pin / Delete / Keep
  const handleModerateMessage = async (
    messageId: number,
    action: 'pin' | 'unpin' | 'delete' | 'keep' | 'unkeep',
  ) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const actionLabels: Record<string, string> = {
          delete: 'Message deleted',
          pin: 'Message pinned & kept permanently',
          unpin: 'Message unpinned',
          keep: 'Message kept permanently (saved from 7-day auto-purge)',
          unkeep: 'Message removed from kept messages',
        };
        toast.success(actionLabels[action] || 'Action succeeded');
        loadMessages();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Action failed');
      }
    } catch {
      toast.error('Moderation action failed');
    }
  };

  // WhatsApp-like admin posting toggle
  const handleToggleAdminOnly = async () => {
    if (!groupId || !canModerateInGroup) return;
    const nextVal = !onlyAdminsCanPost;
    try {
      const res = await fetch(`/api/groups/${groupId}/admin-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ onlyAdminsCanPost: nextVal }),
      });
      if (res.ok) {
        setOnlyAdminsCanPost(nextVal);
        toast.success(nextVal ? 'Only admins can now post in this group' : 'All members can now post');
      }
    } catch {
      toast.error('Failed to change group posting settings');
    }
  };

  // Superadmin Cloudinary Backup Trigger
  const handleCloudinaryBackup = async () => {
    if (!communityId) {
      toast.error('No community context available for Cloudinary backup');
      return;
    }
    setIsBackingUpCloudinary(true);
    try {
      const res = await fetch(`/api/communities/${communityId}/chat/backup-to-cloudinary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Community chats successfully synced to Cloudinary!');
        if (data.backupUrl) {
          window.open(data.backupUrl, '_blank');
        }
      } else {
        toast.error(data.message || 'Cloudinary backup failed');
      }
    } catch {
      toast.error('Failed to initiate Cloudinary backup');
    } finally {
      setIsBackingUpCloudinary(false);
    }
  };

  // Secondary Supabase Project Cold Storage Handlers
  const loadAvailableArchives = async () => {
    setIsLoadingArchives(true);
    try {
      let query = '/api/chat/archives';
      const params = new URLSearchParams();
      if (communityId) params.append('communityId', communityId);
      if (groupId) params.append('groupId', String(groupId));
      const qs = params.toString();
      if (qs) query += `?${qs}`;

      const res = await fetch(query, { headers: { ...getAuthHeader() } });
      if (res.ok) {
        const data = await res.json();
        setAvailableArchives(data || []);
      }
    } catch {
      toast.error('Failed to load available archives');
    } finally {
      setIsLoadingArchives(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      const res = await fetch('/api/chat/archives/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          communityId: activeChannel === 'community' ? communityId : undefined,
          groupId: activeChannel === 'group' ? groupId : undefined,
          channelType: activeChannel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Archived ${data.messageCount} messages to Secondary Supabase Cold Storage!`);
      } else {
        toast.error(data.message || 'Snapshot creation failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive snapshot');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: number) => {
    setIsRestoringSnapshot(true);
    try {
      const res = await fetch(`/api/chat/archives/${snapshotId}/download`, {
        headers: { ...getAuthHeader() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to download snapshot');

      const decrypted = await Promise.all(
        (data.messages || []).map(async (m: any) => {
          if (m.isEncrypted || isEncryptedMessage(m.content)) {
            const encKey = m.communityId || (m.groupId ? String(m.groupId) : 'community-default-key');
            const plain = await decryptMessage(m.content, encKey);
            return { ...m, decryptedContent: plain };
          }
          return { ...m, decryptedContent: m.content };
        })
      );

      saveLocalChatMessages(currentChannelKey, decrypted as any);
      setMessages(decrypted);
      setShowRestoreModal(false);
      toast.success(`Restored ${decrypted.length} messages from Secondary Cloud Archive into local storage!`);
    } catch (err: any) {
      toast.error(err.message || 'Restore failed');
    } finally {
      setIsRestoringSnapshot(false);
    }
  };

  // Elevate user role
  const handleElevateUser = async (targetUserId: string, targetRole: 'elevated_admin' | 'admin' | 'user') => {
    try {
      const res = await fetch('/api/admin/elevate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ targetUserId, targetRole }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`User updated to ${targetRole} and enrolled in Leadership Council.`);
        loadElevatedAdminData();
      } else {
        toast.error(data.message || 'Elevation failed');
      }
    } catch {
      toast.error('Failed to update user role');
    }
  };

  // Approve fellowship
  const handleApproveCommunity = async (commId: string, approve: boolean) => {
    try {
      const res = await fetch(`/api/communities/${commId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ approve }),
      });
      if (res.ok) {
        toast.success(approve ? 'Fellowship approved & activated!' : 'Fellowship rejected');
        loadElevatedAdminData();
      }
    } catch {
      toast.error('Approval action failed');
    }
  };

  // Create custom fellowship
  const handleCreateCustomCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommunityName.trim()) return;
    try {
      const res = await fetch('/api/communities/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: newCommunityName.trim(),
          description: newCommunityDesc.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Fellowship created!');
        setShowCreateCommunityModal(false);
        setNewCommunityName('');
        setNewCommunityDesc('');
        loadElevatedAdminData();
      } else {
        toast.error(data.error || 'Failed to create fellowship');
      }
    } catch {
      toast.error('Creation failed');
    }
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row h-[660px]">
      {/* ── Channels Sidebar ── */}
      <div className="w-full md:w-64 bg-gray-50 dark:bg-slate-950/60 border-r border-gray-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Channels & DMs
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isSuperadmin && communityId && (
              <button
                onClick={handleCloudinaryBackup}
                disabled={isBackingUpCloudinary}
                className="p-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                title="Superadmin: Sync chat backup into Cloudinary"
              >
                <CloudUpload className="w-3 h-3" />
                <span>{isBackingUpCloudinary ? 'Syncing...' : 'Backup'}</span>
              </button>
            )}

            {isElevatedAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center gap-1"
                title="Elevated Admin Directory & Approvals"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Channel List */}
        <div className="p-2 space-y-1 flex-1 overflow-y-auto">
          {/* General Announcements Channel */}
          <button
            onClick={() => {
              setActiveChannel('general');
              setActiveDmUser(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeChannel === 'general'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">📢 general-announcements</span>
          </button>

          {/* Leadership Council Discussion Group */}
          {canAccessLeadership && (
            <button
              onClick={() => {
                setActiveChannel('leadership');
                setActiveDmUser(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeChannel === 'leadership'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Crown className="w-3.5 h-3.5 flex-shrink-0 text-amber-300" />
                <span className="truncate">👑 leadership-council</span>
              </div>
              <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                activeChannel === 'leadership' ? 'bg-purple-700 text-purple-100' : 'bg-purple-100 text-purple-800'
              }`}>
                Admins
              </span>
            </button>
          )}

          {/* Group Discussion */}
          {groupId && (
            <button
              onClick={() => {
                setActiveChannel('group');
                setActiveDmUser(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeChannel === 'group'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">💬 {groupName}</span>
              </div>
              <span className="text-[9px] opacity-75 font-mono">7d</span>
            </button>
          )}

          {/* Community-wide Group Chat */}
          {communityId && (
            <button
              onClick={() => {
                setActiveChannel('community');
                setActiveDmUser(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeChannel === 'community'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">🏛️ # community-group</span>
              </div>
              <span className="text-[9px] opacity-75 font-mono">E2EE</span>
            </button>
          )}

          {/* Direct Messages Section */}
          <div className="pt-3 pb-1 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Direct Messages (DMs)
            </span>
          </div>

          {allUsers.length > 0 ? (
            allUsers.slice(0, 8).map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setActiveChannel('dm');
                  setActiveDmUser(u);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                  activeChannel === 'dm' && activeDmUser?.id === u.id
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold text-amber-900 dark:text-amber-100">
                  {u.name?.charAt(0) || 'U'}
                </div>
                <div className="truncate flex-1">
                  <span className="font-medium text-xs">{u.name || 'Member'}</span>
                  {u.role !== 'user' && (
                    <span className="ml-1 text-[9px] opacity-75">({u.role})</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-[11px] text-gray-400 italic">
              Select members via admin directory
            </div>
          )}
        </div>

        {/* Custom Fellowship Creation Button */}
        <div className="p-2 border-t border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setShowCreateCommunityModal(true)}
            className="w-full py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-slate-900 hover:bg-amber-100 text-amber-900 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-amber-200 dark:border-amber-900/40"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Fellowship</span>
          </button>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {/* Channel Top Header */}
        <div className="p-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900 dark:text-white">
              {activeChannel === 'general'
                ? '# general-announcements'
                : activeChannel === 'leadership'
                ? '👑 # leadership-council'
                : activeChannel === 'group'
                ? `# ${groupName}`
                : activeChannel === 'dm'
                ? `💬 DM with ${activeDmUser?.name || 'User'}`
                : '# community-group'}
            </span>
            {activeChannel === 'general' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                Auto-Subscribed
              </span>
            )}
            {activeChannel === 'leadership' && (
              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold">
                Elevated & Community Admins
              </span>
            )}
            {(activeChannel === 'group' || activeChannel === 'community') && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>E2EE • 7d Auto-Purge</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Restore from Secondary Supabase Cloud Archive */}
            <button
              onClick={() => {
                loadAvailableArchives();
                setShowRestoreModal(true);
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
              title="Restore chat history from Secondary Supabase Cloud Archive if local cache is cleared"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restore Cloud</span>
            </button>

            {/* Admin Snapshot to Secondary Cloud Storage */}
            {canModerateInGroup && (
              <button
                onClick={handleCreateSnapshot}
                disabled={isCreatingSnapshot}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Archive bulk snapshot to Secondary Supabase Project (Project 2 Cold Storage)"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isCreatingSnapshot ? 'Archiving...' : 'Cloud Snapshot'}</span>
              </button>
            )}

            {/* Superadmin Cloudinary Backup Action */}
            {isSuperadmin && (
              <button
                onClick={handleCloudinaryBackup}
                disabled={isBackingUpCloudinary}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Backup community chat history into Cloudinary archive"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isBackingUpCloudinary ? 'Backing up...' : 'Cloudinary Sync'}</span>
              </button>
            )}

            {/* WhatsApp-like Admin Posting Controls */}
            {canModerateInGroup && activeChannel === 'group' && (
              <button
                onClick={handleToggleAdminOnly}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
                  onlyAdminsCanPost
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-gray-100 border-gray-200 text-gray-700'
                }`}
                title="Toggle WhatsApp-like admin-only posting"
              >
                {onlyAdminsCanPost ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{onlyAdminsCanPost ? 'Admin-Only Active' : 'All Can Post'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 7-Day Auto-Deletion Banner for Group & Community Chats */}
        {(activeChannel === 'group' || activeChannel === 'community') && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 px-3 py-1.5 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>Messages in this community group auto-delete after 7 days for privacy. End-to-end encrypted (E2EE).</span>
            </span>
            {isSuperadmin && (
              <span className="text-[10px] text-emerald-700 underline cursor-pointer" onClick={handleCloudinaryBackup}>
                Cloudinary Backup Enabled
              </span>
            )}
          </div>
        )}

        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Pin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="font-semibold text-amber-900 dark:text-amber-200 text-[11px] truncate">
                Pinned: {pinnedMessages[0].decryptedContent || pinnedMessages[0].content}
              </span>
            </div>
            {canModerateInGroup && (
              <button
                onClick={() => handleModerateMessage(pinnedMessages[0].id, 'unpin')}
                className="text-amber-700 hover:text-amber-900 text-[10px] font-bold underline ml-2 flex-shrink-0"
              >
                Unpin
              </button>
            )}
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">No messages yet in this channel.</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {activeChannel === 'leadership'
                  ? 'Welcome to the Leadership Council. Strategize and coordinate community activities here.'
                  : 'Start the discussion and share fellowship media!'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMsgAdmin = msg.senderRole === 'elevated_admin' || msg.senderRole === 'superadmin' || msg.senderRole === 'admin';

              return (
                <div
                  key={msg.id}
                  className={`group flex items-start gap-2.5 ${
                    msg.isAnnouncement
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/50'
                      : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 flex-shrink-0">
                    {msg.senderName?.charAt(0) || 'U'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">
                        {msg.senderName || 'Member'}
                      </span>
                      {isMsgAdmin && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                          Admin
                        </span>
                      )}
                      {msg.isAnnouncement && (
                        <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[9px] font-bold">
                          Broadcast
                        </span>
                      )}
                      {msg.isEncrypted && (
                        <span className="text-[9px] text-emerald-600 font-mono flex items-center gap-0.5" title="End-to-end encrypted message">
                          <Lock className="w-2.5 h-2.5" />
                          <span>E2EE</span>
                        </span>
                      )}
                      {msg.isPinned && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold flex items-center gap-0.5" title="Pinned to top">
                          <Pin className="w-2.5 h-2.5" />
                          <span>Pinned</span>
                        </span>
                      )}
                      {msg.isKept && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold flex items-center gap-0.5" title="Kept permanently (exempt from 7-day auto-purge)">
                          <Bookmark className="w-2.5 h-2.5 fill-amber-600" />
                          <span>Kept</span>
                        </span>
                      )}
                      {msg.isOfflineQueued && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center gap-0.5" title="Saved locally in offline queue">
                          <WifiOff className="w-2.5 h-2.5" />
                          <span>Offline</span>
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(msg.createdAt), 'h:mm a')}
                      </span>
                    </div>

                    {/* Media Display */}
                    {msg.mediaUrl && (
                      <div className="mt-1.5 max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800">
                        <img
                          src={msg.mediaUrl}
                          alt="Shared media"
                          className="w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-95"
                          onClick={() => window.open(msg.mediaUrl!, '_blank')}
                        />
                      </div>
                    )}

                    {/* Text Content */}
                    <p className="text-xs text-gray-800 dark:text-gray-200 mt-0.5 whitespace-pre-wrap break-words">
                      {msg.decryptedContent || msg.content}
                    </p>
                  </div>

                  {/* Message Action Toolbar on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {/* Keep / Bookmark action for all members */}
                    <button
                      onClick={() => handleModerateMessage(msg.id, msg.isKept ? 'unkeep' : 'keep')}
                      className={`p-1 rounded transition-colors ${
                        msg.isKept
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                          : 'text-gray-400 hover:text-amber-600 hover:bg-gray-100'
                      }`}
                      title={msg.isKept ? 'Unkeep message' : 'Keep permanently (protect from 7-day auto-purge)'}
                    >
                      <Bookmark className={`w-3 h-3 ${msg.isKept ? 'fill-amber-500' : ''}`} />
                    </button>

                    {/* WhatsApp-like Moderation Toolbar for Admins */}
                    {canModerateInGroup && (
                      <>
                        <button
                          onClick={() => handleModerateMessage(msg.id, msg.isPinned ? 'unpin' : 'pin')}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500"
                          title={msg.isPinned ? 'Unpin' : 'Pin message'}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleModerateMessage(msg.id, 'delete')}
                          className="p-1 rounded hover:bg-red-50 text-red-500"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 space-y-2">
          {/* Media preview tag if attached */}
          {mediaUrl && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-[11px] text-amber-900 dark:text-amber-200 truncate">Image attachment ready to send</span>
              </div>
              <button
                type="button"
                onClick={() => setMediaUrl(null)}
                className="text-amber-800 hover:text-rose-600 text-xs font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeChannel === 'general' && !canPostInGeneral ? (
            <div className="text-center py-2 text-xs text-gray-500 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>General announcement channel is broadcast-only for elevated administrators.</span>
            </div>
          ) : activeChannel === 'leadership' && !canAccessLeadership ? (
            <div className="text-center py-2 text-xs text-purple-700 flex items-center justify-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              <span>Leadership council discussion is exclusive to community and elevated administrators.</span>
            </div>
          ) : onlyAdminsCanPost && !canModerateInGroup && activeChannel === 'group' ? (
            <div className="text-center py-2 text-xs text-rose-500 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Only group administrators can send messages in this group.</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-2">
              <div className="flex items-center justify-between">
                {canModerateInGroup && (
                  <label className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnnouncement}
                      onChange={(e) => setIsAnnouncement(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Post as Official Broadcast</span>
                  </label>
                )}

                {(activeChannel === 'group' || activeChannel === 'community') && (
                  <span className="text-[10px] text-emerald-600 font-medium ml-auto flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>E2EE Active</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors ${
                    mediaUrl
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-white dark:bg-slate-900 text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Attach media or photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={
                    activeChannel === 'general'
                      ? 'Broadcast general announcement to all users...'
                      : activeChannel === 'leadership'
                      ? 'Message the leadership council...'
                      : `Message ${activeChannel === 'group' ? groupName : 'channel'} (E2EE)...`
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSending || (!inputText.trim() && !mediaUrl)}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Elevated Admin Directory & Fellowship Approvals Modal ── */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  Elevated Admin Control Center
                </h3>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Fellowship Approvals */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                  Pending Fellowship Approvals ({pendingCommunities.length})
                </h4>
                {pendingCommunities.length === 0 ? (
                  <p className="text-gray-400 italic">No fellowships currently pending approval.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingCommunities.map((item) => (
                      <div
                        key={item.community.id}
                        className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{item.community.name}</p>
                          <p className="text-gray-600 text-[11px]">{item.community.description}</p>
                          <p className="text-gray-400 text-[10px] mt-0.5">
                            Created by {item.creator?.name || 'Admin'} ({item.creator?.email})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproveCommunity(item.community.id, true)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproveCommunity(item.community.id, false)}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Directory & Role Promotion */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                  All Users & Admins Directory ({allUsers.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2">
                  {allUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <p className="font-bold text-gray-900 dark:text-white">{u.name || 'Member'}</p>
                        <p className="text-gray-500 text-[10px]">{u.email} • Role: {u.role}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Direct Message button */}
                        <button
                          onClick={() => {
                            setActiveChannel('dm');
                            setActiveDmUser(u);
                            setShowAdminModal(false);
                          }}
                          className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]"
                        >
                          Send DM
                        </button>

                        {/* Promote to Community Admin */}
                        {u.role === 'user' && (
                          <button
                            onClick={() => handleElevateUser(u.id, 'admin')}
                            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-[10px]"
                          >
                            Make Admin
                          </button>
                        )}

                        {/* Superadmin designating Elevated Admin */}
                        {isSuperadmin && u.role !== 'elevated_admin' && (
                          <button
                            onClick={() => handleElevateUser(u.id, 'elevated_admin')}
                            className="px-2 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[10px]"
                          >
                            Make Elevated Admin
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Custom Fellowship Modal ── */}
      {showCreateCommunityModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-5 shadow-2xl border border-gray-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
              Create New Fellowship
            </h3>
            <p className="text-gray-500 text-xs mb-4">
              {isElevatedAdmin
                ? 'Your fellowship will be immediately active as an elevated admin.'
                : 'Fellowships are submitted for elevated administrator approval.'}
            </p>

            <form onSubmit={handleCreateCustomCommunity} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Fellowship Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grace Bible Fellowship Lagos"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Description & Location
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell members about this fellowship..."
                  value={newCommunityDesc}
                  onChange={(e) => setNewCommunityDesc(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCommunityModal(false)}
                  className="px-3 py-1.5 rounded-xl text-gray-500 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCommunityName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                >
                  Submit Fellowship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Restore from Secondary Supabase Cloud Archive Modal ── */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  Secondary Supabase Cloud Archives
                </h3>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Select a bulk snapshot from the dedicated Secondary Supabase Cold Storage project to restore messages into your local device cache:
            </p>

            {isLoadingArchives ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading available cloud archives...</div>
            ) : availableArchives.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No cloud archive snapshots found for this channel yet.
                {canModerateInGroup && (
                  <div className="mt-2">
                    <button
                      onClick={handleCreateSnapshot}
                      className="text-xs text-emerald-600 font-bold underline"
                    >
                      Create First Snapshot Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {availableArchives.map((arc) => (
                  <div
                    key={arc.id}
                    className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                        <span>📅 {arc.archiveDate}</span>
                        <span className="text-[10px] font-normal text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          {arc.storageProvider === 'supabase_secondary' ? 'Secondary Project' : 'Cloud Storage'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {arc.messageCount} messages • {(arc.fileSizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreSnapshot(arc.id)}
                      disabled={isRestoringSnapshot}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>{isRestoringSnapshot ? 'Restoring...' : 'Restore'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
