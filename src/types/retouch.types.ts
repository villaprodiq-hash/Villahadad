// Retouch Style Options
export type RetouchStyle = 'Natural' | 'Sura Style' | 'Custom';

// Specific Retouch Options
export type RetouchOption =
  | 'Double Chin'
  | 'Eye Opening'
  | 'Object Removal'
  | 'Teeth Whitening'
  | 'Skin Smoothing'
  | 'Hair Fix'
  | 'Body Slimming';

// Global Retouch Preferences (Layer 1)
export interface RetouchPreferences {
  style: RetouchStyle;
  globalTeethWhitening: boolean;
  globalSkinSmoothing: boolean;
  globalBodySlimming: boolean;
  notes: string;
}

// Image-Specific Retouch Tag (Layer 2)
export interface ImageRetouchTag {
  id: string;
  imageId: string;
  option: RetouchOption;
  notes?: string;
  position?: { x: number; y: number };
}
