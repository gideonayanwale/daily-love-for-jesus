import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  BookOpen, CalendarHeart, Check, ChevronRight, Compass, Heart,
  LayoutDashboard, LogIn, Music, X,
} from 'lucide-react';

type Props = { userId?: string; userName?: string | null; userRole?: string | null };
type Position = { x: number; y: number };

const steps = [
  { title: 'Welcome to Daily Love For Jesus', body: 'Explore Scripture, daily devotionals, worship and Christian fellowship. You can read public content without creating an account.', action: 'Explore today', path: '/', icon: Heart },
  { title: 'Read and study the Bible', body: 'Choose a book and chapter, read Scripture and explore translations. Bible reading is available to every visitor.', action: 'Open the Bible', path: '/bible', icon: BookOpen },
  { title: 'Build a daily devotional rhythm', body: 'Read published devotionals and browse hymns. Public spiritual resources do not require registration.', action: 'Browse devotionals', path: '/devotionals', icon: CalendarHeart },
  { title: 'Create an account when you need personal features', body: 'An account can save your favourites, profile and reading activity. Provider and administrative access is granted separately by authorized role assignment.', action: 'Sign in', path: '/login', icon: LayoutDashboard },
];

export default function ExplorePanel({ userId }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!userId) return;
    try {
      const key = `dlfj:onboarding:v2:${userId}`;
      if (window.localStorage.getItem(key) !== 'complete') {
        const timer = window.setTimeout(() => setTourOpen(true), 700);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // The guide remains available from its floating control.
    }
  }, [userId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
        setTourOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const finishTour = () => {
    if (userId) {
      try { window.localStorage.setItem(`dlfj:onboarding:v2:${userId}`, 'complete'); } catch { /* optional persistence */ }
    }
    setTourOpen(false);
  };

  const go = (path: string) => {
    setExpanded(false);
    setTourOpen(false);
    navigate(path);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) current.moved = true;
    if (!current.moved) return;
    const width = fabRef.current?.offsetWidth ?? 52;
    const height = fabRef.current?.offsetHeight ?? 52;
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - width - 8, current.originX + dx)),
      y: Math.max(8, Math.min(window.innerHeight - height - 8, current.originY + dy)),
    });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    const wasDragged = current.moved;
    drag.current = null;
    if (!wasDragged) setExpanded(value => !value);
  };

  const StepIcon = steps[step].icon;

  return (
    <>
      <div className="fixed z-[65]" style={position ? { left: position.x, top: position.y } : { right: 'max(1rem, env(safe-area-inset-right))', bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))' }}>
        {expanded && (
          <section className="absolute bottom-16 right-0 flex max-h-[min(72vh,34rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-[#111116]" aria-label="Explore and navigation guide">
            <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">Daily Love For Jesus</p>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Explore the app</h2>
              </div>
              <button type="button" onClick={() => setExpanded(false)} aria-label="Collapse guide" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </header>
            <nav className="space-y-1 overflow-y-auto p-3">
              {[
                { label: 'Today', detail: 'Daily welcome and featured content', path: '/', icon: Heart },
                { label: 'Bible', detail: 'Read books, chapters and verses', path: '/bible', icon: BookOpen },
                { label: 'Devotionals', detail: 'Read published daily devotionals', path: '/devotionals', icon: CalendarHeart },
                { label: 'Hymnal', detail: 'Browse hymns and categories', path: '/hymns', icon: Music },
                ...(userId ? [{ label: 'My dashboard', detail: 'Your account and personal activity', path: '/dashboard', icon: LayoutDashboard }] : [{ label: 'Sign in or register', detail: 'Create an account for personal features', path: '/login', icon: LogIn }]),
              ].map(item => {
                const ItemIcon = item.icon;
                const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return <button key={item.path} type="button" onClick={() => go(item.path)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${active ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900'}`}>
                  <ItemIcon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</span></span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                </button>;
              })}
            </nav>
            <footer className="border-t border-zinc-200 p-3 dark:border-zinc-800">
              <button type="button" onClick={() => { setStep(0); setTourOpen(true); setExpanded(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 px-3 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30"><Compass className="h-4 w-4" /> Take the getting-started tour</button>
            </footer>
          </section>
        )}
        <button ref={fabRef} type="button" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null; }} aria-label={expanded ? 'Collapse floating explore guide' : 'Expand floating explore guide; drag to move'} aria-expanded={expanded} title="Drag to move · Click to expand" className="flex h-13 w-13 touch-none select-none items-center justify-center rounded-full border border-amber-300 bg-amber-500 text-zinc-950 shadow-xl shadow-amber-900/20 transition-transform hover:scale-105 active:scale-95" style={{ width: 52, height: 52 }}>
          {expanded ? <X className="h-5 w-5" /> : <Compass className="h-6 w-6" />}
        </button>
        {!expanded && <span className="pointer-events-none absolute right-0 top-14 whitespace-nowrap rounded-full bg-zinc-900/90 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg">Explore · drag me</span>}
      </div>

      {tourOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="getting-started-title">
          <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#111116]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Getting started · {step + 1} of {steps.length}</span>
              <button type="button" onClick={finishTour} aria-label="Close getting started tour" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><StepIcon className="h-6 w-6" /></div>
            <h2 id="getting-started-title" className="mt-4 text-2xl font-extrabold text-zinc-900 dark:text-white">{steps[step].title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{steps[step].body}</p>
            <div className="mt-6 flex gap-1.5" aria-label="Tour progress">{steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-amber-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />)}</div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => step === 0 ? finishTour() : setStep(value => value - 1)} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">{step === 0 ? 'Skip tour' : 'Back'}</button>
              {step < steps.length - 1 ? <button type="button" onClick={() => setStep(value => value + 1)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-600">Next <ChevronRight className="h-4 w-4" /></button> : <button type="button" onClick={() => { finishTour(); go('/bible'); }} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-600"><Check className="h-4 w-4" /> Start exploring</button>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
