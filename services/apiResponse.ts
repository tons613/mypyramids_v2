export type ApiEnvelope<T> = {
  success: boolean;
  msg: string;
  data: T;
};

export class ApiResponseError extends Error {
  status?: number;
  data: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
    this.data = data;
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatValidationErrors(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (!isRecord(item)) return [];
      const message = item.msg ?? item.message ?? item.detail;
      if (typeof message !== 'string') return [];
      const location = Array.isArray(item.loc)
        ? item.loc.filter((part) => part !== 'body').join(' / ')
        : '';
      return [location ? `${location}: ${message}` : message];
    });
  }
  if (!isRecord(value)) return [];

  for (const key of ['errors', 'detail', 'message', 'msg']) {
    if (value[key] !== undefined) {
      const messages = formatValidationErrors(value[key]);
      if (messages.length) return messages;
    }
  }
  return [];
}

function statusFallback(status?: number) {
  switch (status) {
    case 400: return 'Some of the information provided is invalid. Please review it and try again.';
    case 401: return 'Your session has expired. Please sign in and try again.';
    case 403: return 'You do not have permission to complete this request.';
    case 404: return 'The requested information could not be found.';
    case 409: return 'This request conflicts with an existing record.';
    case 422: return 'Some of the information provided could not be accepted. Please review it and try again.';
    case 429: return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504: return 'The service is temporarily unavailable. Please try again shortly.';
    default: return undefined;
  }
}

/** Extracts readable messages from the API envelope, FastAPI validation errors, and Axios errors. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const err = isRecord(error) ? error : undefined;
  const response = err && isRecord(err.response) ? err.response : undefined;
  const status = typeof response?.status === 'number'
    ? response.status
    : typeof err?.status === 'number' ? err.status : undefined;
  const responseData = response?.data ?? err?.data;

  if (isRecord(responseData)) {
    const payload = responseData.data;
    const nestedMessages = formatValidationErrors(payload);
    if (nestedMessages.length) return [...new Set(nestedMessages)].join('\n');

    const envelopeMessage = responseData.msg;
    if (typeof envelopeMessage === 'string' && envelopeMessage.trim()) return envelopeMessage;

    const legacyMessages = formatValidationErrors(responseData.detail ?? responseData.message ?? responseData.errors);
    if (legacyMessages.length) return [...new Set(legacyMessages)].join('\n');
  } else {
    const messages = formatValidationErrors(responseData);
    if (messages.length) return [...new Set(messages)].join('\n');
  }

  const errorMessage = typeof err?.message === 'string' ? err.message : '';
  if (errorMessage && !/^request failed with status code \d+$/i.test(errorMessage)) return errorMessage;
  if (err?.code === 'ERR_NETWORK') return 'Could not connect to the service. Check your internet connection and try again.';
  return statusFallback(status) || fallback;
}
