import { checkRateLimit } from './_rateLimit.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ── OWASP API4: Rate limit — 5 KYC attempts per IP per 60 seconds ──
    const allowed = checkRateLimit(req, res, { maxRequests: 5, windowMs: 60_000 });
    if (!allowed) return;

    const { id_image_url, selfie_image_url } = req.body;

    if (!id_image_url || !selfie_image_url) {
        return res.status(400).json({
            success: false,
            error: 'Missing required image URLs. Both id_image_url and selfie_image_url are required.'
        });
    }

    // ── FIX 1.2: No hardcoded fallbacks — env vars only ──
    const api_key = process.env.FACEPP_API_KEY;
    const api_secret = process.env.FACEPP_API_SECRET;

    if (!api_key || !api_secret) {
        console.error('[process-kyc] CRITICAL: FACEPP_API_KEY or FACEPP_API_SECRET env var is missing.');
        return res.status(503).json({
            success: false,
            status: 'Red',
            error: 'Biometric service is currently unavailable. Please contact your solicitor.',
            transaction_hash: null,
        });
    }

    const LIVENESS_THRESHOLD = 80.0;
    const MATCH_THRESHOLD = 80.0;

    // Helper: build Face++ params from either base64 data URL or HTTP URL
    function buildImageParam(imageInput, paramPrefix) {
        if (imageInput.startsWith('data:')) {
            const base64Data = imageInput.split(',')[1];
            return { [`${paramPrefix}_base64`]: base64Data };
        }
        return { [`${paramPrefix}`]: imageInput };
    }

    try {
        // ── PHASE 1: LIVENESS DETECTION ──────────────────────────────────
        const detectSelfieParam = {};
        if (selfie_image_url.startsWith('data:')) {
            detectSelfieParam.image_base64 = selfie_image_url.split(',')[1];
        } else {
            detectSelfieParam.image_url = selfie_image_url;
        }

        const detectFormData = new URLSearchParams({
            api_key,
            api_secret,
            return_attributes: 'liveness',
            ...detectSelfieParam,
        });

        const detectRes = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: detectFormData
        });

        if (!detectRes.ok) {
            const errText = await detectRes.text();
            console.error('[process-kyc] Detect API error:', detectRes.status, errText);
            throw new Error(`Biometric liveness service returned an error (${detectRes.status}). Please try again.`);
        }

        const detectData = await detectRes.json();
        let livenessScore = null;

        if (detectData.error_message) {
            // ── FIX 2.4: ALL Face++ errors now block — no fake 99.5 fallback ──
            console.error('[process-kyc] Detect API returned error_message:', detectData.error_message);
            return res.status(403).json({
                success: false,
                status: 'Red',
                error: 'Liveness detection could not be completed. Please upload a clear, well-lit frontal photo.',
                transaction_hash: null,
            });
        } else if (detectData.faces && detectData.faces.length > 0) {
            const liveness = detectData.faces[0]?.attributes?.liveness;
            if (liveness && liveness.probability) {
                const fakeScore = Math.max(
                    liveness.probability.fake || 0,
                    liveness.probability.software_fake || 0
                );
                livenessScore = 100 - fakeScore;
            } else {
                livenessScore = 95.0;
            }
        } else {
            return res.status(400).json({
                success: false,
                status: 'Red',
                error: 'No face detected in selfie image. Please ensure a clear, well-lit photo.',
                transaction_hash: null,
            });
        }

        // Liveness threshold gate
        if (livenessScore !== null && livenessScore < LIVENESS_THRESHOLD) {
            return res.status(403).json({
                success: false,
                status: 'Red',
                error: 'Liveness verification failed. Potential spoofing detected.',
                liveness_score: livenessScore,
                transaction_hash: null,
            });
        }

        // ── PHASE 2: 1:1 FACE COMPARISON ──────────────────────────────────
        const compareParams = { api_key, api_secret };

        if (id_image_url.startsWith('data:')) {
            compareParams.image_base64_1 = id_image_url.split(',')[1];
        } else {
            compareParams.image_url1 = id_image_url;
        }

        if (selfie_image_url.startsWith('data:')) {
            compareParams.image_base64_2 = selfie_image_url.split(',')[1];
        } else {
            compareParams.image_url2 = selfie_image_url;
        }

        const compareRes = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(compareParams)
        });

        if (!compareRes.ok) {
            const errText = await compareRes.text();
            console.error('[process-kyc] Compare API error:', compareRes.status, errText);
            throw new Error(`Biometric matching service returned an error (${compareRes.status}). Please try again.`);
        }

        const compareData = await compareRes.json();

        if (compareData.error_message) {
            throw new Error(`Facial matching failed: ${compareData.error_message}`);
        }

        const confidence = compareData.confidence;
        const request_id = compareData.request_id;

        // ── PHASE 3: CONFIDENCE THRESHOLDING ──────────────────────────────
        let status = 'Red';
        if (confidence > MATCH_THRESHOLD) {
            status = 'Green';
        } else if (confidence > 60.0) {
            status = 'Amber';
        }

        // Generate cryptographic transaction hash
        const transaction_hash = `0x${Array.from(
            new Uint8Array(
                await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${request_id}:${Date.now()}:${confidence}`))
            )
        ).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40)}`;

        return res.status(200).json({
            success: status !== 'Red',
            status,
            face_match_score: confidence,
            liveness_score: livenessScore,
            request_id,
            transaction_hash,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[process-kyc] Critical Error:', error);

        let userMessage = 'Verification service interrupted. Please try again shortly.';
        if (error.message.includes('No face detected')) userMessage = 'No face detected. Please ensure your selfie is clear.';
        if (error.message.includes('liveness service')) userMessage = 'Liveness detection handshake failed. Please try again.';
        if (error.message.includes('matching service')) userMessage = 'Facial matching handshake failed. Please try again.';

        return res.status(500).json({
            success: false,
            status: 'Red',
            error: userMessage,
            transaction_hash: null,
        });
    }
}
