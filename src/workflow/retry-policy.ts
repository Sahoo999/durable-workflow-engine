export interface RetryPolicy {
  maxAttempts: number;
  backoffType: "exponential";
}

export const shouldRetry = (
  attemptNumber: number,
  maxAttempts: number,
): boolean => {
  return attemptNumber < maxAttempts;
};

export const calculateBackoffMs = (attemptNumber: number): number => {
  return 1000 * 2 ** (attemptNumber - 1);
};