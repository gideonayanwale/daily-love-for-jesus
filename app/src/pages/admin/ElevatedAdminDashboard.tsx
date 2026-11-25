import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { BookOpen, Send, Users, ShieldCheck, ArrowUpRight, Loader2, Megaphone, Crown } from "lucide-react";

const tools = [
  { title: "Devotional publishing", description: "Create, review, publish, and manage devotional content.", href: "/admin/devotionals", icon: BookOpen },
  { title: "Telegram ingestion", description: "Import Telegram devotional messages, review pending messages, and process them.", href: "/admin/devotionals", icon: Send },
  { title: "Teacher assignments", description: "Assign Sunday School teachers to active groups using scoped group membership.", href: "/admin/devotionals", icon: Users },
];

export default function ElevatedAdminDashboard() {
  const [communityId, setCommunityId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const utils = trpc.useUtils();

  const communities = trpc.communityManagement.listActiveCommunities.useQuery();
  const members = trpc.communityManagement.listActiveMembers.useQuery(
    { communityId },
    { enabled: !!communityId },
  );

  const appointOwner = trpc.communityManagement.appointOwner.useMutation({
    onSuccess: () => {
      toast.success("Community owner appointed.");
      setMemberId("");
      void utils.communityManagement.listActiveMembers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const broadcast = trpc.notification.broadcastToUsers.useMutation({
    onSuccess: (result) => {
      toast.success(`Notification recorded for ${result.recipientCount} users; dispatched to ${result.devicesSent} devices.`);
      setTitle("");
      setBody("");
    },
    onError: (error) => toast.error(error.message),
  });

  const submitOwner = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!communityId || !memberId) return;
    appointOwner.mutate({ communityId, userId: memberId });
  };

  const submitBroadcast = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    broadcast.mutate({ title: title.trim(), body: body.trim() });
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Platform operations</p>
        <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">Elevated administrator</h1>
        <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">Manage platform devotional operations, assign community ownership, and send application-wide notifications. Community ownership remains scoped to individual communities.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {tools.map(({ title: toolTitle, description, href, icon: Icon }) => (
          <Link key={toolTitle} to={href} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon className="h-5 w-5" /></div>
            <h2 className="font-bold">{toolTitle}</h2>
            <p className="mt-2 min-h-12 text-sm text-zinc-500">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">Open tool <ArrowUpRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Crown className="h-5 w-5" /></div><div><h2 className="font-bold">Appoint community owner</h2><p className="text-xs text-zinc-500">Only active members of the selected community are eligible.</p></div></div>
          {communities.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : communities.error ? <p className="text-sm text-red-600">Could not load communities: {communities.error.message}</p> : (
            <form onSubmit={submitOwner} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="owner-community">Community</label>
              <select id="owner-community" value={communityId} onChange={(event) => { setCommunityId(event.target.value); setMemberId(""); }} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">
                <option value="">Select a community</option>
                {communities.data?.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
              </select>
              <label className="block text-sm font-medium" htmlFor="owner-member">Active member</label>
              <select id="owner-member" value={memberId} onChange={(event) => setMemberId(event.target.value)} disabled={!communityId || members.isLoading} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700">
                <option value="">Select an active member</option>
                {members.data?.map((member) => <option key={member.userId} value={member.userId}>{member.name || member.email || member.userId} · {member.role}</option>)}
              </select>
              <button type="submit" disabled={!communityId || !memberId || appointOwner.isPending} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50">{appointOwner.isPending ? "Assigning…" : "Appoint owner"}</button>
            </form>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Megaphone className="h-5 w-5" /></div><div><h2 className="font-bold">Notify all application users</h2><p className="text-xs text-zinc-500">Creates in-app notifications and dispatches available device push tokens.</p></div></div>
          <form onSubmit={submitBroadcast} className="space-y-3">
            <label htmlFor="broadcast-title" className="block text-sm font-medium">Notification title</label>
            <input id="broadcast-title" maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" required />
            <label htmlFor="broadcast-body" className="block text-sm font-medium">Message</label>
            <textarea id="broadcast-body" maxLength={2000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} className="w-full resize-y rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" required />
            <button type="submit" disabled={!title.trim() || !body.trim() || broadcast.isPending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{broadcast.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Send notification</button>
          </form>
        </div>
      </section>

      <aside className="flex gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-sm text-zinc-500">Only a superadmin can appoint elevated administrators. Community owner appointments update a community membership role; they do not change the user's global platform role. Sunday School teacher assignment remains group-scoped.</p>
      </aside>
    </main>
  );
}
