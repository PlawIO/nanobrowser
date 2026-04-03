import { createLogger } from '../log';

const logger = createLogger('Analytics');

export class AnalyticsService {
  private static readonly ERROR_TYPE_CATEGORIES = {
    ChatModelAuthError: 'llm_auth_error',
    ChatModelBadRequestError: 'llm_bad_request_error',
    ChatModelForbiddenError: 'llm_forbidden_error',
    ResponseParseError: 'llm_response_parse_error',
    URLNotAllowedError: 'url_blocked_error',
    RequestCancelledError: 'request_cancelled_error',
    ExtensionConflictError: 'extension_conflict_error',
    InvalidInputError: 'invalid_input_error',
    TimeoutError: 'timeout',
    NetworkError: 'network_error',
    TypeError: 'type_error',
    ReferenceError: 'reference_error',
    SyntaxError: 'syntax_error',
    MaxStepsReachedError: 'max_steps_reached',
    MaxFailuresReachedError: 'max_failures_reached',
  } as const;

  private static readonly MESSAGE_PATTERNS: Array<[RegExp, string]> = [
    [/element not found|no such element/, 'element_not_found'],
    [/timeout|timed out/, 'timeout'],
    [/debugger|detached/, 'debugger_error'],
    [/network|fetch|connection/, 'network_error'],
    [/max steps|maxsteps/, 'max_steps_reached'],
    [/max failures|maxfailures/, 'max_failures_reached'],
    [/navigation|navigate/, 'navigation_error'],
    [/permission|denied|forbidden/, 'permission_denied'],
    [/tab|window/, 'tab_error'],
    [
      /\b(unauthorized|invalid\s*api\s*key|missing\s*api\s*key|api\s*key\s*required|no\s*api\s*key)\b/,
      'llm_config_error',
    ],
  ];

  async init(): Promise<void> {
    logger.info('Analytics disabled in this build');
  }

  async trackTaskStart(taskId: string): Promise<void> {
    void taskId;
  }

  async trackTaskComplete(taskId: string): Promise<void> {
    void taskId;
  }

  async trackTaskFailed(taskId: string, errorCategory: string): Promise<void> {
    void taskId;
    void errorCategory;
  }

  async trackTaskCancelled(taskId: string): Promise<void> {
    void taskId;
  }

  async trackDomainVisit(url: string): Promise<void> {
    void url;
  }

  categorizeError(error: Error | string): string {
    const matchPatterns = (message: string): string | null => {
      for (const [regex, category] of AnalyticsService.MESSAGE_PATTERNS) {
        if (regex.test(message)) return category;
      }
      return null;
    };

    if (error instanceof Error) {
      const errorType = error.constructor.name;
      const mapped =
        AnalyticsService.ERROR_TYPE_CATEGORIES[errorType as keyof typeof AnalyticsService.ERROR_TYPE_CATEGORIES];
      if (mapped) return mapped;

      const message = error.message?.toLowerCase() || '';
      const byMessage = matchPatterns(message);
      if (byMessage) return byMessage;

      return `error_${errorType.toLowerCase()}`;
    }

    const message = typeof error === 'string' ? error.toLowerCase() : '';
    const byMessage = matchPatterns(message);
    return byMessage ?? 'unknown_error';
  }

  async updateSettings(): Promise<void> {}
}

export const analytics = new AnalyticsService();
