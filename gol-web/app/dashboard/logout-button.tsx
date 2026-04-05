'use client';

import { useRouter } from 'next/navigation';
import { useRouterRefresh } from '@/contexts/router-refresh-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();
  const { refresh } = useRouterRefresh();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    refresh();
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      size="sm"
      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 text-sm"
    >
      👤 ログアウト
    </Button>
  );
}

