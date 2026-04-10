'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type AnnouncementItem = {
  id: string;
  notice_date: string;
  subject: string;
  display_order?: number;
  created_at?: string;
};

/** お知らせ一覧＋追加フォーム（ダッシュボードタブ・/announcements ページで共通利用） */
export function AnnouncementsContent({
  canManageAnnouncements = false,
}: {
  canManageAnnouncements?: boolean;
}) {
  const [list, setList] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [subject, setSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/announcements', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '取得に失敗しました');
      }
      const data = await res.json();
      const raw = data.announcements ?? [];
      // 日付の降順（新しい順）。notice_date は "YYYY/MM/DD-曜日" なので先頭10文字で比較
      const datePart = (s: string) => (s || '').slice(0, 10);
      const sorted = [...raw].sort((a, b) =>
        datePart(b.notice_date).localeCompare(datePart(a.notice_date))
      );
      setList(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'お知らせの取得に失敗しました');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = date.trim();
    const s = subject.trim();
    if (!d || !s) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice_date: d, subject: s }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parts = [data.error, data.details, data.hint].filter(
          (x: unknown) => typeof x === 'string' && x.length > 0
        ) as string[];
        throw new Error(parts.length > 0 ? parts.join(' — ') : '追加に失敗しました');
      }
      setDate('');
      setSubject('');
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'お知らせの追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: AnnouncementItem) => {
    setEditingId(item.id);
    setEditDate(item.notice_date);
    setEditSubject(item.subject);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate('');
    setEditSubject('');
  };

  const handleSaveEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const d = editDate.trim();
    const s = editSubject.trim();
    if (!d || !s) return;
    setSavingEditId(id);
    setError(null);
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice_date: d, subject: s }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parts = [data.error, data.details, data.hint].filter(
          (x: unknown) => typeof x === 'string' && x.length > 0
        ) as string[];
        throw new Error(parts.length > 0 ? parts.join(' — ') : '更新に失敗しました');
      }
      cancelEdit();
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'お知らせの更新に失敗しました');
    } finally {
      setSavingEditId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
        {loading ? (
          <p className="text-zinc-400 text-sm">読み込み中…</p>
        ) : error && list.length === 0 ? (
          <p className="text-amber-400 text-sm">{error}</p>
        ) : (
          <>
            {error && (
              <p className="text-amber-400 text-sm mb-4">{error}</p>
            )}
            <ul className="space-y-4">
              {list.map((item) => (
                <li
                  key={item.id}
                  className="border-b border-zinc-800 last:border-0 pb-4 last:pb-0 first:pt-0"
                >
                  {canManageAnnouncements && editingId === item.id ? (
                    <form
                      onSubmit={(e) => handleSaveEdit(e, item.id)}
                      className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
                    >
                      <div>
                        <Label
                          htmlFor={`notice-edit-date-${item.id}`}
                          className="text-zinc-300"
                        >
                          日付
                        </Label>
                        <Input
                          id={`notice-edit-date-${item.id}`}
                          type="text"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="mt-1 bg-zinc-800 border-zinc-600 text-zinc-100"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`notice-edit-subject-${item.id}`}
                          className="text-zinc-300"
                        >
                          件名
                        </Label>
                        <Input
                          id={`notice-edit-subject-${item.id}`}
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="mt-1 bg-zinc-800 border-zinc-600 text-zinc-100"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          className="bg-cyan-600 hover:bg-cyan-700"
                          disabled={savingEditId === item.id}
                        >
                          {savingEditId === item.id ? '保存中…' : '保存'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-zinc-600 bg-zinc-800 text-zinc-200"
                          disabled={savingEditId === item.id}
                          onClick={cancelEdit}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-zinc-400 mb-1">
                          {item.notice_date}
                        </div>
                        <div className="text-zinc-100 font-medium wrap-break-word">
                          {item.subject}
                        </div>
                      </div>
                      {canManageAnnouncements ? (
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="shrink-0 inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                          aria-label={`お知らせ「${item.subject.slice(0, 40)}${item.subject.length > 40 ? '…' : ''}」を編集`}
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden />
                          編集
                        </button>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {list.length === 0 && !error && (
              <p className="text-zinc-500 text-sm">お知らせはまだありません。</p>
            )}
          </>
        )}
      </section>

      {canManageAnnouncements && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            お知らせを追加（DBに保存・全ユーザーに表示）
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label htmlFor="notice-date-tab" className="text-zinc-300">
                日付
              </Label>
              <Input
                id="notice-date-tab"
                type="text"
                placeholder="例: 2026/02/16-月"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 bg-zinc-800 border-zinc-600 text-zinc-100"
              />
            </div>
            <div>
              <Label htmlFor="notice-subject-tab" className="text-zinc-300">
                件名
              </Label>
              <Input
                id="notice-subject-tab"
                type="text"
                placeholder="件名を入力"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 bg-zinc-800 border-zinc-600 text-zinc-100"
              />
            </div>
            <Button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={submitting}
            >
              {submitting ? '追加中…' : '追加'}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
