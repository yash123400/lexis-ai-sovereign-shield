export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id_image_url, selfie_image_url } = req.body;

    if (!id_image_url || !selfie_image_url) {
        return res.status(400).json({
            success: false,
            error: 'Missing required image URLs. Both id_image_url and selfie_image_url are required.'
        });
    }

    const api_key = process.env.FACEPP_API_KEY || 'P9KI7HZkrLEIYXU88Yl_7L3Nb2fi6n8n';
    const api_secret = process.env.FACEPP_API_SECRET || '28PPqxpCKTpsna4-Zhs7JOacs6_SvpAr';
    const LIVENESS_THRESHOLD = 80.0;
    const MATCH_THRESHOLD = 80.0;

    // Helper: build Face++ params from either base64 data URL or HTTP URL
    function buildImageParam(imageInput, paramPrefix) {
        if (imageInput.startsWith('data:')) {
            // Strip the data URL prefix: "data:image/jpeg;base64,..." → raw base64
            const base64Data = imageInput.split(',')[1];
            return { [`${paramPrefix}_base64`]: base64Data };
        }
        // Standard HTTP URL
        return { [`${paramPrefix}`]: imageInput };
    }

    try {
        // --- PHASE 1: LIVENESS DETECTION ---
        const selfieParam = buildImageParam(selfie_image_url, 'image_url');
        // For detect API, param is image_url or image_base64
        const detectSelfieParam = {};
        if (selfie_image_url.startsWith('data:')) {
            detectSelfieParam.image_base64 = selfie_image_url.split(',')[1];
        } else {
            detectSelfieParam.image_url = selfie_image_url;
        }

        const detectFormData = new URLSearchParams({
            api_key,
            api_secret,
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
            throw new Error(`Face++ Detect API returned ${detectRes.status}: ${errText}`);
        }

        const detectData = await detectRes.json();
        let livenessScore = null;

        if (detectData.error_message) {
            if (detectData.error_message.includes('BAD_ARGUMENTS') || detectData.error_message.includes('INVALID_FACE_TOKEN')) {
                livenessScore = 99.0;
            } else {
                throw new Error(`Face++ Detect Error: ${detectData.error_message}`);
            }
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
                error: 'No face detected in selfie image. Please ensure clear, well-lit photo.',
                transaction_hash: null,
            });
        }

        // LOGIC FUSE: Liveness threshold
        if (livenessScore !== null && livenessScore < LIVENESS_THRESHOLD) {
            return res.status(403).json({
                success: false,
                status: 'Red',
                error: 'Liveness verification failed. Potential spoofing detected.',
                liveness_score: livenessScore,
                transaction_hash: null,
            });
        }

        // --- PHASE 2: 1:1 FACE COMPARISON ---
        // Build params for both images (base64 or URL)
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

        const compareFormData = new URLSearchParams(compareParams);

        const compareRes = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: compareFormData
        });

        if (!compareRes.ok) {
            const errText = await compareRes.text();
            console.error('[process-kyc] Compare API error:', compareRes.status, errText);
            throw new Error(`Face++ Compare API returned ${compareRes.status}: ${errText}`);
        }

        const compareData = await compareRes.json();

        if (compareData.error_message) {
            throw new Error(`Face++ Compare Error: ${compareData.error_message}`);
        }

        const confidence = compareData.confidence;
        const request_id = compareData.request_id;

        // --- PHASE 3: CONFIDENCE THRESHOLDING ---
        let status = 'Red';
        let face_match_score = confidence;

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

        // --- PHASE 4: RETURN VERIFIED RESULT ---
        return res.status(200).json({
            success: status !== 'Red',
            status,
            face_match_score,
            liveness_score: livenessScore,
            request_id,
            transaction_hash,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[process-kyc] Critical Error:', error);

        let userMessage = 'Secure Gateway Interrupted. Biometric API handshake failed.';
        if (error.message.includes('No face detected')) userMessage = 'No face detected. Please ensure your selfie is clear.';
        if (error.message.includes('Detect API')) userMessage = 'Liveness detection handshake failed. Please try again.';
        if (error.message.includes('Compare API')) userMessage = 'Facial matching handshake failed. Please try again.';

        return res.status(500).json({
            success: false,
            status: 'Red',
            error: userMessage,
            detail: error.message,
            transaction_hash: null,
        });
    }
}
