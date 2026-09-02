import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export const AdminAccessButton = () => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => navigate('/admin')}
      className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:bg-primary/10"
    >
      <Crown className={`w-4 h-4 text-primary ${!isMobile ? 'mr-2' : ''}`} />
      {!isMobile && 'Admin Master'}
    </Button>
  );
};