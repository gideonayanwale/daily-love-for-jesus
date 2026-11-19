import { useState, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import useDevotionalRealtime from '@/hooks/useDevotionalRealtime';
import type { Devotional } from '@db/schema';
import MediaUpload from '@/components/MediaUpload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ShieldCheck, Trash2, Edit, Send, MessageSquare, Plus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
const TeacherAssignmentAdmin = lazy(() => import('./TeacherAssignmentAdmin'));
const AnonymousLogAdmin = lazy(() => import('./AnonymousLogAdmin'));

// ── Sanitise helper ────────────────────────────────────────────────────────────
const sanitise = (s: string): string => s.trim().replace(/(<([^>]+)>)/gi, '');

// ── Validation limits ──────────────────────────────────────────────────────────
const LIMITS = {
  title: 500,
  scripture: 500,
  scriptureText: 5000,
  body: 10000,
  reflection: 3000,
  prayer: 3000,
  author: 255,
  source: 500,
  topic: 500,
  declarationOfFaith: 5000,
  dailyCapsule: 5000,
  brothersKeeper: 5000,
  dailyBibleReading: 5000,
  otherInfo: 5000,
} as const;

// ── New devotion form state type ───────────────────────────────────────────────
interface DevotionForm {
  title: string;
  scripture: string;
  scriptureText: string;
  body: string;
  reflection: string;
  prayer: string;
  author: string;
  date: string;
  mediaUrl: string;
  source: string;
  isPublished: boolean;
  topic: string;
  declarationOfFaith: string;
  dailyCapsule: string;
  brothersKeeper: string;
  dailyBibleReading: string;
  otherInfo: string;
}

const EMPTY_FORM: DevotionForm = {
  title: '',
  scripture: '',
  scriptureText: '',
  body: '',
  reflection: '',
  prayer: '',
  author: '',
  date: new Date().toISOString().split('T')[0],
  mediaUrl: '',
  source: '',
  isPublished: false,
  topic: '',
  declarationOfFaith: '',
  dailyCapsule: '',
  brothersKeeper: '',
  dailyBibleReading: '',
  otherInfo: '',
};

// ── Inline field error component ───────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

// ── New Devotion Tab ───────────────────────────────────────────────────────────
function NewDevotionTab() {
  const [form, setForm] = useState<DevotionForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof DevotionForm, string>>>({});

  const createMutation = trpc.devotional.create.useMutation({
    onSuccess: () => {
      toast.success('Devotional created successfully!');
      setForm(EMPTY_FORM);
      setErrors({});
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const set = (field: keyof DevotionForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof DevotionForm, string>> = {};
    const title = sanitise(form.title);
    if (!title) newErrors.title = 'Title is required.';
    else if (title.length > LIMITS.title) newErrors.title = `Title must be ≤ ${LIMITS.title} characters.`;

    const body = sanitise(form.body);
    if (!body) newErrors.body = 'Body is required.';
    else if (body.length > LIMITS.body) newErrors.body = `Body must be ≤ ${LIMITS.body} characters.`;

    if (form.scripture && sanitise(form.scripture).length > LIMITS.scripture)
      newErrors.scripture = `Scripture must be ≤ ${LIMITS.scripture} characters.`;
    if (form.scriptureText && sanitise(form.scriptureText).length > LIMITS.scriptureText)
      newErrors.scriptureText = `Scripture text must be ≤ ${LIMITS.scriptureText} characters.`;
    if (form.reflection && sanitise(form.reflection).length > LIMITS.reflection)
      newErrors.reflection = `Reflection must be ≤ ${LIMITS.reflection} characters.`;
    if (form.prayer && sanitise(form.prayer).length > LIMITS.prayer)
      newErrors.prayer = `Prayer must be ≤ ${LIMITS.prayer} characters.`;
    if (form.author && sanitise(form.author).length > LIMITS.author)
      newErrors.author = `Author must be ≤ ${LIMITS.author} characters.`;
    if (form.source && sanitise(form.source).length > LIMITS.source)
      newErrors.source = `Source must be ≤ ${LIMITS.source} characters.`;
    if (form.topic && sanitise(form.topic).length > LIMITS.topic)
      newErrors.topic = `Topic must be ≤ ${LIMITS.topic} characters.`;
    if (form.declarationOfFaith && sanitise(form.declarationOfFaith).length > LIMITS.declarationOfFaith)
      newErrors.declarationOfFaith = `Declaration of Faith must be ≤ ${LIMITS.declarationOfFaith} characters.`;
    if (form.dailyCapsule && sanitise(form.dailyCapsule).length > LIMITS.dailyCapsule)
      newErrors.dailyCapsule = `Daily Capsule must be ≤ ${LIMITS.dailyCapsule} characters.`;
    if (form.brothersKeeper && sanitise(form.brothersKeeper).length > LIMITS.brothersKeeper)
      newErrors.brothersKeeper = `Be Your Brother's Keeper must be ≤ ${LIMITS.brothersKeeper} characters.`;
    if (form.dailyBibleReading && sanitise(form.dailyBibleReading).length > LIMITS.dailyBibleReading)
      newErrors.dailyBibleReading = `Daily Bible Reading must be ≤ ${LIMITS.dailyBibleReading} characters.`;
    if (form.otherInfo && sanitise(form.otherInfo).length > LIMITS.otherInfo)
      newErrors.otherInfo = `Other Information must be ≤ ${LIMITS.otherInfo} characters.`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate({
      title: sanitise(form.title),
      scripture: sanitise(form.scripture) || undefined,
      scriptureText: sanitise(form.scriptureText) || undefined,
      body: sanitise(form.body),
      reflection: sanitise(form.reflection) || undefined,
      prayer: sanitise(form.prayer) || undefined,
      author: sanitise(form.author) || undefined,
      // devotionalDate must be a Date object — the z.date() schema rejects strings
      devotionalDate: form.date ? new Date(form.date) : new Date(),
      mediaUrl: form.mediaUrl || undefined,
      // source is an enum ("telegram" | "manual" | "api") — always send "manual" here
      source: 'manual' as const,
      isPublished: form.isPublished,
      topic: sanitise(form.topic) || undefined,
      declarationOfFaith: sanitise(form.declarationOfFaith) || undefined,
      dailyCapsule: sanitise(form.dailyCapsule) || undefined,
      brothersKeeper: sanitise(form.brothersKeeper) || undefined,
      dailyBibleReading: sanitise(form.dailyBibleReading) || undefined,
      otherInfo: sanitise(form.otherInfo) || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="d-title">Title *</Label>
        <Input id="d-title" value={form.title} onChange={set('title')} placeholder="Enter devotional title" />
        <FieldError msg={errors.title} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="d-scripture">Scripture Reference</Label>
          <Input id="d-scripture" value={form.scripture} onChange={set('scripture')} placeholder="e.g. John 3:16" />
          <FieldError msg={errors.scripture} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-author">Author / Minister</Label>
          <Input id="d-author" value={form.author} onChange={set('author')} placeholder="Minister name" />
          <FieldError msg={errors.author} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-scriptureText">Scripture Text</Label>
        <Textarea id="d-scriptureText" value={form.scriptureText} onChange={set('scriptureText')} placeholder="Paste the Bible verse text here..." rows={3} />
        <FieldError msg={errors.scriptureText} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-topic">Topic / Theme</Label>
        <Input id="d-topic" value={form.topic} onChange={set('topic')} placeholder="e.g. Faith in Trials" maxLength={500} />
        <FieldError msg={errors.topic} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-body">Devotional Body *</Label>
        <Textarea id="d-body" value={form.body} onChange={set('body')} placeholder="Write the devotional message..." rows={8} />
        <FieldError msg={errors.body} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-declarationOfFaith">Declaration of Faith</Label>
        <Textarea id="d-declarationOfFaith" value={form.declarationOfFaith} onChange={set('declarationOfFaith')} placeholder="Enter the declaration of faith for today..." rows={3} />
        <FieldError msg={errors.declarationOfFaith} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-reflection">Reflection</Label>
        <Textarea id="d-reflection" value={form.reflection} onChange={set('reflection')} placeholder="Reflection questions or thoughts..." rows={3} />
        <FieldError msg={errors.reflection} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-otherInfo">Other Information</Label>
        <Textarea id="d-otherInfo" value={form.otherInfo} onChange={set('otherInfo')} placeholder="Any additional notes or announcements..." rows={2} />
        <FieldError msg={errors.otherInfo} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-prayer">Prayer</Label>
        <Textarea id="d-prayer" value={form.prayer} onChange={set('prayer')} placeholder="Closing prayer..." rows={3} />
        <FieldError msg={errors.prayer} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="d-dailyCapsule">Daily Capsule</Label>
        <Textarea id="d-dailyCapsule" value={form.dailyCapsule} onChange={set('dailyCapsule')} placeholder="The daily capsule message..." rows={3} />
        <FieldError msg={errors.dailyCapsule} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-brothersKeeper">Be Your Brother's Keeper</Label>
        <Textarea id="d-brothersKeeper" value={form.brothersKeeper} onChange={set('brothersKeeper')} placeholder="Today's social/community challenge..." rows={3} />
        <FieldError msg={errors.brothersKeeper} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-dailyBibleReading">Daily Bible Reading</Label>
        <Textarea id="d-dailyBibleReading" value={form.dailyBibleReading} onChange={set('dailyBibleReading')} placeholder="e.g. Genesis 1–3 | Today read about creation..." rows={2} />
        <FieldError msg={errors.dailyBibleReading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="d-date">Devotional Date (auto-set to today)</Label>
          <Input id="d-date" type="date" value={form.date} onChange={set('date')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-source">Source</Label>
          <Input id="d-source" value={form.source} onChange={set('source')} placeholder="Source attribution" />
          <FieldError msg={errors.source} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Media Upload</Label>
        <MediaUpload
          onUpload={(url) => setForm((prev) => ({ ...prev, mediaUrl: url }))}
          accept="image/*,video/*"
          label="Upload Devotional Media"
        />
        {form.mediaUrl && (
          <p className="text-xs text-emerald-600 mt-1">Media URL: <span className="font-mono">{form.mediaUrl.substring(0, 60)}…</span></p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          id="d-publish"
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
          className="w-4 h-4 rounded border-zinc-300 accent-amber-500"
        />
        <Label htmlFor="d-publish" className="text-sm cursor-pointer">Publish immediately</Label>
      </div>

      <Button
        type="submit"
        disabled={createMutation.isPending}
        className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white"
      >
        {createMutation.isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
        ) : (
          <><Plus className="w-4 h-4" /> Create Devotional</>
        )}
      </Button>
    </form>
  );
}

// ── Manage Devotions Tab ───────────────────────────────────────────────────────
function ManageDevotionsTab() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<DevotionForm>>({});
  const [editErrors, setEditErrors] = useState<Partial<Record<string, string>>>({});
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 20;

  const { data } = trpc.devotional.adminList.useQuery({ limit: PAGE_SIZE, offset });

  const updateMutation = trpc.devotional.update.useMutation({
    onSuccess: () => { toast.success('Devotional updated!'); setEditingId(null); setEditForm({}); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const deleteMutation = trpc.devotional.delete.useMutation({
    onSuccess: () => toast.success('Devotional deleted.'),
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const publishMutation = trpc.devotional.publish.useMutation({
    onSuccess: () => toast.success('Publish status updated!'),
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const sendToTelegramMutation = trpc.devotional.sendToTelegram.useMutation({
    onSuccess: () => toast.success('Sent to Telegram!'),
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const startEdit = (d: Devotional) => {
    setEditingId(d.id);
    setEditForm({
      title: d.title || '',
      body: d.body || '',
      scripture: d.scripture || '',
      scriptureText: d.scriptureText || '',
      reflection: d.reflection || '',
      prayer: d.prayer || '',
      author: d.author || '',
      source: d.source || '',
      topic: d.topic || '',
      declarationOfFaith: d.declarationOfFaith || '',
      dailyCapsule: d.dailyCapsule || '',
      brothersKeeper: d.brothersKeeper || '',
      dailyBibleReading: d.dailyBibleReading || '',
      otherInfo: d.otherInfo || '',
    });
    setEditErrors({});
  };

  const setEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validateEdit = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};
    if (!editForm.title?.trim()) newErrors.title = 'Title is required.';
    else if (sanitise(editForm.title).length > LIMITS.title) newErrors.title = `Title must be ≤ ${LIMITS.title} characters.`;
    if (!editForm.body?.trim()) newErrors.body = 'Body is required.';
    else if (sanitise(editForm.body).length > LIMITS.body) newErrors.body = `Body must be ≤ ${LIMITS.body} characters.`;
    if (editForm.topic && sanitise(editForm.topic).length > LIMITS.topic)
      newErrors.topic = `Topic must be ≤ ${LIMITS.topic} characters.`;
    if (editForm.declarationOfFaith && sanitise(editForm.declarationOfFaith).length > LIMITS.declarationOfFaith)
      newErrors.declarationOfFaith = `Declaration of Faith must be ≤ ${LIMITS.declarationOfFaith} characters.`;
    if (editForm.dailyCapsule && sanitise(editForm.dailyCapsule).length > LIMITS.dailyCapsule)
      newErrors.dailyCapsule = `Daily Capsule must be ≤ ${LIMITS.dailyCapsule} characters.`;
    if (editForm.brothersKeeper && sanitise(editForm.brothersKeeper).length > LIMITS.brothersKeeper)
      newErrors.brothersKeeper = `Be Your Brother's Keeper must be ≤ ${LIMITS.brothersKeeper} characters.`;
    if (editForm.dailyBibleReading && sanitise(editForm.dailyBibleReading).length > LIMITS.dailyBibleReading)
      newErrors.dailyBibleReading = `Daily Bible Reading must be ≤ ${LIMITS.dailyBibleReading} characters.`;
    if (editForm.otherInfo && sanitise(editForm.otherInfo).length > LIMITS.otherInfo)
      newErrors.otherInfo = `Other Information must be ≤ ${LIMITS.otherInfo} characters.`;
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveEdit = () => {
    if (editingId === null || !validateEdit()) return;
    // Router expects { id, data: {...} } — not flat fields
    updateMutation.mutate({
      id: editingId,
      data: {
        title: sanitise(editForm.title || ''),
        body: sanitise(editForm.body || ''),
        scripture: sanitise(editForm.scripture || '') || undefined,
        scriptureText: sanitise(editForm.scriptureText || '') || undefined,
        reflection: sanitise(editForm.reflection || '') || undefined,
        prayer: sanitise(editForm.prayer || '') || undefined,
        author: sanitise(editForm.author || '') || undefined,
        topic: sanitise(editForm.topic || '') || undefined,
        declarationOfFaith: sanitise(editForm.declarationOfFaith || '') || undefined,
        dailyCapsule: sanitise(editForm.dailyCapsule || '') || undefined,
        brothersKeeper: sanitise(editForm.brothersKeeper || '') || undefined,
        dailyBibleReading: sanitise(editForm.dailyBibleReading || '') || undefined,
        otherInfo: sanitise(editForm.otherInfo || '') || undefined,
      },
    });
  };

  return (
    <div className="space-y-3 max-w-3xl">
      {!data?.items?.length && (
        <p className="text-sm text-zinc-500 py-4 text-center">No devotionals found.</p>
      )}
      {data?.items?.map((d) => (
        <div key={d.id} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 bg-white dark:bg-[#0c0c0f]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{d.title}</h3>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                {d.devotionalDate && <span>{format(new Date(d.devotionalDate), 'MMM d, yyyy')}</span>}
                <span className={`px-1.5 py-0.5 rounded font-semibold ${d.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {d.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => publishMutation.mutate({ id: d.id, isPublished: !d.isPublished })}
                disabled={publishMutation.isPending}
                title={d.isPublished ? 'Unpublish' : 'Publish'}
              >
                {d.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              {d.isPublished && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendToTelegramMutation.mutate({ id: d.id })}
                  disabled={sendToTelegramMutation.isPending}
                  title="Send to Telegram"
                >
                  {sendToTelegramMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => editingId === d.id ? setEditingId(null) : startEdit(d)}
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Devotional?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{d.title}&quot;. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => deleteMutation.mutate({ id: d.id })}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Inline edit form */}
          {editingId === d.id && (
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1">
                <Label htmlFor={`e-title-${d.id}`} className="text-xs">Title *</Label>
                <Input id={`e-title-${d.id}`} value={editForm.title || ''} onChange={setEdit('title')} />
                <FieldError msg={editErrors.title} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-scripture-${d.id}`} className="text-xs">Scripture</Label>
                <Input id={`e-scripture-${d.id}`} value={editForm.scripture || ''} onChange={setEdit('scripture')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-body-${d.id}`} className="text-xs">Body *</Label>
                <Textarea id={`e-body-${d.id}`} value={editForm.body || ''} onChange={setEdit('body')} rows={6} />
                <FieldError msg={editErrors.body} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-reflection-${d.id}`} className="text-xs">Reflection</Label>
                <Textarea id={`e-reflection-${d.id}`} value={editForm.reflection || ''} onChange={setEdit('reflection')} rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-prayer-${d.id}`} className="text-xs">Prayer</Label>
                <Textarea id={`e-prayer-${d.id}`} value={editForm.prayer || ''} onChange={setEdit('prayer')} rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-topic-${d.id}`} className="text-xs">Topic / Theme</Label>
                <Input id={`e-topic-${d.id}`} value={editForm.topic || ''} onChange={setEdit('topic')} />
                <FieldError msg={editErrors.topic} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-declarationOfFaith-${d.id}`} className="text-xs">Declaration of Faith</Label>
                <Textarea id={`e-declarationOfFaith-${d.id}`} value={editForm.declarationOfFaith || ''} onChange={setEdit('declarationOfFaith')} rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-dailyCapsule-${d.id}`} className="text-xs">Daily Capsule</Label>
                <Textarea id={`e-dailyCapsule-${d.id}`} value={editForm.dailyCapsule || ''} onChange={setEdit('dailyCapsule')} rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-brothersKeeper-${d.id}`} className="text-xs">Be Your Brother's Keeper</Label>
                <Textarea id={`e-brothersKeeper-${d.id}`} value={editForm.brothersKeeper || ''} onChange={setEdit('brothersKeeper')} rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-dailyBibleReading-${d.id}`} className="text-xs">Daily Bible Reading</Label>
                <Textarea id={`e-dailyBibleReading-${d.id}`} value={editForm.dailyBibleReading || ''} onChange={setEdit('dailyBibleReading')} rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-otherInfo-${d.id}`} className="text-xs">Other Information</Label>
                <Textarea id={`e-otherInfo-${d.id}`} value={editForm.otherInfo || ''} onChange={setEdit('otherInfo')} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={updateMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      ))}
      {data && (data.total ?? 0) > offset + PAGE_SIZE && (
        <Button variant="outline" size="sm" onClick={() => setOffset(o => o + PAGE_SIZE)} className="w-full mt-2">
          Load more ({(data.total ?? 0) - offset - PAGE_SIZE} remaining)
        </Button>
      )}
      <p className="text-xs text-zinc-400 text-center mt-1">
        Showing {Math.min(offset + PAGE_SIZE, data?.total ?? 0)} of {data?.total ?? 0}
      </p>
    </div>
  );
}

// ── Telegram Messages Tab ──────────────────────────────────────────────────────
function TelegramMessagesTab() {
  const { data } = trpc.telegram.messages.useQuery({ processed: false });
  const [pasteText, setPasteText] = useState('');

  const processMutation = trpc.telegram.processMessage.useMutation({
    onSuccess: () => toast.success('Message converted to devotional!'),
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const ingestPastedMutation = trpc.telegram.ingestPasted.useMutation({
    onSuccess: (data: { devotionalId: number | null; messageId: number }) => {
      if (data.devotionalId) {
        toast.success('Message processed! Devotional created.');
      } else {
        toast.success('Message saved — no devotional auto-created.');
      }
      setPasteText('');
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const messages = (data as { items?: Array<{ id: number; text?: string | null; receivedAt?: string | null }> } | undefined)?.items ?? [];

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Paste form */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 bg-white dark:bg-[#0c0c0f]">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Import a devotional from Telegram</h3>
        <Textarea
          rows={8}
          placeholder="Paste the Telegram message text here..."
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <Button
          size="sm"
          onClick={() => ingestPastedMutation.mutate({ text: pasteText })}
          disabled={ingestPastedMutation.isPending || pasteText.trim().length < 10}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950"
        >
          {ingestPastedMutation.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
          ) : (
            'Submit Message'
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        <span>— or paste manually —</span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Existing unprocessed messages */}
      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <p className="text-sm text-zinc-500">No unprocessed Telegram messages.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-white dark:bg-[#0c0c0f]">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-4">
              {msg.text || '(no text)'}
            </p>
            <Button
              size="sm"
              onClick={() => processMutation.mutate({ messageId: msg.id })}
              disabled={processMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              {processMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Converting...</>
              ) : (
                <><Send className="w-3.5 h-3.5" /> Convert to Devotional</>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DevotionalAdmin() {
  const { user } = useAuth();
  useDevotionalRealtime();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Admin — Devotionals
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Signed in as {user?.name || user?.email || 'Admin'} &middot; <span className="text-amber-600 font-semibold">{user?.role}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="new">
        <TabsList className="w-full sm:w-auto mb-4">
          <TabsTrigger value="new">New Devotion</TabsTrigger>
          <TabsTrigger value="manage">Manage Devotions</TabsTrigger>
          <TabsTrigger value="telegram">Import from Telegram</TabsTrigger>
          {(user?.role === 'elevated_admin' || user?.role === 'admin') && (
            <TabsTrigger value="teacher-assignment">Teacher Assignment</TabsTrigger>
          )}
          {user?.role === 'admin' && (
            <TabsTrigger value="visitor-log">Visitor Log</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="new">
          <NewDevotionTab />
        </TabsContent>

        <TabsContent value="manage">
          <ManageDevotionsTab />
        </TabsContent>

        <TabsContent value="telegram">
          <TelegramMessagesTab />
        </TabsContent>

        {(user?.role === 'elevated_admin' || user?.role === 'admin') && (
          <TabsContent value="teacher-assignment">
            <Suspense fallback={<div className="py-8 text-center text-sm text-zinc-400">Loading...</div>}>
              <TeacherAssignmentAdmin />
            </Suspense>
          </TabsContent>
        )}
        {user?.role === 'admin' && (
          <TabsContent value="visitor-log">
            <Suspense fallback={<div className="py-8 text-center text-sm text-zinc-400">Loading...</div>}>
              <AnonymousLogAdmin />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
