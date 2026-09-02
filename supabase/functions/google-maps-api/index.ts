import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify JWT token for authenticated requests
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the JWT token using Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.log('[GoogleMapsAPI] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { endpoint, ...params } = await req.json()
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[GoogleMapsAPI] User ${user.id} making request to: ${endpoint}`)

    // Handle different Google Maps API endpoints
    // We try the NEW Places API (v1) first, and automatically fallback to the Legacy Places API
    // when the project has the new API disabled (SERVICE_DISABLED).

    const locationCenter = { latitude: -3.1190275, longitude: -60.0217314 } // Manaus
    const locationRadiusMeters = 50000

    const isServiceDisabled = (err: any) => {
      if (!err || err.status !== 'PERMISSION_DENIED' || !Array.isArray(err.details)) return false
      return err.details.some(
        (d: any) =>
          d?.['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo' &&
          d?.reason === 'SERVICE_DISABLED'
      )
    }

    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

    switch (endpoint) {
      case 'config': {
        // Frontend use: load Google Maps JS API (key is public anyway; keep verify_jwt=true)
        return new Response(JSON.stringify({ apiKey }), { headers: jsonHeaders })
      }

      case 'places-autocomplete': {
        const input = String(params.input ?? '')
        const sessionToken = params.sessionToken ? String(params.sessionToken) : undefined

        if (input.trim().length < 3) {
          return new Response(JSON.stringify({ predictions: [], status: 'ZERO_RESULTS' }), {
            headers: jsonHeaders,
          })
        }

        let newApiServiceDisabled = false

        // --- NEW Places API (v1)
        // IMPORTANT: The new Places API requires a response FieldMask.
        // If the new API fails for ANY reason, we fall back to the Legacy Places API.
        try {
          const url = 'https://places.googleapis.com/v1/places:autocomplete'
          const requestBody: Record<string, unknown> = {
            input,
            languageCode: 'pt-BR',
            regionCode: 'BR',
            locationBias: {
              circle: {
                center: locationCenter,
                radius: locationRadiusMeters,
              },
            },
          }

          if (sessionToken) requestBody.sessionToken = sessionToken

          console.log('[GoogleMapsAPI] Calling Places Autocomplete API (New)')
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              // Minimal fields we need for the UI
              'X-Goog-FieldMask':
                'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat',
            },
            body: JSON.stringify(requestBody),
          })

          const data = await response.json().catch(() => ({}))
          console.log(`[GoogleMapsAPI] Response status (New): ${response.status}`)

          const apiError = (data as any)?.error
          if (response.ok && !apiError) {
            // Transform new API response to match legacy format for compatibility
            const predictions = ((data as any).suggestions || [])
              .map((suggestion: any) => ({
                place_id: suggestion.placePrediction?.placeId || '',
                description:
                  suggestion.placePrediction?.text?.text ||
                  suggestion.placePrediction?.structuredFormat?.mainText?.text ||
                  '',
                structured_formatting: {
                  main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text || '',
                  secondary_text:
                    suggestion.placePrediction?.structuredFormat?.secondaryText?.text || '',
                },
              }))
              .filter((p: any) => p.place_id && p.description)

            console.log(`[GoogleMapsAPI] Found ${predictions.length} predictions (New)`) 
            return new Response(
              JSON.stringify({
                predictions,
                status: predictions.length ? 'OK' : 'ZERO_RESULTS',
              }),
              { headers: jsonHeaders }
            )
          }

          // Track service disabled to return a clearer message if legacy is also unavailable.
          if (response.status === 403 && isServiceDisabled(apiError)) {
            newApiServiceDisabled = true
          }

          // If the new API is disabled OR just fails (misconfig, fieldmask, restrictions, etc), fall back.
          console.error(
            '[GoogleMapsAPI] New Places API (autocomplete) failed; falling back to Legacy:',
            JSON.stringify(apiError || data)
          )
        } catch (error) {
          console.error('[GoogleMapsAPI] New Places API (autocomplete) exception; falling back to Legacy:', error)
        }

        const legacyParams = new URLSearchParams()
        legacyParams.set('key', apiKey)
        legacyParams.set('input', input)
        legacyParams.set('language', 'pt-BR')
        legacyParams.set('location', `${locationCenter.latitude},${locationCenter.longitude}`)
        legacyParams.set('radius', String(locationRadiusMeters))
        if (params.types) legacyParams.set('types', String(params.types))
        if (params.components) legacyParams.set('components', String(params.components))
        if (sessionToken) legacyParams.set('sessiontoken', sessionToken)

        const legacyUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${legacyParams.toString()}`
        console.log('[GoogleMapsAPI] Calling Places Autocomplete API (Legacy)')

        const legacyResponse = await fetch(legacyUrl, { method: 'GET' })
        const legacyData = await legacyResponse.json().catch(() => ({}))

        const legacyStatus = (legacyData as any)?.status
        const legacyErrorMessage = String((legacyData as any)?.error_message || '')
        console.log(`[GoogleMapsAPI] Legacy status: ${legacyStatus}`)

        // If BOTH APIs are unavailable, return a clear, actionable error for the UI.
        if (
          newApiServiceDisabled &&
          legacyStatus === 'REQUEST_DENIED' &&
          legacyErrorMessage.toLowerCase().includes('legacy')
        ) {
          return new Response(
            JSON.stringify({
              predictions: [],
              status: 'REQUEST_DENIED',
              error_message:
                'Autocomplete indisponível: ative a Places API (New) (places.googleapis.com) no Google Cloud e confirme faturamento/permiteções da chave.',
            }),
            { headers: jsonHeaders }
          )
        }

        return new Response(JSON.stringify(legacyData), { headers: jsonHeaders })
      }

      case 'place-details': {
        const placeId = String(params.place_id ?? '')
        const sessionToken = params.sessionToken ? String(params.sessionToken) : undefined

        if (!placeId) {
          return new Response(JSON.stringify({ error: 'place_id is required' }), {
            status: 400,
            headers: jsonHeaders,
          })
        }

        let newApiServiceDisabled = false

        // --- NEW Places API (v1)
        try {
          const url = `https://places.googleapis.com/v1/places/${placeId}`
          console.log(`[GoogleMapsAPI] Calling Place Details API (New) for place: ${placeId}`)

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              // Minimum fields we need for the app
              'X-Goog-FieldMask': 'formattedAddress,location,addressComponents',
            },
          })

          const data = await response.json().catch(() => ({}))
          console.log(`[GoogleMapsAPI] Place Details response status (New): ${response.status}`)

          const apiError = (data as any)?.error
          if (!response.ok || apiError) {
            if (response.status === 403 && isServiceDisabled(apiError)) {
              newApiServiceDisabled = true
              console.log('[GoogleMapsAPI] New Place Details API disabled; falling back to Legacy Places API')
            } else {
              console.error('[GoogleMapsAPI] New Place Details error:', JSON.stringify(apiError || data))
              return new Response(
                JSON.stringify({
                  result: null,
                  status: 'ERROR',
                  error_message:
                    apiError?.message ||
                    'Erro ao consultar os detalhes do endereço (Places API).',
                }),
                { headers: jsonHeaders }
              )
            }
          } else {
            // Transform new API response to match legacy format for compatibility
            const result = {
              formatted_address: (data as any).formattedAddress || '',
              geometry: {
                location: {
                  lat: (data as any).location?.latitude || 0,
                  lng: (data as any).location?.longitude || 0,
                },
              },
              address_components: ((data as any).addressComponents || []).map((comp: any) => ({
                long_name: comp.longText || '',
                short_name: comp.shortText || '',
                types: comp.types || [],
              })),
            }

            console.log(`[GoogleMapsAPI] Place Details found (New): ${result.formatted_address}`)

            return new Response(JSON.stringify({ result, status: 'OK' }), {
              headers: jsonHeaders,
            })
          }
        } catch (error) {
          console.error('[GoogleMapsAPI] New Places API (details) exception:', error)
          // Continue to legacy fallback below
        }

        // --- Legacy Places API fallback
        const legacyParams = new URLSearchParams()
        legacyParams.set('key', apiKey)
        legacyParams.set('place_id', placeId)
        legacyParams.set('language', 'pt-BR')
        // Keep it minimal; legacy expects snake_case fields
        legacyParams.set('fields', 'formatted_address,geometry,address_component')
        if (sessionToken) legacyParams.set('sessiontoken', sessionToken)

        const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?${legacyParams.toString()}`
        console.log('[GoogleMapsAPI] Calling Place Details API (Legacy)')

        const legacyResponse = await fetch(legacyUrl, { method: 'GET' })
        const legacyData = await legacyResponse.json().catch(() => ({}))

        const legacyStatus = (legacyData as any)?.status
        const legacyErrorMessage = String((legacyData as any)?.error_message || '')
        console.log(`[GoogleMapsAPI] Legacy Place Details status: ${legacyStatus}`)

        if (
          newApiServiceDisabled &&
          legacyStatus === 'REQUEST_DENIED' &&
          legacyErrorMessage.toLowerCase().includes('legacy')
        ) {
          return new Response(
            JSON.stringify({
              result: null,
              status: 'REQUEST_DENIED',
              error_message:
                'Detalhes do endereço indisponíveis: ative a Places API (New) (places.googleapis.com) no Google Cloud e confirme faturamento/permiteções da chave.',
            }),
            { headers: jsonHeaders }
          )
        }

        return new Response(JSON.stringify(legacyData), { headers: jsonHeaders })
      }

      case 'geocoding': {
        // Geocoding API (still uses the legacy endpoint)
        const geocodeParams = new URLSearchParams()
        geocodeParams.set('key', apiKey)
        if (params.address) geocodeParams.set('address', params.address)
        if (params.latlng) geocodeParams.set('latlng', params.latlng)
        if (params.components) geocodeParams.set('components', params.components)
        geocodeParams.set('language', 'pt-BR')

        const url = `https://maps.googleapis.com/maps/api/geocode/json?${geocodeParams.toString()}`

        console.log(`[GoogleMapsAPI] Calling Geocoding API`)

        const response = await fetch(url, { method: 'GET' })
        const data = await response.json()

        console.log(`[GoogleMapsAPI] Geocoding response status: ${data.status}`)

        return new Response(JSON.stringify(data), {
          headers: jsonHeaders,
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
          status: 400,
          headers: jsonHeaders,
        })
    }

  } catch (error) {
    console.error('[GoogleMapsAPI] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
