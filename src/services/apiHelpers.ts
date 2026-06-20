export const getApiError = (error: any, fallback: string): string =>
  error?.data?.detail ?? error?.data?.title ?? fallback