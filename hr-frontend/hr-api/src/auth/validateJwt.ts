import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { azureIssuer, azureJwksUrl, config } from '../config.js'

const JWKS = createRemoteJWKSet(azureJwksUrl)

export interface TokenClaims {
  oid: string
  email: string | null
}

function pickEmail(payload: JWTPayload): string | null {
  const candidates = [
    payload.preferred_username,
    payload.email,
    payload.upn,
    payload.unique_name,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.includes('@')) {
      return value.toLowerCase()
    }
  }
  return null
}

function audienceMatches(aud: JWTPayload['aud']): boolean {
  const expected = config.azureApiClientId
  const apiUri = `api://${expected}`
  const audiences = Array.isArray(aud) ? aud : aud ? [aud] : []
  return audiences.some(
    a => a === expected || a === apiUri || String(a).includes(expected)
  )
}

const validIssuers = [
  azureIssuer,
  `https://sts.windows.net/${config.azureTenantId}/`,
]

export async function validateAccessToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: validIssuers,
  })

  if (!audienceMatches(payload.aud)) {
    throw new Error(
      `Token audience does not match this API (aud: ${JSON.stringify(payload.aud)})`
    )
  }

  const oid = payload.oid ?? payload.sub
  if (typeof oid !== 'string' || !oid) {
    throw new Error('Token missing oid claim')
  }

  return { oid, email: pickEmail(payload) }
}
