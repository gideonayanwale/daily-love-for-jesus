import { Link } from "react-router";
import { BookOpen, Send, Users, ShieldCheck, ArrowUpRight } from "lucide-react";

const tools = [
  { title: "Devotional publishing", description: "Create, review, publish, and manage devotional content.", href: "/admin/devotionals", icon: BookOpen },
  { title: "Telegram ingestion", description: "Open the devotional administration workspace for Telegram message ingestion and review.", href: "/admin/devotionals", icon: Send },
  { title: "Teacher assignments", description: "Manage Sunday School teacher assignments using the existing assignment controls.", href: "/admin/devotionals", icon: Users },
];

export default function ElevatedAdminDashboard() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Platform operations</p>
        <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">Elevated administrator</h1>
        <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">Manage the platform tools currently available to elevated administrators. Community ownership remains scoped to individual communities; this role does not appoint other elevated administrators.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {tools.map(({ title, description, href, icon: Icon }) => (
          <Link key={title} to={href} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon className="h-5 w-5" /></div>
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 min-h-12 text-sm text-zinc-500">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">Open tool <ArrowUpRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </section>
      <aside className="flex gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-sm text-zinc-500">Only a superadmin can appoint elevated administrators. Community owner and Sunday School administrator appointments must be performed through scoped membership controls, not by changing a user's global platform role.</p>
      </aside>
    </main>
  );
}
