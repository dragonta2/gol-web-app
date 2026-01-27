/**
 * API呼び出しのリトライ機能
 * ネットワークエラー時に指数バックオフで自動リトライ
 */

export interface RetryOptions {
  /** 最大リトライ回数（デフォルト: 3） */
  maxRetries?: number;
  /** 初期待機時間（ミリ秒、デフォルト: 1000） */
  initialDelay?: number;
  /** 最大待機時間（ミリ秒、デフォルト: 10000） */
  maxDelay?: number;
  /** リトライするべきエラーかどうかを判定する関数 */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * 指数バックオフで待機時間を計算
 */
function calculateDelay(attempt: number, initialDelay: number, maxDelay: number): number {
  const delay = initialDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * ネットワークエラーかどうかを判定
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch APIのネットワークエラー（例: "Failed to fetch"）
    return error.message.includes('fetch') || error.message.includes('network');
  }
  if (error instanceof Error) {
    // 一般的なネットワークエラー
    return error.message.includes('network') || error.message.includes('ECONNREFUSED');
  }
  return false;
}

/**
 * リトライ可能なHTTPステータスコードかどうかを判定
 */
function isRetryableStatus(status: number): boolean {
  // 5xxエラー（サーバーエラー）と408（Request Timeout）はリトライ可能
  return status >= 500 || status === 408;
}

/**
 * fetch APIをリトライ機能付きで呼び出し
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error: unknown) => {
      // デフォルト: ネットワークエラーまたはリトライ可能なHTTPステータスの場合
      if (isNetworkError(error)) {
        return true;
      }
      // Responseオブジェクトの場合はステータスコードをチェック
      if (error instanceof Response) {
        return isRetryableStatus(error.status);
      }
      return false;
    },
  } = retryOptions;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // HTTPステータスがエラーの場合
      if (!response.ok) {
        // リトライ可能なエラーの場合
        if (attempt < maxRetries && shouldRetry(response)) {
          const delay = calculateDelay(attempt, initialDelay, maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        // リトライ不可能または最大リトライ回数に達した場合
        throw response;
      }

      // 成功
      return response;
    } catch (error) {
      lastError = error;

      // リトライ可能なエラーの場合
      if (attempt < maxRetries && shouldRetry(error)) {
        const delay = calculateDelay(attempt, initialDelay, maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // リトライ不可能または最大リトライ回数に達した場合
      throw error;
    }
  }

  // ここには到達しないはずだが、型安全性のため
  throw lastError;
}

