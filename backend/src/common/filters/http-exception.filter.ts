import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Skip handling if response was already sent or headers sent (e.g. tRPC or streaming)
    if (response.headersSent) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let errorMessage = 'Internal server error';
    let errorDetails: any = null;

    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      errorMessage = (exceptionResponse as any).message || (exceptionResponse as any).error || errorMessage;
      errorDetails = (exceptionResponse as any).details || (exceptionResponse as any).errors || null;
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    if (status >= 500) {
      this.logger.error(`[${request.method}] ${request.url} - ${errorMessage}`, (exception as any)?.stack);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: errorMessage,
      details: errorDetails,
    });
  }
}
