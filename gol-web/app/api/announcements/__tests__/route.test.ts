/**
 * お知らせAPIのテスト（データベース操作のモック）
 * GET: 認証必須・一覧取得 / POST: 管理アカウントのみ追加可能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { canManageAnnouncements } from '@/lib/announcements';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/admin', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/announcements', () => ({
  canManageAnnouncements: vi.fn(),
}));

describe('/api/announcements', () => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as Awaited<ReturnType<typeof createClient>>);
  });

  describe('GET', () => {
    it('未認証のとき401を返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('認証が必要です');
    });

    it('認証済みのときお知らせ一覧を返す', async () => {
      const mockUser = { id: 'user-123' };
      const mockRows = [
        { id: 'a1', notice_date: '2026/02/16-月', subject: 'テスト', display_order: 0, created_at: '2026-02-16T00:00:00Z' },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const chain: { select: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn> } = {
        select: vi.fn(),
        order: vi.fn(),
      };
      chain.select.mockReturnValue(chain);
      chain.order.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: mockRows, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.announcements).toHaveLength(1);
      expect(data.announcements[0].subject).toBe('テスト');
    });
  });

  describe('POST（データベース操作）', () => {
    it('未認証のとき401を返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const res = await POST(
        new Request('http://localhost/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notice_date: '2026/02/16-月', subject: '件名' }),
        })
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('認証が必要です');
    });

    it('管理権限がないとき403を返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-456', email: 'normal@example.com' } },
        error: null,
      });
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(canManageAnnouncements).mockReturnValue(false);

      const res = await POST(
        new Request('http://localhost/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notice_date: '2026/02/16-月', subject: '件名' }),
        })
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('お知らせの追加は管理アカウントのみ可能です');
    });

    it('日付・件名が空のとき400を返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-mgr', email: 'dragon5555555@gmail.com' } },
        error: null,
      });
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(canManageAnnouncements).mockReturnValue(true);

      const res = await POST(
        new Request('http://localhost/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notice_date: '', subject: '件名' }),
        })
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('日付と件名は必須です');
    });

    it('管理権限あり・有効なbodyのときDBに挿入して200を返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-mgr', email: 'dragon5555555@gmail.com' } },
        error: null,
      });
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(canManageAnnouncements).mockReturnValue(true);

      const mockInserted = {
        id: 'new-id',
        notice_date: '2026/02/16-月',
        subject: '追加テスト',
        display_order: 1,
        created_at: '2026-02-16T12:00:00Z',
      };

      const chain1 = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { display_order: 0 }, error: null }),
      };
      const chain2 = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockInserted, error: null }),
      };
      mockSupabase.from.mockReturnValueOnce(chain1).mockReturnValueOnce(chain2);

      const res = await POST(
        new Request('http://localhost/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notice_date: '2026/02/16-月', subject: '追加テスト' }),
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.announcement).toEqual(mockInserted);
    });
  });
});
