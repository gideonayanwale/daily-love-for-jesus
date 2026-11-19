import { useEffect } from 'react';
import { trpc } from '@/providers/trpc';
import { supabase } from '@/lib/supabase';

export default function useDevotionalRealtime(): void {
  const utils = trpc.useUtils();

  useEffect(() => {
    const publicChannel = supabase
      .channel('devotionals')
      .on('broadcast', { event: 'devotional_changed' }, () => {
        utils.devotional.list.invalidate();
        utils.devotional.today.invalidate();
      })
      .subscribe();

    const adminChannel = supabase
      .channel('admin:devotionals')
      .on('broadcast', { event: 'devotional_changed' }, () => {
        utils.devotional.adminList.invalidate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(publicChannel);
      supabase.removeChannel(adminChannel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
