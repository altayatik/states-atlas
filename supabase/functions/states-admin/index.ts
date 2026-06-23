import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedStatuses = new Set([
  'not_visited',
  'passed_through',
  'visited',
  'stayed_overnight',
  'lived_there',
  'favorite',
])

const allowedBadges = new Set([
  'best_food',
  'best_nature',
  'best_city',
  'best_road_trip',
  'best_surprise',
  'want_revisit',
  'would_live',
  'chaotic_memorable',
])

const tokenLifetimeSeconds = 60 * 60 * 2
const textEncoder = new TextEncoder()

function getAllowedOrigins() {
  const configured = Deno.env.get('ALLOWED_ORIGIN')
  return new Set([
    ...(configured ? configured.split(',').map((origin) => origin.trim()).filter(Boolean) : []),
    'https://altayatik.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ])
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || ''
  const allowedOrigins = getAllowedOrigins()
  const allowedOrigin = allowedOrigins.has(origin)
    ? origin
    : Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173'

  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Vary': 'Origin',
  }
}

function jsonResponse(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
    },
    status,
  })
}

function base64UrlEncode(bytes: Uint8Array | string) {
  const binary = typeof bytes === 'string'
    ? bytes
    : Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return atob(padded)
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload))
  return base64UrlEncode(new Uint8Array(signature))
}

async function createAdminToken(secret: string) {
  const payload = base64UrlEncode(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds,
    iat: Math.floor(Date.now() / 1000),
  }))
  const signature = await signPayload(payload, secret)
  return `${payload}.${signature}`
}

function safeEqual(left: string, right: string) {
  const leftBytes = textEncoder.encode(left)
  const rightBytes = textEncoder.encode(right)
  if (leftBytes.length !== rightBytes.length) return false

  let result = 0
  for (let index = 0; index < leftBytes.length; index += 1) {
    result |= leftBytes[index] ^ rightBytes[index]
  }
  return result === 0
}

async function verifyAdminToken(token: unknown, secret: string) {
  if (typeof token !== 'string' || !token.includes('.')) return false

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expectedSignature = await signPayload(payload, secret)
  if (!safeEqual(signature, expectedSignature)) return false

  try {
    const decoded = JSON.parse(base64UrlDecode(payload))
    return typeof decoded.exp === 'number' && decoded.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

async function authorize(body: Record<string, unknown>) {
  const adminSecretPhrase = Deno.env.get('ADMIN_SECRET_PHRASE')
  const tokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET')

  if (!adminSecretPhrase) {
    return { error: 'ADMIN_SECRET_PHRASE is not configured', status: 500 as const }
  }

  if (!tokenSecret) {
    return { error: 'ADMIN_TOKEN_SECRET is not configured', status: 500 as const }
  }

  if (typeof body.secretPhrase === 'string' && safeEqual(body.secretPhrase, adminSecretPhrase)) {
    return { adminToken: await createAdminToken(tokenSecret), ok: true as const }
  }

  if (await verifyAdminToken(body.adminToken, tokenSecret)) {
    return { adminToken: await createAdminToken(tokenSecret), ok: true as const }
  }

  return { error: 'Invalid secret phrase', status: 401 as const }
}

function validateStringArray(value: unknown, maxLength: number, allowed?: Set<string>) {
  if (!Array.isArray(value)) return false
  return value.every((item) => (
    typeof item === 'string'
    && item.length <= maxLength
    && (!allowed || allowed.has(item))
  ))
}

function validateEntry(entry: unknown) {
  if (!entry || typeof entry !== 'object') return 'Entry is required.'

  const item = entry as Record<string, unknown>
  if (typeof item.state_code !== 'string' || !/^[A-Z]{2}$/.test(item.state_code)) return 'State code must be a two-letter code.'
  if (typeof item.state_name !== 'string' || item.state_name.length < 1 || item.state_name.length > 80) return 'State name is required and must be 80 characters or fewer.'
  if (typeof item.status !== 'string' || !allowedStatuses.has(item.status)) return 'Status is not allowed.'
  if (item.first_visited_year !== null && item.first_visited_year !== undefined) {
    if (!Number.isInteger(item.first_visited_year) || item.first_visited_year < 1900 || item.first_visited_year > 2100) {
      return 'First visited year must be between 1900 and 2100.'
    }
  }
  if (item.favorite_memory !== null && item.favorite_memory !== undefined) {
    if (typeof item.favorite_memory !== 'string' || item.favorite_memory.length > 1000) return 'Favorite memory is too long.'
  }
  if (!validateStringArray(item.badges ?? [], 80, allowedBadges)) return 'Badges contain an unknown value.'
  if (item.vibe_rating !== null && item.vibe_rating !== undefined) {
    if (!Number.isInteger(item.vibe_rating) || item.vibe_rating < 1 || item.vibe_rating > 5) return 'Vibe rating must be 1 through 5.'
  }
  if (typeof item.honorable_mention !== 'boolean') return 'Honorable mention must be true or false.'
  if (!validateStringArray(item.cities_visited ?? [], 100)) return 'Cities visited contains an invalid value.'
  if (!validateStringArray(item.parks_visited ?? [], 120)) return 'Parks visited contains an invalid value.'

  return ''
}

function getSupabaseAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEYS')

  if (!url || !serviceKey) {
    throw new Error('Supabase admin environment is not configured.')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(request), status: 204 })
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, 405, { error: 'Method not allowed.' })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return jsonResponse(request, 400, { error: 'Invalid JSON body.' })
  }

  const auth = await authorize(body)
  if (!auth.ok) {
    return jsonResponse(request, auth.status, { error: auth.error, ok: false })
  }

  try {
    if (body.action === 'validate') {
      if (!auth.adminToken) {
        return jsonResponse(request, 500, { error: 'Unable to issue admin token.', ok: false })
      }

      return jsonResponse(request, 200, {
        adminToken: auth.adminToken,
        ok: true,
      })
    }

    const supabase = getSupabaseAdminClient()

    if (body.action === 'upsert') {
      const validationError = validateEntry(body.entry)
      if (validationError) return jsonResponse(request, 400, { error: validationError })

      const entry = body.entry as Record<string, unknown>
      const { data, error } = await supabase
        .from('state_travel_entries')
        .upsert(entry, { onConflict: 'state_code' })
        .select('*')
        .single()

      if (error) throw error

      return jsonResponse(request, 200, {
        adminToken: auth.adminToken,
        entry: data,
        ok: true,
      })
    }

    if (body.action === 'delete') {
      const id = typeof body.id === 'string' ? body.id : ''
      const stateCode = typeof body.state_code === 'string' ? body.state_code : ''

      if (!id && !/^[A-Z]{2}$/.test(stateCode)) {
        return jsonResponse(request, 400, { error: 'Delete requires an id or two-letter state_code.' })
      }

      const query = supabase.from('state_travel_entries').delete().select('*')
      const { data, error } = id
        ? await query.eq('id', id)
        : await query.eq('state_code', stateCode)

      if (error) throw error

      return jsonResponse(request, 200, {
        adminToken: auth.adminToken,
        deleted: data,
        ok: true,
        success: true,
      })
    }

    return jsonResponse(request, 400, { error: 'Unsupported action.', ok: false })
  } catch (error) {
    console.error('states-admin unexpected error', error instanceof Error ? error.message : 'Unknown error')
    return jsonResponse(request, 500, { error: 'Unexpected server error.', ok: false })
  }
})
