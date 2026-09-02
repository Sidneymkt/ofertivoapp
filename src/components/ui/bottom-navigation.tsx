import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Tag, Map, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';

export const BottomNavigation = () => {
  const location = useLocation();
  const { isAuthenticated, userProfile } = useAuth();
  const { business } = useBusiness();
  
  const isActive = (path: string) => location.pathname === path;
  
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
  
  const navItems = [
    { path: '/', icon: Home, label: 'Início' },
    { path: '/ofertas', icon: Tag, label: 'Ofertas' },
    { path: '/mapa', icon: Map, label: 'Mapa' },
    { path: '/pontos', icon: Trophy, label: 'Pontos' },
    { path: '/comunidade', icon: Users, label: 'Comunidade' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-1.5 px-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={`${item.path}-${index}`}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-colors min-w-0 flex-1",
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};