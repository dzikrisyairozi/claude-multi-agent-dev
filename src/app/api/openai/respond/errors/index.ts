/**
 * Custom Error Classes
 * Provides better error handling with specific error types
 */

/**
 * Base error class for OpenAI API errors
 */
export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends OpenAIError {
  constructor(message: string = "Unable to authenticate user") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

/**
 * Error thrown when a thread is not found
 */
export class ThreadNotFoundError extends OpenAIError {
  constructor(threadId: string) {
    super(`Thread ${threadId} not found for this user`, 404, "THREAD_NOT_FOUND");
    this.name = "ThreadNotFoundError";
  }
}

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends OpenAIError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * Error thrown when configuration is missing
 */
export class ConfigurationError extends OpenAIError {
  constructor(message: string) {
    super(message, 500, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
}

/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends OpenAIError {
  constructor(
    toolName: string,
    originalError: Error
  ) {
    super(
      `Tool execution failed for ${toolName}: ${originalError.message}`,
      500,
      "TOOL_EXECUTION_ERROR"
    );
    this.name = "ToolExecutionError";
  }
}

/**
 * Error thrown when streaming fails
 */
export class StreamingError extends OpenAIError {
  constructor(message: string, originalError?: Error) {
    super(
      `Streaming failed: ${message}${originalError ? ` - ${originalError.message}` : ""}`,
      500,
      "STREAMING_ERROR"
    );
    this.name = "StreamingError";
  }
}

/**
 * Error thrown when max tool rounds are exceeded
 */
export class MaxToolRoundsExceededError extends OpenAIError {
  constructor(maxRounds: number) {
    super(
      `Maximum tool execution rounds (${maxRounds}) exceeded`,
      500,
      "MAX_TOOL_ROUNDS_EXCEEDED"
    );
    this.name = "MaxToolRoundsExceededError";
  }
}
