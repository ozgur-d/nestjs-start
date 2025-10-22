import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ClientInfo as IClientInfo } from '../interfaces/client-info.interface';

export const ClientInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IClientInfo => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();

    const fallbackIp = request.ips.length ? request.ips[request.ips.length - 1] : request.ip;
    let ipAddress = fallbackIp;
    let originalIpAddress: string | null = null;
    let isProxy = false;

    // Priority order: CF-Connecting-IP (Cloudflare) -> True-Client-IP -> X-Real-IP (Nginx) -> X-Forwarded-For -> req.ips/req.ip

    // Cloudflare CF-Connecting-IP (highest priority)
    const cfConnectingIp = request.headers['cf-connecting-ip'];
    if (typeof cfConnectingIp === 'string') {
      originalIpAddress = fallbackIp;
      ipAddress = cfConnectingIp;
      isProxy = true;
      return {
        ipAddress,
        originalIpAddress,
        userAgent: request.headers['user-agent'] || 'Unknown',
        isProxy,
      };
    }

    // Cloudflare True-Client-IP (secondary priority)
    const trueClientIp = request.headers['true-client-ip'];
    if (typeof trueClientIp === 'string') {
      originalIpAddress = fallbackIp;
      ipAddress = trueClientIp;
      isProxy = true;
      return {
        ipAddress,
        originalIpAddress,
        userAgent: request.headers['user-agent'] || 'Unknown',
        isProxy,
      };
    }

    // Nginx X-Real-IP
    const realIp = request.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      originalIpAddress = fallbackIp;
      ipAddress = realIp;
      isProxy = true;
      return {
        ipAddress,
        originalIpAddress,
        userAgent: request.headers['user-agent'] || 'Unknown',
        isProxy,
      };
    }

    // X-Forwarded-For (take first IP in chain)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      const firstIp = forwardedFor.split(',')[0].trim();
      originalIpAddress = fallbackIp;
      ipAddress = firstIp;
      isProxy = true;
      return {
        ipAddress,
        originalIpAddress,
        userAgent: request.headers['user-agent'] || 'Unknown',
        isProxy,
      };
    }

    // Fallback to direct connection IP (no proxy detected)
    return {
      ipAddress,
      originalIpAddress,
      userAgent: request.headers['user-agent'] || 'Unknown',
      isProxy,
    };
  },
);
