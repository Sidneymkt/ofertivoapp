import type { QueryClient } from '@tanstack/react-query';

type BusinessProfileSyncOptions = {
  queryClient?: QueryClient;
  businessId?: string | null;
  ownerId?: string | null;
};

const invalidate = (queryClient: QueryClient, queryKey: unknown[]) => {
  queryClient.invalidateQueries({ queryKey });
};

export const invalidateBusinessProfileQueries = ({
  queryClient,
  businessId,
  ownerId,
}: BusinessProfileSyncOptions) => {
  if (!queryClient) return;

  invalidate(queryClient, ['active-advertisers-bar']);
  invalidate(queryClient, ['map-offers']);
  invalidate(queryClient, ['business-dashboard']);
  invalidate(queryClient, ['business-offers']);

  if (businessId) {
    invalidate(queryClient, ['public-business-profile', businessId]);
    invalidate(queryClient, ['business-offers', businessId]);
    invalidate(queryClient, ['business-offers-for-links', businessId]);
    invalidate(queryClient, ['business', businessId]);
    invalidate(queryClient, ['business-public', businessId]);
    invalidate(queryClient, ['business-status', businessId]);
  }

  if (ownerId) {
    invalidate(queryClient, ['business-dashboard', ownerId]);
    invalidate(queryClient, ['owner-business', ownerId]);
    invalidate(queryClient, ['my-business', ownerId]);
    invalidate(queryClient, ['business-status', ownerId]);
  }
};

export const dispatchBusinessProfileUpdated = ({ businessId, ownerId }: BusinessProfileSyncOptions = {}) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('business-profile-updated', {
      detail: { businessId, ownerId, version: Date.now() },
    })
  );
};

export const syncBusinessProfileUpdate = (options: BusinessProfileSyncOptions = {}) => {
  invalidateBusinessProfileQueries(options);
  dispatchBusinessProfileUpdated(options);
};