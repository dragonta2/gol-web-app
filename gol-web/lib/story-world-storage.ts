/** localStorage の世界観キー（設定画面と共通） */
export const STORAGE_STORY_WORLD = 'gol-story-world';

/** 世界観が変更されたときに発火するカスタムイベント名 */
export const STORY_WORLD_CHANGED_EVENT = 'gol-story-world-changed';

/** 世界観が保存されたときに呼ぶ（設定画面で使用） */
export function notifyStoryWorldChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORY_WORLD_CHANGED_EVENT));
  }
}
