import { useEffect } from 'react';
import { trpc } from '@/providers/trpc';
import { supabase } from '@/lib/supabase';

export default function useDevotionalRealtime(): void {
  const utils = trpc.useUtils();

  useEffect(() => {
    const channel = supabase
      .channel('devotionals')
      .on('broadcast', { event: 'devotional_changed' }, () => {
        utils.devotional.list.invalidate();
        utils.devotional.today.invalidate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
