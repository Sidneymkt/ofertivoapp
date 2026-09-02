import { useNavigate } from 'react-router-dom';

export const useUserNavigation = () => {
  const navigate = useNavigate();

  const navigateToUserProfile = (userId: string) => {
    if (!userId) return;
    navigate(`/usuario/${userId}`);
  };

  const navigateToBusinessProfile = (businessId: string) => {
    if (!businessId) return;
    navigate(`/negocio/${businessId}`);
  };

  return {
    navigateToUserProfile,
    navigateToBusinessProfile,
  };
};