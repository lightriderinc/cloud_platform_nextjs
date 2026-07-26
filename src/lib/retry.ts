/**
 * Retries an async operation a fixed number of times with linear backoff.
 * Used for calls to external services (e.g. the Logto Management API) that
 * can fail transiently — short and bounded on purpose, since callers like
 * the Stripe webhook handler have their own timeout/retry envelope on top
 * of this.
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  const { attempts = 3, delayMs = 250 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}
