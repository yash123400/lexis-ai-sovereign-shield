import { checkRateLimit } from './_rateLimit.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ── Rate Limiting ─────────────────────────────────────────────────────
    const allowed = checkRateLimit(req, res, { maxRequests: 5, windowMs: 60_000 });
    if (!allowed) return;

    const { image_url1, image_url2 } = req.body;

    if (!image_url1 || !image_url2) {
        return res.status(400).json({ error: 'Missing image_url1 or image_url2' });
    }

    // ── FIX 1.2: No hardcoded fallbacks — env vars only ──────────────────
    const api_key = process.env.FACEPP_API_KEY;
    const api_secret = process.env.FACEPP_API_SECRET;

    if (!api_key || !api_secret) {
        console.error('[face-compare] CRITICAL: Face++ API credentials not configured.');
        return res.status(503).json({
            success: false,
            status: 'Red',
            error: 'Biometric service unavailable. Please contact your solicitor.',
        });
    }

    try {
        // ── LIVENESS DETECTION ────────────────────────────────────────────
        const detectFormData = new URLSearchParams({
            api_key,
            api_secret,
            image_url: image_url2,
            return_attributes: 'liveness'
        });

        const detectRes = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: detectFormData
        });

        const detectData = await detectRes.json();
        let livenessScore = null;

        if (detectData && detectData.faces && detectData.faces.length > 0) {
            const liveness = detectData.faces[0].attributes?.liveness;
            if (liveness && liveness.probability) {
                const fakeScore = Math.max(
                    liveness.probability.fake,
                    liveness.probability.software_fake || 0
                );
                livenessScore = 100 - fakeScore;
            }
        } else if (detectData.error_message) {
            // ── FIX 2.4: ALL Face++ errors block — no fake 99.5 fallback ──
            console.error('[face-compare] Detect API error:', detectData.error_message);
            return res.status(403).json({
                success: false,
                status: 'Red',
                error: 'Liveness detection could not be completed. Please upload a clear, well-lit photo.',
            });
        } else {
            // No face detected
            return res.status(400).json({
                success: false,
                status: 'Red',
                error: 'No face detected in the provided image.',
            });
        }

        // Liveness gate
        if (livenessScore !== null && livenessScore < 80.0) {
            return res.status(403).json({
                success: false,
                status: 'Red',
                error: 'Immediate Fraud Alert: Liveness Threshold Failed',
                livenessScore
            });
        }

        // ── FACE COMPARISON ───────────────────────────────────────────────
        const compareFormData = new URLSearchParams({
            api_key,
            api_secret,
            image_url1,
            image_url2
        });

        const compareRes = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: compareFormData
        });

        const compareData = await compareRes.json();

        if (compareData.error_message) {
            throw new Error(compareData.error_message);
        }

        const confidence = compareData.confidence;
        const request_id = compareData.request_id;

        let status = 'Red';
        if (confidence > 80.0) {
            status = 'Green';
        } else if (confidence > 60.0) {
            status = 'Amber';
        }

        return res.status(200).json({
            success: true,
            status,
            confidence,
            request_id,
            livenessScore
        });

    } catch (error) {
        console.error('[face-compare] API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Biometric verification failed. Please try again.',
        });
    }
}
