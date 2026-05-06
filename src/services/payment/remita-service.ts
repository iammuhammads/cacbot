import crypto from 'node:crypto';
import type { Env } from '../../config/env.js';
import { logger } from '../utils/logger.js';

export interface RemitaStatusResponse {
  rrr: string;
  status: 'PAID' | 'PENDING' | 'EXPIRED' | 'FAILED';
  amount: number;
  transactionTime?: string;
  orderId?: string;
}

export class RemitaService {
  constructor(private readonly env: Env) {}

  /**
   * Verifies the status of a Remita Retrieval Reference (RRR)
   */
  async verifyRRR(rrr: string): Promise<RemitaStatusResponse> {
    if (!this.env.REMITA_MERCHANT_ID || !this.env.REMITA_API_KEY) {
      logger.warn("Remita credentials missing. Returning PENDING mock status.");
      return { rrr, status: 'PENDING', amount: 0 };
    }

    const merchantId = this.env.REMITA_MERCHANT_ID;
    const apiKey = this.env.REMITA_API_KEY;
    const baseUrl = this.env.REMITA_BASE_URL || 'https://remitademo.net/remita/exapp/api/v1/send/api/echannelsvc';

    // Hash = SHA512(rrr + apiKey + merchantId)
    const hash = crypto
      .createHash('sha512')
      .update(`${rrr}${apiKey}${merchantId}`)
      .digest('hex');

    try {
      logger.info("Verifying RRR status via Remita API", { rrr });
      
      const url = `${baseUrl}/${merchantId}/${rrr}/${hash}/status.reg`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `remitaConsumerKey=${merchantId},remitaConsumerToken=${hash}`
        }
      });

      if (!response.ok) {
        throw new Error(`Remita API returned status ${response.status}`);
      }

      const data = await response.json();
      
      // Remita Status Codes: 00 = Success, 01 = Approved, etc.
      const isPaid = data.status === '00' || data.status === '01';
      
      return {
        rrr,
        status: isPaid ? 'PAID' : 'PENDING',
        amount: Number(data.amount || 0),
        transactionTime: data.transactiontime,
        orderId: data.orderId
      };
    } catch (err) {
      logger.error("Remita verification failed", { error: err, rrr });
      return { rrr, status: 'PENDING', amount: 0 };
    }
  }
}
