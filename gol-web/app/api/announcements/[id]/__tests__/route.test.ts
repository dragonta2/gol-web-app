/**
 * PATCH /api/announcements/[id]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '../route';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { canManageAnnouncements } from '@/lib/announcements';
import { createAnnouncementsServiceClient } from '@/lib/announcements-service-client';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/admin', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/announcements', () => ({
  canManageAnnouncements: vi.fn(),
}));

vi.mock('@/lib/announcements-service-client', () => ({
  createAnnouncementsServiceClient: vi.fn((c: unknown) => c),
}));

const validId = '550e8400-e29b-41d4-a716-446655440000';

describe('PATCH /api/announcements/[id]', () => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as Awaited<ReturnType<typeof createClient>>
    );
    vi.mocked(createAnnouncementsServiceClient).mockImplementation(
      (c: unknown) => c as typeof mockSupabase
    );
  });

  it('未認証のとき401', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await PATCH(
      new Request('http://localhost/api/announcements/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice_date: '2026/04/01-火', subject: '件' }),
      }),
      { params: Promise.resolve({ id: validId }) }
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('管理権限がないとき403', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' } },
      error: null,
    });
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(canManageAnnouncements).mockReturnValue(false);

    const res = await PATCH(
      new Request('http://localhost/api/announcements/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice_date: '2026/04/01-火', subject: '件' }),
      }),
      { params: Promise.resolve({ id: validId }) }
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('お知らせの更新は管理アカウントのみ可能です');
  });

  it('UUIDでないIDのとき400', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'dragon5555555@gmail.com' } },
      error: null,
    });
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(canManageAnnouncements).mockReturnValue(true);

    const res = await PATCH(
      new Request('http://localhost/api/announcements/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice_date: '2026/04/01-火', subject: '件' }),
      }),
      { params: Promise.resolve({ id: 'not-a-uuid' }) }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('不正なお知らせIDです');
  });

  it('日付・件名が空のとき400', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'dragon5555555@gmail.com' } },
      error: null,
    });
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(canManageAnnouncements).mockReturnValue(true);

    const res = await PATCH(
      new Request('http://localhost/api/announcements/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice_date: '', subject: '件' }),
      }),
      { params: Promise.resolve({ id: validId }) }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('日付と件名は必須です');
  });

  it('更新成功時200', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'dragon5555555@gmail.com' } },
      error: null,
    });
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(canManageAnnouncements).mockReturnValue(true);

    const updated = {
      id: validId,
      notice_date: '2026/04/08-水',
      subject: '更新後',
      display_order: 0,
      created_at: '2026-04-01T00:00:00Z',
    };

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const res = await PATCH(
      new Request('http://localhost/api/announcements/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notice_date: '2026/04/08-水',
          subject: '更新後',
        }),
      }),
      { params: Promise.resolve({ id: validId }) }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.announcement).toEqual(updated);
  });

  it('対象なしのとき404', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'dragon5555555@gmail.com' } },
      error: null,
    });
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(canManageAnnouncements).mockReturnValue(true);

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const res = await PATCH(
      new Request('http://localhost/api/announcements/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notice_date: '2026/04/08-水',
          subject: '更新後',
        }),
      }),
      { params: Promise.resolve({ id: validId }) }
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('対象のお知らせが見つかりません');
  });
});
