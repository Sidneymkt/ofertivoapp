import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { lovable } from '@/integrations/lovable/index'
import { toast } from 'sonner'
import { getAppBaseUrl } from '@/lib/config'
import { saveOAuthIntent, getOAuthRedirectUrl, clearOAuthIntent, type OAuthLoginType } from '@/lib/oauthIntent'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  userProfile: any | null
}

interface GoogleSignInOptions {
  referralCode?: string
  redirect?: string
  mode?: 'login' | 'register'
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string, loginType?: 'consumer' | 'business') => Promise<any>
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signInWithGoogle: (loginType?: OAuthLoginType, options?: GoogleSignInOptions) => Promise<any>
  signOut: () => Promise<any>
  updateProfile: (updates: any) => Promise<any>
  resetPassword: (email: string) => Promise<any>
  isAuthenticated: boolean
  isLoading: boolean
}


const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    userProfile: null
  })

  useEffect(() => {
    let mounted = true
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed')
      }

      if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          session: null,
          loading: false,
          userProfile: null
        })
        return
      }

      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false
      }))

      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setAuthState(prev => ({ ...prev, userProfile: null }))
      }
    })

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false
      }))

      if (session?.user) {
        loadUserProfile(session.user.id)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Listen for cross-component profile updates (e.g. avatar upload)
  useEffect(() => {
    const handleUpdate = () => {
      if (authState.user?.id) {
        loadUserProfile(authState.user.id)
      }
    }
    window.addEventListener('user-profile-updated', handleUpdate)
    return () => window.removeEventListener('user-profile-updated', handleUpdate)
  }, [authState.user?.id])


  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setAuthState(prev => ({ ...prev, userProfile: data }))
    } catch (error: any) {
      // Handle JWT expired by refreshing session
      if (error?.code === 'PGRST301') {
        const { data } = await supabase.auth.refreshSession()
        if (data.session) {
          // Retry loading profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
          
          setAuthState(prev => ({ ...prev, userProfile: profileData }))
        }
      } else {
        console.error('[Auth] Error loading profile:', error)
        setAuthState(prev => ({ ...prev, userProfile: null }))
      }
    }
  }

  const signIn = async (email: string, password: string, loginType?: 'consumer' | 'business') => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      let actualUserType = loginType
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('user_id', data.user.id)
          .single()
        
        if (profile?.user_type) {
          actualUserType = profile.user_type as 'consumer' | 'business'
        }
      }

      toast.success('Login realizado com sucesso!')
      return { success: true, data, actualUserType }
    } catch (error: any) {
      const raw = String(error?.message || '')
      let friendly = 'Erro ao fazer login'
      if (/email not confirmed/i.test(raw) || /email_not_confirmed/i.test(raw)) {
        friendly = 'Email não confirmado. Verifique sua caixa de entrada.'
      } else if (/invalid login credentials/i.test(raw) || /invalid email or password/i.test(raw)) {
        friendly = 'Usuário ou senha inválidos'
      }
      toast.error(friendly)
      return { success: false, error, message: friendly }
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${getAppBaseUrl()}/`
        }
      })

      if (error) throw error

      toast.success('Conta criada com sucesso!')
      return { success: true, data }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta')
      return { success: false, error }
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      
      setAuthState(prev => ({
        ...prev,
        user: null,
        session: null,
        userProfile: null
      }))
      
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      
      toast.success('Logout realizado com sucesso!')
      return { success: true }
    } catch (error: any) {
      console.error('Erro ao fazer logout:', error)
      toast.error('Logout realizado')
      return { success: true }
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  const updateProfile = async (updates: any) => {
    try {
      if (!authState.user) throw new Error('Usuário não autenticado')

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', authState.user.id)

      if (error) throw error

      await loadUserProfile(authState.user.id)
      toast.success('Perfil atualizado com sucesso!')
      return { success: true }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil')
      return { success: false, error }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppBaseUrl()}/reset-password`
      })
      if (error) throw error

      toast.success('Email de recuperação enviado!')
      return { success: true }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email de recuperação')
      return { success: false, error }
    }
  }

  const signInWithGoogle = async (
    loginType: OAuthLoginType = 'consumer',
    options?: GoogleSignInOptions
  ) => {
    try {
      saveOAuthIntent({
        loginType,
        referralCode: options?.referralCode,
        redirect: options?.redirect,
        mode: options?.mode ?? 'login'
      })

      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: getOAuthRedirectUrl()
      })

      if (result.error) {
        clearOAuthIntent()
        toast.error('Não foi possível entrar com Google. Tente novamente.')
        return { success: false, error: result.error }
      }

      if (result.redirected) {
        return { success: true, redirected: true }
      }

      // Sessão já definida (fluxo em popup): o callback finaliza o perfil
      window.location.assign(getOAuthRedirectUrl())
      return { success: true }
    } catch (error: any) {
      clearOAuthIntent()
      console.error('[Auth] Google OAuth error:', error)
      toast.error('Erro ao entrar com Google')
      return { success: false, error }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,

        updateProfile,
        resetPassword,
        isAuthenticated: !!authState.user,
        isLoading: authState.loading
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
