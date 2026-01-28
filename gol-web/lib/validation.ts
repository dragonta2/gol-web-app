/**
 * サーバー側バリデーション用のユーティリティ関数
 * 
 * データベース制約と整合性を保つためのバリデーション
 */

/**
 * 文字列の長さをチェック
 */
export function validateStringLength(
  value: string | undefined | null,
  fieldName: string,
  maxLength: number,
  minLength: number = 0
): { valid: boolean; error?: string } {
  if (value === undefined || value === null) {
    return { valid: true }; // オプショナルフィールドはnull/undefinedを許可
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName}は文字列である必要があります` };
  }

  if (value.length < minLength) {
    return { valid: false, error: `${fieldName}は${minLength}文字以上で入力してください` };
  }

  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName}は${maxLength}文字以内で入力してください` };
  }

  return { valid: true };
}

/**
 * 数値の範囲をチェック
 */
export function validateNumberRange(
  value: number | undefined | null,
  fieldName: string,
  min: number,
  max: number,
  required: boolean = false
): { valid: boolean; error?: string } {
  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: `${fieldName}は必須です` };
    }
    return { valid: true }; // オプショナルフィールドはnull/undefinedを許可
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: `${fieldName}は数値である必要があります` };
  }

  if (value < min) {
    return { valid: false, error: `${fieldName}は${min}以上である必要があります` };
  }

  if (value > max) {
    return { valid: false, error: `${fieldName}は${max}以下である必要があります` };
  }

  return { valid: true };
}

/**
 * 整数かどうかをチェック
 */
export function validateInteger(
  value: number | undefined | null,
  fieldName: string,
  required: boolean = false
): { valid: boolean; error?: string } {
  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: `${fieldName}は必須です` };
    }
    return { valid: true };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: `${fieldName}は数値である必要があります` };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, error: `${fieldName}は整数である必要があります` };
  }

  return { valid: true };
}

/**
 * 日誌本文のバリデーション
 */
export function validateJournalText(journalText: string | undefined | null): { valid: boolean; error?: string } {
  return validateStringLength(journalText, '日誌本文', 3000, 0);
}

/**
 * 一言感想のバリデーション
 */
export function validateImpressionText(impressionText: string | undefined | null): { valid: boolean; error?: string } {
  return validateStringLength(impressionText, '一言感想', 500, 0);
}

/**
 * 習慣名のバリデーション
 */
export function validateHabitName(habitName: string | undefined | null): { valid: boolean; error?: string } {
  if (!habitName || typeof habitName !== 'string') {
    return { valid: false, error: '習慣名は必須です' };
  }

  const trimmed = habitName.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '習慣名は必須です' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: '習慣名は100文字以内で入力してください' };
  }

  return { valid: true };
}

/**
 * ポイントのバリデーション
 */
export function validatePoints(points: number | undefined | null): { valid: boolean; error?: string } {
  return validateNumberRange(points, 'ゴルド', 0, 9999, false);
}

/**
 * EXPのバリデーション
 */
export function validateExp(exp: number | undefined | null, fieldName: string = 'EXP'): { valid: boolean; error?: string } {
  return validateNumberRange(exp, fieldName, 0, 9999, false);
}

/**
 * スコア（0-100）のバリデーション
 */
export function validateScore(score: number | undefined | null, fieldName: string = 'スコア'): { valid: boolean; error?: string } {
  return validateNumberRange(score, fieldName, 0, 100, false);
}

/**
 * ToDoタスク名のバリデーション
 */
export function validateTaskName(taskName: string | undefined | null): { valid: boolean; error?: string } {
  if (!taskName || typeof taskName !== 'string') {
    return { valid: false, error: 'タスク名は必須です' };
  }

  const trimmed = taskName.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'タスク名は必須です' };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: 'タスク名は200文字以内で入力してください' };
  }

  return { valid: true };
}

/**
 * 権利の利用回数のバリデーション
 */
export function validateRightCount(count: number | undefined | null, maxCount: number = 99): { valid: boolean; error?: string } {
  return validateNumberRange(count, '利用回数', 0, maxCount, false);
}

/**
 * 習慣の種類のバリデーション
 */
export function validateHabitType(habitType: string | undefined | null): { valid: boolean; error?: string } {
  const validTypes = ['good', 'bad', 'bonus'];
  if (!habitType || !validTypes.includes(habitType)) {
    return { valid: false, error: `習慣の種類は${validTypes.join('、')}のいずれかである必要があります` };
  }
  return { valid: true };
}

/**
 * 入力タイプのバリデーション
 */
export function validateInputType(inputType: string | undefined | null): { valid: boolean; error?: string } {
  const validTypes = ['checkbox', 'number'];
  if (!inputType || !validTypes.includes(inputType)) {
    return { valid: false, error: `入力タイプは${validTypes.join('、')}のいずれかである必要があります` };
  }
  return { valid: true };
}

/**
 * ToDoステータスのバリデーション
 */
export function validateTodoStatus(status: string | undefined | null): { valid: boolean; error?: string } {
  const validStatuses = ['active', 'in_progress', 'completed'];
  if (!status || !validStatuses.includes(status)) {
    return { valid: false, error: `ステータスは${validStatuses.join('、')}のいずれかである必要があります` };
  }
  return { valid: true };
}

/**
 * 日付フォーマットのバリデーション（YYYY-MM-DD）
 */
export function validateDateFormat(date: string | undefined | null): { valid: boolean; error?: string } {
  if (!date || typeof date !== 'string') {
    return { valid: false, error: '日付は必須です' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: '日付はYYYY-MM-DD形式で入力してください' };
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: '有効な日付を入力してください' };
  }

  return { valid: true };
}

/**
 * UUIDのバリデーション
 */
export function validateUUID(uuid: string | undefined | null, fieldName: string = 'ID'): { valid: boolean; error?: string } {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: `${fieldName}は必須です` };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: `${fieldName}は有効なUUID形式である必要があります` };
  }

  return { valid: true };
}

/**
 * 複数のバリデーション結果をまとめてチェック
 */
export function validateAll(
  validations: Array<{ valid: boolean; error?: string }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const validation of validations) {
    if (!validation.valid && validation.error) {
      errors.push(validation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

