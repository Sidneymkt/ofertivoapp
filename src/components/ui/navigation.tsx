import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { ThemeToggleCompact } from './theme-toggle';
import NotificationDropdown from '@/components/NotificationDropdown';
import { AdminAccessButton } from '@/components/AdminAccessButton';
import logoOfertivo from '@/assets/logo-ofertivo.png';

interface NavigationProps {
  className?: string;
}

export const Navigation = ({ className }: NavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signOut, user, userProfile } = useAuth();
  const { business, businessLogoUrl, logoVersion } = useBusiness();
  const isBusiness = userProfile?.user_type === 'business' || !!business?.id;

  const [avatarVersion, setAvatarVersion] = useState(0);
  useEffect(() => {
    const bump = () => setAvatarVersion((v) => v + 1);
    window.addEventListener('user-profile-updated', bump);
    window.addEventListener('business-profile-updated', bump);
    return () => {
      window.removeEventListener('user-profile-updated', bump);
      window.removeEventListener('business-profile-updated', bump);
    };
  }, []);

  const rawAvatar = isBusiness && businessLogoUrl ? businessLogoUrl : userProfile?.avatar_url;
  const v = (isBusiness ? logoVersion : 0) + avatarVersion;
  const avatarSrc = rawAvatar
    ? `${rawAvatar}${rawAvatar.includes('?') ? '&' : '?'}v=${v}`
    : undefined;


  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Função para extrair o primeiro nome
  const getDisplayName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name.split(' ')[0];
    }
    // Fallback para o primeiro parte do email se não houver nome
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  };

  // Função para determinar o link do perfil baseado no tipo de usuário
  const getProfileLink = () => {
    // Primeiro verifica se tem user_type definido no perfil
    if (userProfile?.user_type === 'business') {
      return '/anunciante/dashboard';
    }
    
    // Fallback: se tem business ativo também considera anunciante
    if (business?.id && userProfile?.user_type !== 'consumer') {
      return '/anunciante/dashboard';
    }
    
    // Por padrão, consumidores vão para o perfil
    return '/perfil';
  };

  return (
    <nav className={cn("flex items-center gap-3 sm:gap-6", className)}>
      <Link to="/" className="flex items-center shrink-0">
        <img 
          src={logoOfertivo} 
          alt="Ofertivo" 
          className="h-7 sm:h-8 w-auto"
        />
      </Link>
      
      <div className="hidden lg:flex items-center gap-4 ml-8">
        <Link 
          to="/ofertas" 
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            isActive("/ofertas") ? "text-primary" : "text-muted-foreground"
          )}
        >
          Ofertas
        </Link>
        <Link 
          to="/mapa" 
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            isActive("/mapa") ? "text-primary" : "text-muted-foreground"
          )}
        >
          Mapa
        </Link>
        <Link 
          to="/pontos" 
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            isActive("/pontos") ? "text-primary" : "text-muted-foreground"
          )}
        >
          Pontos
        </Link>
        <Link 
          to="/comunidade" 
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            isActive("/comunidade") ? "text-primary" : "text-muted-foreground"
          )}
        >
          Comunidade
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggleCompact />
        
        {isAuthenticated ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <AdminAccessButton />
            <NotificationDropdown />
            <Link to={getProfileLink()} className="flex items-center gap-2">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage src={avatarSrc} alt={getDisplayName()} />
                <AvatarFallback className="bg-gradient-primary text-white text-xs sm:text-sm font-medium">
                  {getDisplayName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden lg:block">
                Olá, {getDisplayName()}
              </span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden sm:flex">
              Sair
            </Button>
          </div>
        ) : (
          <>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                Entrar
              </Button>
            </Link>
            <Link to="/cadastro" className="hidden sm:block">
              <Button size="sm" className="bg-gradient-primary text-xs sm:text-sm">
                Cadastrar
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};