import { createHmac } from 'crypto';
import { OrdersService } from './orders.service';

const SECRET = 'whsec_test_123';
const stub = (over: Record<string, string> = {}) =>
  ({ getOrThrow: (k: string) => over[k] ?? ({ BOLD_WEBHOOK_SECRET: SECRET } as Record<string, string>)[k], get: (k: string) => over[k] }) as never;

function service() {
  return new OrdersService(null as never, null as never, null as never, null as never, stub());
}

function sign(raw: string, secret = SECRET) {
  return createHmac('sha256', secret).update(Buffer.from(raw)).digest('hex');
}

describe('Bold webhook HMAC', () => {
  it('acepta firma válida', () => {
    const raw = '{"event_id":"evt-1","type":"payment.approved"}';
    expect(service().verifySignature(Buffer.from(raw), sign(raw))).toBe(true);
  });
  it('rechaza firma inválida', () => {
    expect(service().verifySignature(Buffer.from('{}'), 'mala')).toBe(false);
  });
  it('rechaza secreto distinto y firma vacía', () => {
    const raw = '{"a":1}';
    expect(service().verifySignature(Buffer.from(raw), sign(raw, 'otro'))).toBe(false);
    expect(service().verifySignature(Buffer.from(raw), '')).toBe(false);
    expect(service().verifySignature(Buffer.from(raw))).toBe(false);
  });
});
