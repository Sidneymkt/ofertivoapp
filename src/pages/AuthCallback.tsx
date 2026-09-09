import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { readOAuthIntent, clearOAuthIntent } from '@/lib/oauthIntent'

const AuthCallback = () => {
  const navigate = useNavigate()
  const processing = useRef(false)

  useEffect(() => {
    if (processing.current) return
    processing.current = true

    let cancelled = false

    const finish = async () => {
      const intent = readOAuthIntent()

      // Aguarda a sessão ser hidratada após o retorno do provedor
      let user = null
      for (let i = 0; i < 25 && !cancelled; i++) {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          user = data.session.user
          break
        }
        await new Promise((r) => setTimeout(r, 300))
      }

      if (cancelled) return

      if (!user) {
        clearOAuthIntent()
        toast.error('Não foi possível concluir o login com Google. Tente novamente.')
        navigate('/login', { replace: true })
        return
      }

      const desiredType = intent?.loginType ?? 'consumer'
      let profile: any = null

      // O perfil é criado por trigger no cadastro; aqui apenas aguardamos/complementamos
      for (let i = 0; i < 12 && !cancelled; i++) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) {
          profile = data
          break
        }
        await new Promise((r) => setTimeout(r, 400))
      }

      if (cancelled) return

      const meta: any = user.user_metadata || {}
      const providerName = (meta.full_name || meta.name || '').trim()
      const providerAvatar = meta.avatar_url || meta.picture || null
      const isNew = !profile

      if (profile) {
        const updates: Record<string, any> = {}
        if (!profile.full_name && providerName) updates.full_name = providerName
        if (!profile.avatar_url && providerAvatar) updates.avatar_url = providerAvatar
        if (intent?.mode === 'register' && desiredType === 'business' && profile.user_type !== 'business') {
          updates.user_type = 'business'
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('user_id', user.id)
        }

        // Aplica indicação apenas se ainda não houver
        if (intent?.referralCode && !profile.referred_by) {
          try {
            const { data: referrer } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('referral_code', intent.referralCode)
              .maybeSingle()
            if (referrer?.user_id && referrer.user_id !== user.id) {
              await supabase.from('profiles').update({ referred_by: referrer.user_id }).eq('user_id', user.id)
            }
          } catch (e) {
            console.error('[AuthCallback] Falha ao aplicar indicação:', e)
          }
        }
      }

      const effectiveType = profile?.user_type === 'business' || (intent?.mode === 'register' && desiredType === 'business')
        ? 'business'
        : 'consumer'

      clearOAuthIntent()

      if (intent?.mode === 'register' || isNew) {
        toast.success('Cadastro realizado com sucesso!')
      } else {
        toast.success('Login realizado com sucesso!')
      }

      if (intent?.redirect) {
        navigate(intent.redirect, { replace: true })
        return
      }

      if (effectiveType === 'business') {
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (!business) {
          toast.info('Complete os dados do seu negócio para acessar o painel')
          navigate('/anunciante/perfil', { replace: true })
          return
        }
        navigate('/dashboard', { replace: true })
        return
      }

      navigate('/ofertas', { replace: true })
    }

    finish()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Concluindo seu acesso com Google...</p>
      </div>
    </div>
  )
}

export default AuthCallback
