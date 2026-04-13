-- ========================================
-- お知らせの件名を「Gamification Of Life（GOL） Web版 ただいま制作中です！！！」に更新
-- ========================================
-- 実行: Supabase Dashboard → SQL Editor で実行。
-- ========================================

UPDATE announcements
SET subject = 'Gamification Of Life（GOL） Web版 ただいま制作中です！！！',
    updated_at = NOW()
WHERE subject = 'GOL Web版 制作中です！！';
