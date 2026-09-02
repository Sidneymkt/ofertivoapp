import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

export const useAdminAuth = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLevel, setAdminLevel] = useState<'master' | 'support' | 'audit' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || authLoading) {
        setLoading(authLoading);
        return;
      }

      try {
        // Check using RPC function - this is the ONLY source of truth for admin status
        const { data: adminData, error } = await supabase.rpc('check_admin_status', {
          check_user_id: user.id
        });

        if (error) {
          console.error('Error checking admin status:', error);
          // SECURITY FIX: Fail-secure - deny access on error instead of falling back to hardcoded emails
          setIsAdmin(false);
          setAdminLevel(null);
        } else if (adminData && Array.isArray(adminData) && adminData.length > 0) {
          const admin = adminData[0];
          setIsAdmin(admin.is_active);
          setAdminLevel(admin.role as 'master' | 'support' | 'audit');
        } else {
          // No admin record found - deny access
          setIsAdmin(false);
          setAdminLevel(null);
        }
      } catch (error) {
        console.error('Error in admin check:', error);
        // SECURITY FIX: Fail-secure - deny access on any exception
        setIsAdmin(false);
        setAdminLevel(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, authLoading, userProfile]);

  return {
    isAdmin,
    adminLevel,
    loading,
    user,
    userProfile
  };
};
