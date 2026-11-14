import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LogService } from './logger-service';
import { ERROR_MESSAGES } from './constants';
// @UseFilters(new HttpExceptionFilter('User')) --> example for implementing http exception filter in each controller
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private logger = new LogService();
  constructor(private context: string) {}
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseMessage: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          };

    this.logger.log(this.context);
    this.logger.error(exception.message);
    this.logger.error(exception.stack);

    const errorResponse = {
      statusCode: responseMessage?.error?.status
        ? responseMessage?.error.status
        : status,
      message: [
        responseMessage?.error
          ? (responseMessage?.error?.message ?? responseMessage.error)
          : responseMessage.error,
      ],
      timestamp: new Date(new Date() + 'Z'),
      path: request.url,
      additionalValidations: [],
      additionalValidationErrors: [],
    };

    if (exception.response && exception.response.message) {
      // class validator exception.
      errorResponse.message = exception.response.message.length
        ? exception.response.message
        : 'Internal Server Error';
      errorResponse.statusCode = exception.response.message.length
        ? exception.status
        : errorResponse.statusCode;
      errorResponse.additionalValidations = exception.message
        ? exception.message
        : exception.response.response.message;
      errorResponse.additionalValidationErrors = exception.response.response
        ? exception.response.response.message
        : [];
    }

    if (exception.code == 'EREQUEST' && exception.name == 'QueryFailedError') {
      //db exception Internal Server error.
      errorResponse.message = ['Internal Server Error'];
      errorResponse.statusCode = 500;
      errorResponse.additionalValidations = exception.message;
    }
    response.status(status).json(errorResponse);
  }
}
