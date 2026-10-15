import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly log = new Logger("http");
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const res = ctx.switchToHttp().getResponse();
        this.log.log(
          `${req.method} ${req.url} ${res?.statusCode ?? ""} ${Date.now() - start}ms rid=${req.requestId ?? "-"} tenant=${req.tenantId ?? req.user?.tenantId ?? "-"}`,
        );
      }),
    );
  }
}
