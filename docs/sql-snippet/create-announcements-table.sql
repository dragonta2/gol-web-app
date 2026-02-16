-- ========================================
-- お知らせテーブル（全ユーザー共通表示・管理アカウントのみ追加可能）
-- ========================================
-- 前提: profiles に is_admin があること。
-- 実行: Supabase Dashboard → SQL Editor で実行。
-- ========================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_date TEXT NOT NULL,
  subject TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_order ON announcements(display_order, created_at DESC);

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS 有効化
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザーが閲覧可能
CREATE POLICY "Authenticated users can read announcements"
ON announcements FOR SELECT
TO authenticated
USING (true);

-- 追加・更新・削除は管理アカウントのみ（dragon5555555 / dragon.web.1105 または profiles.is_admin）
CREATE POLICY "Managers can insert announcements"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  (LOWER(auth.jwt() ->> 'email') IN ('dragon5555555@gmail.com', 'dragon.web.1105@gmail.com'))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Managers can update announcements"
ON announcements FOR UPDATE
TO authenticated
USING (
  (LOWER(auth.jwt() ->> 'email') IN ('dragon5555555@gmail.com', 'dragon.web.1105@gmail.com'))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Managers can delete announcements"
ON announcements FOR DELETE
TO authenticated
USING (
  (LOWER(auth.jwt() ->> 'email') IN ('dragon5555555@gmail.com', 'dragon.web.1105@gmail.com'))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 初回データ（テーブルが空のときのみ1件挿入）
INSERT INTO announcements (notice_date, subject, display_order)
SELECT '2026/02/16-月', 'GOL Web版 制作中です！！', 0
WHERE NOT EXISTS (SELECT 1 FROM announcements LIMIT 1);
