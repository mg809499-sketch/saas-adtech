import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

// Formato de error uniforme con requestId para trazabilidad.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException ? exception.getResponse() : "internal_error";
    res.status(status).json({
      statusCode: status,
      message: typeof message === "string" ? message : (message as { message?: unknown }).message ?? message,
      requestId: req.requestId ?? req.headers?.["x-request-id"] ?? null,
      path: req.url,
    });
  }
}
