import { Injectable } from '@nestjs/common';
import type { PaymentMethod } from '@prisma/client';

// Simula Bold: misma interfaz que la pasarela real para enchufar llaves después.
// Tarjeta de prueba que rechaza: 4000000000000002. Resto aprueba (Nequi queda PENDING).
@Injectable()
export class BoldMockService {
  createPayment(total: number, method: PaymentMethod, payment?: { bank?: string; cardNumber?: string; nequiPhone?: string }) {
    const boldTxId = `bld_tx_${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
    if (method === 'CARD' && payment?.cardNumber?.replace(/\s/g, '') === '4000000000000002') {
      return { boldTxId, status: 'REJECTED' as const, reason: 'Fondos insuficientes (tarjeta de prueba)' };
    }
    if (method === 'NEQUI') return { boldTxId, status: 'PENDING' as const, reason: 'Push Nequi enviado (mock)' };
    return { boldTxId, status: 'APPROVED' as const, reason: `Aprobado ${method} (mock) · $${total.toLocaleString('es-CO')} COP` };
  }
}
