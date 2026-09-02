
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import CheckinModal from './CheckinModal';

interface CheckinButtonProps {
  offerId: string;
  businessId: string;
  offerTitle: string;
  className?: string;
}

const CheckinButton: React.FC<CheckinButtonProps> = ({
  offerId,
  businessId,
  offerTitle,
  className = ''
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 ${className}`}
        size="lg"
      >
        <MapPin className="w-4 h-4" />
        Fazer Check-in
      </Button>

      <CheckinModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        offerId={offerId}
        businessId={businessId}
        offerTitle={offerTitle}
      />
    </>
  );
};

export default CheckinButton;
