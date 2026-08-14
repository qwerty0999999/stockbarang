import { SignJWT, jwtVerify } from 'jose';

import { JWT_SECRET as JWT_SECRET_STR } from '$env/static/private';
if (!JWT_SECRET_STR) throw new Error('JWT_SECRET must be set');
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR);

export async function generateToken(payload: { userId: number; username: string; role: string }) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1d')
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: number; username: string; role: string };
    } catch {
        return null;
    }
}
