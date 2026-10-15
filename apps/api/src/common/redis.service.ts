import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Redis opcional y tolerante a fallos: la reserva vive en BD (reservedUntil);
// Redis solo acelera expiración/observabilidad.
@Injectable()
export class RedisService {
  private client: Redis | null = null;
  private ready = false;
  private readonly log = new Logger(RedisService.name);

  constructor(config: ConfigService) {
    try {
      const url = config.get('REDIS_URL', 'redis://localhost:6380');
      this.client = new Redis(url, {
        lazyConnect: true,
        enableReadyCheck: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      });
      this.client.on('ready', () => { this.ready = true; });
      this.client.on('error', (e) => { this.ready = false; this.log.warn(`redis: ${e.message}`); });
      this.client.on('close', () => { this.ready = false; });
      // Conexión explícita única (con lazyConnect:true no hay doble connect → sin warns falsos).
      this.client.connect().catch(() => this.log.warn('redis deshabilitado (sin conexión)'));
    } catch {
      this.log.warn('redis deshabilitado');
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async reserve(orderId: string, ttlSeconds = 900): Promise<void> {
    try {
      // NX: no pisar una reserva existente.
      await this.client?.set(`order:reserve:${orderId}`, '1', 'EX', ttlSeconds, 'NX');
    } catch {
      /* best-effort */
    }
  }

  async release(orderId: string): Promise<void> {
    try {
      await this.client?.del(`order:reserve:${orderId}`);
    } catch {
      /* best-effort */
    }
  }

  // Lock genérico con dueño: retorna true solo si este llamante lo adquirió.
  async acquire(key: string, value: string, ttlSeconds = 600): Promise<boolean> {
    try {
      if (!this.client) return false;
      return (await this.client.set(key, value, 'EX', ttlSeconds, 'NX')) === 'OK';
    } catch {
      return false;
    }
  }

  async getValue(key: string): Promise<string | null> {
    try {
      if (!this.client) return null;
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async releaseKey(key: string, value?: string): Promise<void> {
    try {
      if (!this.client) return;
      if (value === undefined) {
        await this.client.del(key);
        return;
      }
      // Solo libera si sigue siendo el dueño (evita pisar un hold renovado).
      const cur = await this.client.get(key);
      if (cur === value) await this.client.del(key);
    } catch {
      /* best-effort */
    }
  }
}
