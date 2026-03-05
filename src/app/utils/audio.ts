// Placeholder audio system - actual audio files to be provided later
class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    const soundFiles = [
      'card_deal',
      'card_select',
      'card_place',
      'card_flip',
      'bluff_correct',
      'bluff_wrong',
      'pickup_pile',
      'pass',
      'round_win',
      'game_win',
      'room_join',
      'disconnect_alert',
      'vote_cast',
    ];

    soundFiles.forEach(name => {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.volume = 0.5;
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    });
  }

  play(soundName: string) {
    if (!this.enabled) return;
    
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => {
        // Silently fail if audio can't play (e.g., user hasn't interacted with page yet)
        console.log(`Audio play failed for ${soundName}:`, err.message);
      });
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const audioManager = new AudioManager();
