import { useState, useEffect, useCallback } from 'react';

export interface NotificationPreferences {
  soundEnabled: boolean;
  messagesSound: boolean;
  newOffersSound: boolean;
  browserNotifications: boolean;
  // Pesca Digital
  pescaDigitalEnabled: boolean;
  // Notification types
  notifyOffers: boolean;
  notifyMessages: boolean;
  notifyRaffles: boolean;
  notifyPromotions: boolean;
  notifyCheckins: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  messagesSound: true,
  newOffersSound: true,
  browserNotifications: true,
  pescaDigitalEnabled: true,
  notifyOffers: true,
  notifyMessages: true,
  notifyRaffles: true,
  notifyPromotions: true,
  notifyCheckins: true,
};

const STORAGE_KEY = 'ofertivo_notification_preferences';

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
    setIsLoaded(true);
  }, []);

  const savePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving notification preferences:', error);
      }
      return updated;
    });
  }, []);

  const togglePreference = useCallback((key: keyof NotificationPreferences) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving notification preferences:', error);
      }
      return updated;
    });
  }, []);

  return {
    preferences,
    isLoaded,
    savePreferences,
    togglePreference,
    // Legacy compat
    toggleSoundEnabled: () => togglePreference('soundEnabled'),
    toggleMessagesSound: () => togglePreference('messagesSound'),
    toggleNewOffersSound: () => togglePreference('newOffersSound'),
    toggleBrowserNotifications: () => togglePreference('browserNotifications'),
  };
};

// Check if notifications are fully allowed (browser + user prefs)
export const areNotificationsAllowed = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const prefs = JSON.parse(stored);
      return prefs.browserNotifications !== false;
    }
  } catch {}
  return true;
};

// Check if Pesca Digital is enabled
export const isPescaDigitalEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const prefs = JSON.parse(stored);
      return prefs.pescaDigitalEnabled !== false;
    }
  } catch {}
  return true;
};

// Utility to update PWA badge count
export const updateAppBadge = async (count: number) => {
  // Only set badge if notifications are allowed
  if (!areNotificationsAllowed()) return;
  
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch (error) {
      console.warn('App badge not supported:', error);
    }
  }
};

// Utility to clear PWA badge
export const clearAppBadge = async () => {
  if ('clearAppBadge' in navigator) {
    try {
      await (navigator as any).clearAppBadge();
    } catch (error) {
      console.warn('Clear app badge not supported:', error);
    }
  }
};
