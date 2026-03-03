export const generateClientMagicLink = (matterId: string) => {
    // Generates a mock UUID/Token mapped to a specific matter
    const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const baseUrl = window.location.origin;
    const magicLink = `${baseUrl}/?token=${token}&matter=${matterId}`;

    // In a real application, you would POST this to your backend to save:
    // { token, matterId, createdAt: Date.now(), expiresAt: Date.now() + 3600000, active: true }

    return { token, magicLink };
};
