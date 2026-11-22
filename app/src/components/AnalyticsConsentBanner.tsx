import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { getAnalyticsConsent, setAnalyticsConsent, type AnalyticsConsent } from '@/lib/analytics';
import { ShieldCheck, X } from 'lucide-react';

export default function AnalyticsConsentBanner({ visible }: { visible: boolean }) {
  const [consent, setConsent] = useState<AnalyticsConsent>(() => getAnalyticsConsent());
  const utils = trpc.useUtils();

  if (!visible || consent !== null) return null;

  const choose = (value: Exclude<AnalyticsConsent, null>) => {
    setAnalyticsConsent(value);
    setConsent(value);
    if (value === 'granted') void utils.invalidate();
  };

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6"
      aria-label="Anonymous analytics privacy choice"
      role="region"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#111116] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Help us improve Daily Love For Jesus</p>
            <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
              Optional anonymous analytics records pages visited, coarse browser details and a one-way IP-derived code. Raw IP addresses are not stored. Your access to public Bible, devotional and hymnal content does not depend on this choice.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={() => choose('denied')} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
            Continue without analytics
          </button>
          <button type="button" onClick={() => choose('granted')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-600">
            Allow anonymous analytics
          </button>
        </div>
      </div>
    </section>
  );
}
