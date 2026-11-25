import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Loader2, Users, ArrowUpRight, ShieldCheck, Plus, Save } from "lucide-react";

type CommunitySummary = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

function OwnedCommunityCard({ community }: { community: CommunitySummary }) {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [location, setLocation] = useState(community.location ?? "");
  const [groupName, setGroupName] = useState("");
  const utils = trpc.useUtils();

  const groups = trpc.community.ownedCommunityGroups.useQuery({ communityId: community.id });
  const update = trpc.community.updateOwnedCommunity.useMutation({
    onSuccess: () => {
      toast.success("Community details updated.");
      void utils.community.myCommunities.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const createGroup = trpc.community.createOwnedGroup.useMutation({
    onSuccess: () => {
      toast.success("Group created.");
      setGroupName("");
      void utils.community.ownedCommunityGroups.invalidate({ communityId: community.id });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveCommunity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update.mutate({
      communityId: community.id,
      name: name.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
    });
  };

  const addGroup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!groupName.trim()) return;
    createGroup.mutate({
      communityId: community.id,
      name: groupName.trim(),
      category: "Sunday School",
    });
  };

  return (
    <article className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Users className="h-5 w-5" /></div>
        <div className="min-w-0"><h2 className="truncate font-bold">{community.name}</h2><p className="text-xs text-zinc-500">{community.location || "Location not set"}</p></div>
      </div>

      <form onSubmit={saveCommunity} className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold">Community profile</h3>
        <label className="block text-xs font-medium" htmlFor={`name-${community.id}`}>Name</label>
        <input id={`name-${community.id}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={255} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" required />
        <label className="block text-xs font-medium" htmlFor={`description-${community.id}`}>Description</label>
        <textarea id={`description-${community.id}`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={3} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
        <label className="block text-xs font-medium" htmlFor={`location-${community.id}`}>Location</label>
        <input id={`location-${community.id}`} value={location} onChange={(event) => setLocation(event.target.value)} maxLength={255} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
        <button type="submit" disabled={update.isPending} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">{update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save community</button>
      </form>

      <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <h3 className="mb-3 text-sm font-semibold">Sunday School groups</h3>
        {groups.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : groups.error ? <p className="text-xs text-red-600">Could not load groups: {groups.error.message}</p> : (
          <ul className="mb-4 space-y-2">
            {groups.data?.length ? groups.data.map((group) => <li key={group.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"><span>{group.name} <span className="text-xs text-zinc-500">· {group.category}</span></span><span className="text-xs text-zinc-500">{group.status}</span></li>) : <li className="text-xs text-zinc-500">No groups have been created for this community.</li>}
          </ul>
        )}
        <form onSubmit={addGroup} className="flex flex-col gap-2 sm:flex-row">
          <input aria-label="New Sunday School group name" placeholder="New group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={255} className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" required />
          <button type="submit" disabled={!groupName.trim() || createGroup.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold dark:border-zinc-700 disabled:opacity-50">{createGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create group</button>
        </form>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
        <span className="font-semibold text-emerald-600">Owner access verified</span>
        <Link to="/community" className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:underline">Open community <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>
    </article>
  );
}

export default function CommunityOwnerDashboard() {
  const { data: memberships, isLoading, error } = trpc.community.myCommunities.useQuery();
  const owned = memberships?.filter((community) => community.role === "COMMUNITY_OWNER") ?? [];

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  if (error) return <div className="mx-auto max-w-2xl p-6 text-sm text-red-600" role="alert">Your community ownership could not be verified. Refresh the page and try again.</div>;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Community workspace</p>
        <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">Your communities</h1>
        <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">Edit community profiles and create groups only within communities where your active membership grants the Community Owner role. These permissions do not grant platform-wide administration.</p>
      </header>
      {owned.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <h2 className="font-semibold">No owned communities found</h2>
          <p className="mt-2 text-sm text-zinc-500">An elevated administrator must assign community ownership before this workspace becomes active.</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-amber-600 hover:underline" to="/community">Explore community</Link>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-2">
          {owned.map((community) => <OwnedCommunityCard key={community.id} community={community} />)}
        </section>
      )}
    </main>
  );
}
