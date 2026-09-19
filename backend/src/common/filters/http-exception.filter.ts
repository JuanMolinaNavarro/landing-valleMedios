import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ConnectionError, MSSQLError, RequestError } from "mssql";

interface ErrorResponse {
  status: HttpStatus;
  message: string;
}

/**
 * Codigos que el driver mssql/tedious asigna a errores de infraestructura
 * (no son errores de la consulta en si). Ver tedious/lib/connection.js.
 */
const SQL_TIMEOUT_CODE = "ETIMEOUT";
const SQL_UNAVAILABLE_CODES = new Set([
  "ECONNCLOSED",
  "ENOTOPEN",
  "ESOCKET",
  "ELOGIN",
  "EINSTLOOKUP",
]);

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const { status, message } = this.resolve(exception);

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): ErrorResponse {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: this.extractHttpMessage(exception),
      };
    }

    const sqlError = this.asSqlError(exception);
    if (sqlError) {
      return sqlError;
    }

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(`Unhandled exception: ${String(exception)}`);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    };
  }

  private extractHttpMessage(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === "string") {
      return body;
    }

    if (typeof body === "object" && body !== null) {
      const messageFromBody = (body as { message?: string | string[] }).message;
      if (Array.isArray(messageFromBody)) {
        return messageFromBody.join(", ");
      }
      if (typeof messageFromBody === "string") {
        return messageFromBody;
      }
    }

    return exception.message;
  }

  /**
   * Traduce errores de infraestructura de SQL Server a respuestas HTTP con
   * sentido para el portal, en lugar de un 500 generico.
   *
   * - Timeout de consulta (SQL_REQUEST_TIMEOUT_MS superado) -> 504.
   * - Conexion caida / no disponible / login fallido        -> 503.
   *
   * Cualquier otro RequestError (sintaxis, conversion de tipos, permisos) es
   * un bug de la aplicacion y sigue siendo 500 con stack trace en el log.
   */
  private asSqlError(exception: unknown): ErrorResponse | null {
    if (!(exception instanceof MSSQLError)) {
      return null;
    }

    const code = exception.code ?? "";

    if (exception instanceof RequestError && code === SQL_TIMEOUT_CODE) {
      this.logger.warn(`SQL request timeout: ${exception.message}`);
      return {
        status: HttpStatus.GATEWAY_TIMEOUT,
        message:
          "La consulta tardó demasiado en responder. Intentá nuevamente en unos segundos.",
      };
    }

    if (
      exception instanceof ConnectionError ||
      SQL_UNAVAILABLE_CODES.has(code)
    ) {
      this.logger.error(
        `SQL connection error (${code || "sin codigo"}): ${exception.message}`,
      );
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          "El servicio de facturación no está disponible en este momento. Intentá más tarde.",
      };
    }

    return null;
  }
}
