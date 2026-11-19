import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  BookOpen, CalendarHeart, Check, ChevronRight, Compass,
  Heart, LayoutDashboard, LogIn, Menu, Music, Settings,
  Users, X,
} from 'lucide-react';

type Props = { userId?: string; userName?: string | null };

const steps = [
  {
    title: 'Welcome to Daily Love For Jesus',
    body: 'Your home for Scripture, daily devotionals, worship, and Christian fellowship. You can explore public content without creating an account.',
    action: 'Explore today',
    path: '/',
    icon: Heart,
  },
  {
    title: 'Read and study the Bible',
    body: 'Open the Bible, choose a book and chapter, and read at your own pace. Public Scripture content remains available to every visitor.',
    action: 'Open the Bible',
    path: '/bible',
    icon: BookOpen,
  },
  {
    title: 'Build a daily devotional rhythm',
    body: 'Read devotionals and hymns, revisit useful teaching, and use the community area to discover fellowship opportunities.',
    action: 'Browse devotionals',
    path: '/devotionals',
    icon: CalendarHeart,
  },
  {
    title: 'Sign in when you want personal features',
    body: 'An account lets you keep your profile, favourites, reading progress, and other personal activity in sync. Signing in never changes your role or grants administrative access.',
    action: 'View my account',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
];

export default function ExplorePanel({ userId, userName }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!userId) return;
    try {
      const key = `dlfj:onboarding:v1:${userId}`;
      if (window.localStorage.getItem(key) !== 'complete') setTourOpen(true);
    } catch {
      // Onboarding remains manually available if browser storage is disabled.
    }
  }, [userId]);

  const finishTour = () => {
    if (userId) {
      try { window.localStorage.setItem(`dlfj:onboarding:v1:${userId}`, 'complete'); } catch {}
    }
    setTourOpen(false);
  };

  const go = (path: string) => {
    setPanelOpen(false);
    setTourOpen(false);
    navigate(path);
  };

  const Icon = steps[step].icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        aria-label="Open explore and navigation panel"
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <Compass className="h-4 w-4 text-amber-500" />
        <span className="hidden sm:inline">Explore</span>
        <Menu className="h-4 w-4" />
      </button>

      {panelOpen && (
        <div className="fixed inset-0 z-[70]">
          <button aria-label="Close navigation panel" onClick={() => setPanelOpen(false)} className="absolute inset-0 bg-black/50" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-[#101014]" aria-label="Explore navigation">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Explore</p>
                <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">Where would you like to go?</h2>
              </div>
              <button onClick={() => setPanelOpen(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              {userId ? `Welcome back${userName ? `, ${userName}` : ''}. Your personal tools are ready.` : 'You are exploring as a visitor. Public Bible and devotional content is available without signing in.'}
            </p>
            <nav className="mt-6 space-y-1">
              {[
                { label: 'Today', path: '/', icon: Heart, detail: 'Daily inspiration and featured content' },
                { label: 'Bible', path: '/bible', icon: BookOpen, detail: 'Browse books, chapters and verses' },
                { label: 'Devotionals', path: '/devotionals', icon: CalendarHeart, detail: 'Read daily spiritual guidance' },
                { label: 'Hymns', path: '/hymns', icon: Music, detail: 'Explore worship and hymns' },
                { label: 'Community', path: '/community', icon: Users, detail: 'Discover fellowship features' },
                ...(userId ? [{ label: 'My dashboard', path: '/dashboard', icon: LayoutDashboard, detail: 'Your personal activity and progress' }] : []),
                ...(userId ? [{ label: 'Settings', path: '/settings', icon: Settings, detail: 'Manage your account and preferences' }] : []),
              ].map((item) => {
                const ItemIcon = item.icon;
                const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return (
                  <button key={item.path} onClick={() => go(item.path)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${active ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900'}`}>
                    <ItemIcon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</span></span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button onClick={() => { setPanelOpen(false); setStep(0); setTourOpen(true); }} className="flex w-full items-center gap-2 rounded-xl border border-amber-300 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30">
                <Compass className="h-4 w-4" /> Take the getting-started tour
              </button>
              {!userId && <button onClick={() => go('/login')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-600"><LogIn className="h-4 w-4" /> Sign in or create an account</button>}
            </div>
          </aside>
        </div>
      )}

      {tourOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="getting-started-title">
          <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#111116]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Getting started · {step + 1} of {steps.length}</span>
              <button onClick={finishTour} aria-label="Close getting started tour" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Icon className="h-6 w-6" /></div>
            <h2 id="getting-started-title" className="mt-4 text-2xl font-extrabold text-zinc-900 dark:text-white">{steps[step].title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{steps[step].body}</p>
            <div className="mt-6 flex gap-1.5" aria-label="Tour progress">{steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-amber-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />)}</div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => step === 0 ? finishTour() : setStep((value) => value - 1)} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">{step === 0 ? 'Skip tour' : 'Back'}</button>
              <div className="flex gap-2">
                {step < steps.length - 1 ? <button onClick={() => setStep((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-600">Next <ChevronRight className="h-4 w-4" /></button> : <button onClick={() => { finishTour(); go('/bible'); }} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-600"><Check className="h-4 w-4" /> Start exploring</button>}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
