import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../points-exp/route';
import { createClient } from '@/lib/supabase/server';

// Supabaseのモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('/api/stats/points-exp', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = new Request('http://localhost/api/stats/points-exp?days=30');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('returns data when user is authenticated', async () => {
    const mockUser = { id: 'user-123' };
    const mockDailyLogs = [
      {
        log_date: '2024-01-01',
        ai_points_earned: 10,
        ai_exp_body: 5,
        ai_exp_mind: 3,
        ai_exp_spirit: 2,
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockReturnThis();
    const mockLte = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockDailyLogs,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte,
      order: mockOrder,
    });

    const request = new Request('http://localhost/api/stats/points-exp?days=30');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.data[0]).toEqual({
      date: '2024-01-01',
      points: 10,
      expBody: 5,
      expMind: 3,
      expSpirit: 2,
    });
  });

  it('handles null values correctly', async () => {
    const mockUser = { id: 'user-123' };
    const mockDailyLogs = [
      {
        log_date: '2024-01-01',
        ai_points_earned: null,
        ai_exp_body: null,
        ai_exp_mind: null,
        ai_exp_spirit: null,
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockReturnThis();
    const mockLte = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockDailyLogs,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte,
      order: mockOrder,
    });

    const request = new Request('http://localhost/api/stats/points-exp?days=30');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data[0]).toEqual({
      date: '2024-01-01',
      points: 0,
      expBody: 0,
      expMind: 0,
      expSpirit: 0,
    });
  });
});
