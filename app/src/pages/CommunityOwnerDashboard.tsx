import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Loader2, Users, ArrowUpRight, ShieldCheck } from "lucide-react";

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
        <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">This workspace shows only communities where your active membership grants the Community Owner role. It does not grant platform-wide administration.</p>
      </header>
      {owned.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <h2 className="font-semibold">No owned communities found</h2>
          <p className="mt-2 text-sm text-zinc-500">A superadmin or authorized platform administrator must assign community ownership before this workspace becomes active.</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-amber-600 hover:underline" to="/community">Explore community</Link>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {owned.map((community) => (
            <article key={community.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Users className="h-5 w-5" /></div>
                <div className="min-w-0"><h2 className="truncate font-bold">{community.name}</h2><p className="text-xs text-zinc-500">{community.location || "Location not set"}</p></div>
              </div>
              <p className="line-clamp-3 min-h-12 text-sm text-zinc-500">{community.description || "No community description has been added."}</p>
              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
                <span className="font-semibold text-emerald-600">Owner access verified</span>
                <Link to="/community" className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:underline">Open community <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
