import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: FastifyRequest): Promise<string> {
    // Priority order: CF-Connecting-IP (Cloudflare) -> X-Real-IP (Nginx) -> X-Forwarded-For -> req.ip
    const cfIp = req.headers['cf-connecting-ip'] as string | undefined;
    const trueClientIp = req.headers['true-client-ip'] as string | undefined;
    const realIp = req.headers['x-real-ip'] as string | undefined;
    const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;

    // Cloudflare IP (most reliable when behind Cloudflare)
    if (cfIp) {
      return cfIp;
    }

    if (trueClientIp) {
      return trueClientIp;
    }

    // Nginx Real IP
    if (realIp) {
      return realIp;
    }

    // X-Forwarded-For (take first IP in chain)
    if (forwardedFor) {
      const firstIp = forwardedFor.split(',')[0].trim();
      return firstIp;
    }

    // Fallback to direct connection IP
    const fallbackIp = req.ips.length ? req.ips[req.ips.length - 1] : req.ip;
    return fallbackIp;
  }
}
