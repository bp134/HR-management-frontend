import { createRemoteJWKSet, jwtVerify } from 'jose';
import { azureIssuer, azureJwksUrl, config } from '../config.js';
const JWKS = createRemoteJWKSet(azureJwksUrl);
function pickEmail(payload) {
    const preferred = payload.preferred_username;
    if (typeof preferred === 'string' && preferred.includes('@'))
        return preferred.toLowerCase();
    const email = payload.email;
    if (typeof email === 'string' && email.includes('@'))
        return email.toLowerCase();
    const upn = payload.upn;
    if (typeof upn === 'string' && upn.includes('@'))
        return upn.toLowerCase();
    return null;
}
function audienceMatches(aud) {
    const expected = config.azureApiClientId;
    const apiUri = `api://${expected}`;
    const audiences = Array.isArray(aud) ? aud : aud ? [aud] : [];
    return audiences.some(a => a === expected || a === apiUri || String(a).includes(expected));
}
export async function validateAccessToken(token) {
    const { payload } = await jwtVerify(token, JWKS, {
        issuer: azureIssuer,
    });
    if (!audienceMatches(payload.aud)) {
        throw new Error('Token audience does not match this API');
    }
    const oid = payload.oid ?? payload.sub;
    if (typeof oid !== 'string' || !oid) {
        throw new Error('Token missing oid claim');
    }
    const email = pickEmail(payload);
    if (!email) {
        throw new Error('Token missing email claim');
    }
    return { oid, email };
}
