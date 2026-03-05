/**
 * ランクシステム：レベル計算・ランク名取得
 * 身体・頭脳・精神のそれぞれが閾値を超えたときにレベルアップ
 */

export type RankMode = 'ghost' | 'dq';

/** 各レベルに必要なEXP（身体・頭脳・精神それぞれがこの値を超える必要がある）。Lv.1は0＝スタート地点なので必要EXPなし */
export const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 200,
  4: 400,
  5: 600,
  6: 900,
  7: 1200,
  8: 1600,
  9: 2000,
  10: 2500,
};

/** ヨウテイモード（ゴースト・オブ・ヨウテイ風）のランク名 */
export const RANK_NAMES_GHOST: Record<number, string> = {
  1: '無名の凡人',
  2: '見習い修行者',
  3: '修行者',
  4: '兵法者',
  5: '武芸者',
  6: '武者',
  7: '剣豪',
  8: '達人',
  9: '影',
  10: '怨霊',
};

/** ドラクエモードのランク名 */
export const RANK_NAMES_DQ: Record<number, string> = {
  1: '駆け出し',
  2: '村の若者',
  3: '冒険者',
  4: '鉄の戦士',
  5: '銅の剣士',
  6: 'ロトの末裔',
  7: '銀の勇者',
  8: '金の勇者',
  9: 'ロトの化身',
  10: '伝説の勇者',
};

/** レベル閾値の型（1〜10のキー、値は必要EXP） */
export type LevelThresholds = Record<number, number>;

/**
 * DBの level_thresholds（JSONB）を LevelThresholds にパース。不正なら null
 */
export function parseLevelThresholds(raw: unknown): LevelThresholds | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const result: LevelThresholds = {};
  for (let lv = 1; lv <= 10; lv++) {
    const v = obj[String(lv)];
    if (typeof v === 'number' && !Number.isNaN(v) && v >= 0) {
      result[lv] = Math.floor(v);
    } else {
      return null;
    }
  }
  return result;
}

/**
 * EXPから現在のレベルを計算
 * 身体・頭脳・精神のそれぞれが閾値を超えたレベルを返す
 * customThresholds が渡されればそれを使用、なければ LEVEL_THRESHOLDS
 */
export function getLevelFromExp(
  expBody: number,
  expMind: number,
  expSpirit: number,
  customThresholds?: LevelThresholds | null
): number {
  const thresholds = customThresholds ?? LEVEL_THRESHOLDS;
  let level = 0;
  for (let lv = 1; lv <= 10; lv++) {
    const th = thresholds[lv] ?? 0;
    if (expBody >= th && expMind >= th && expSpirit >= th) {
      level = lv;
    } else {
      break;
    }
  }
  return level || 1;
}

/**
 * レベルとモードからランク名を取得
 */
export function getRankName(level: number, mode: RankMode): string {
  const names = mode === 'ghost' ? RANK_NAMES_GHOST : RANK_NAMES_DQ;
  return names[level] ?? names[1];
}

/**
 * 次のレベルに必要な残りEXP（身体・頭脳・精神それぞれ）
 * すでにLv10の場合は null
 * customThresholds が渡されればそれを使用
 */
export function getExpToNextLevel(
  expBody: number,
  expMind: number,
  expSpirit: number,
  customThresholds?: LevelThresholds | null
): { body: number; intellect: number; spirit: number } | null {
  const thresholds = customThresholds ?? LEVEL_THRESHOLDS;
  const currentLevel = getLevelFromExp(expBody, expMind, expSpirit, customThresholds);
  if (currentLevel >= 10) return null;

  const nextThreshold = thresholds[currentLevel + 1] ?? 0;
  return {
    body: Math.max(0, nextThreshold - expBody),
    intellect: Math.max(0, nextThreshold - expMind),
    spirit: Math.max(0, nextThreshold - expSpirit),
  };
}
