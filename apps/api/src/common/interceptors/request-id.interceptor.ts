import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Observable } from "rxjs";

// Trazabilidad: propaga x-request-id de extremo a extremo.
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const id = req.headers["x-request-id"] || randomUUID();
    req.requestId = id;
    if (res?.setHeader) res.setHeader("x-request-id", id);
    return next.handle();
  }
}
