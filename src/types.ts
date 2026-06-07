export interface WheelOption {
  id: string;
  text: string;
  color: string;
  enabled: boolean;
  stock: number | null;
}

export interface Preset {
  id: string;
  name: string;
  options: string[];
}

export interface WheelConfig {
  soundEnabled: boolean;
  removeAfterWinner: boolean;
  spinDuration: number; // in seconds
  theme: string; // 'rainbow' | 'pastel' | 'neon' | 'sunset' | 'ocean'
  showConfetti: boolean;
}

export interface SpinResult {
  id: string;
  optionText: string;
  timestamp: string;
}

export interface Participant {
  id: string;
  fullName: string;
  address: string;
  phone: string;
  email: string;
  timestamp: string;
  wonPrize?: string;
}
