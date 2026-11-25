import { useEffect } from 'react';
import { trpc } from '@/providers/trpc-client';
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

    let adminChannel: ReturnType<typeof supabase.channel> | null = null;
    const syncAdminChannel = (session: { access_token: string } | null) => {
      if (session && !adminChannel) {
        adminChannel = supabase
          .channel('admin:devotionals')
          .on('broadcast', { event: 'devotional_changed' }, () => {
            utils.devotional.adminList.invalidate();
          })
          .subscribe();
      } else if (!session && adminChannel) {
        supabase.removeChannel(adminChannel);
        adminChannel = null;
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAdminChannel(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(publicChannel);
      if (adminChannel) supabase.removeChannel(adminChannel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
