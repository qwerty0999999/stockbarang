import { SignJWT, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';

function getJwtSecret() {
    const secret = env.JWT_SECRET || process.env.JWT_SECRET || 'default-secret-stockbarang-svivoa-2026';
    return new TextEncoder().encode(secret);
}

export async function generateToken(payload: { userId: number; username: string; role: string }) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1d')
        .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload as { userId: number; username: string; role: string };
    } catch {
        return null;
    }
}
