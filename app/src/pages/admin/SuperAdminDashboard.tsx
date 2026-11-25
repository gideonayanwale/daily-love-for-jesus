import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { ShieldCheck, Loader2, UserPlus } from "lucide-react";

export default function SuperAdminDashboard() {
  const [userId, setUserId] = useState("");
  const utils = trpc.useUtils();
  const promote = trpc.auth.promoteToElevatedAdmin.useMutation({
    onSuccess: () => {
      toast.success("Elevated administrator appointed.");
      setUserId("");
      void utils.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = userId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
      toast.error("Enter a valid account UUID.");
      return;
    }
    promote.mutate({ userId: normalized });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600">Highest platform authority</p>
        <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">Super administrator</h1>
        <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">Appoint elevated administrators. This operation is enforced by a superadmin-only server procedure and accepts only accounts with the standard user role.</p>
      </header>
      <section className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"><UserPlus className="h-5 w-5" /></div><div><h2 className="font-bold">Appoint elevated administrator</h2><p className="text-xs text-zinc-500">Use the target account's user UUID.</p></div></div>
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="target-user-id" className="block text-sm font-medium">User UUID</label>
          <input id="target-user-id" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-500 dark:border-zinc-700" />
          <button type="submit" disabled={promote.isPending || !userId.trim()} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {promote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Appoint elevated admin
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-500">The action is audit-logged. Self-promotion, non-standard target roles, and requests from non-superadmins are rejected.</p>
      </section>
    </main>
  );
}
