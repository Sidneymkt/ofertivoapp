// Persistência segura (sem dados sensíveis) da intenção de cadastro/login OAuth
export type OAuthLoginType = 'consumer' | 'business'

const KEY = 'ofertivo_oauth_intent'

export interface OAuthIntent {
  loginType: OAuthLoginType
  referralCode?: string
  redirect?: string
  mode?: 'login' | 'register'
}

export const saveOAuthIntent = (intent: OAuthIntent) => {
  try {
    const safe: OAuthIntent = {
      loginType: intent.loginType === 'business' ? 'business' : 'consumer',
      referralCode: intent.referralCode?.trim().toUpperCase().slice(0, 32) || undefined,
      redirect: intent.redirect && intent.redirect.startsWith('/') ? intent.redirect : undefined,
      mode: intent.mode
    }
    sessionStorage.setItem(KEY, JSON.stringify(safe))
  } catch {
    // sessionStorage indisponível: segue sem persistir
  }
}

export const readOAuthIntent = (): OAuthIntent | null => {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      loginType: parsed.loginType === 'business' ? 'business' : 'consumer',
      referralCode: typeof parsed.referralCode === 'string' ? parsed.referralCode : undefined,
      redirect: typeof parsed.redirect === 'string' && parsed.redirect.startsWith('/') ? parsed.redirect : undefined,
      mode: parsed.mode === 'register' ? 'register' : 'login'
    }
  } catch {
    return null
  }
}

export const clearOAuthIntent = () => {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

// Redirect OAuth deve ser sempre a origem atual (preview, local ou domínio publicado)
export const getOAuthRedirectUrl = () => `${window.location.origin}/auth/callback`
