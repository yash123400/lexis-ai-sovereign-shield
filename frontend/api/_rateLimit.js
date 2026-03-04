/**
 * Shared in-memory sliding-window rate limiter for Vercel serverless functions.
 * Keyed by IP address. Resets automatically.
 *
 * Usage:
 *   import { checkRateLimit } from './_rateLimit.js';
 *   const allowed = checkRateLimit(req, res, { maxRequests: 5, windowMs: 60_000 });
 *   if (!allowed) return; // response already sent
 */

// Map<ip, { count: number, windowStart: number }>
const ipWindows = new Map();

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ maxRequests?: number, windowMs?: number }} options
 * @returns {boolean} true if the request is allowed, false if rate-limited (response already written)
 */
export function checkRateLimit(req, res, { maxRequests = 10, windowMs = 60_000 } = {}) {
    const ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown';

    const now = Date.now();
    const windowEntry = ipWindows.get(ip);

    if (!windowEntry || now - windowEntry.windowStart > windowMs) {
        // Start a new window
        ipWindows.set(ip, { count: 1, windowStart: now });
        return true;
    }

    windowEntry.count += 1;

    if (windowEntry.count > maxRequests) {
        const retryAfterSec = Math.ceil((windowEntry.windowStart + windowMs - now) / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        res.setHeader('X-RateLimit-Limit', String(maxRequests));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.status(429).json({
            error: 'Too many requests. Please wait and try again.',
            retryAfterSeconds: retryAfterSec,
        });
        return false;
    }

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - windowEntry.count));
    return true;
}
