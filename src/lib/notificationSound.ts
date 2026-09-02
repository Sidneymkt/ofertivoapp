// Shared notification sound player
let audioInstance: HTMLAudioElement | null = null;

const getAudio = (): HTMLAudioElement => {
  if (!audioInstance) {
    audioInstance = new Audio('/notification-sound.mp3');
    audioInstance.volume = 0.5;
  }
  return audioInstance;
};

/**
 * Play the notification sound if the user has sound enabled in preferences.
 * Reads preferences from localStorage to avoid hook dependency.
 */
export const playNotificationSound = async () => {
  try {
    const stored = localStorage.getItem('ofertivo_notification_preferences');
    if (stored) {
      const prefs = JSON.parse(stored);
      if (prefs.soundEnabled === false) return;
    }
    const audio = getAudio();
    audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

/**
 * Play sound specifically for message notifications.
 */
export const playMessageSound = async () => {
  try {
    const stored = localStorage.getItem('ofertivo_notification_preferences');
    if (stored) {
      const prefs = JSON.parse(stored);
      if (prefs.soundEnabled === false || prefs.messagesSound === false) return;
    }
    const audio = getAudio();
    audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    console.log('Could not play message sound:', error);
  }
};
