export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface BleedMetaOptions {
  themeColor?: string;
  appleWebApp?: boolean;
  appleStatusBarStyle?: string;
}

export interface BleedColorStop {
  progress: number;
  color: string;
}

export declare function getSafeAreaInsets(): SafeAreaInsets;
export declare function setThemeColor(color: string | null | undefined): () => void;
export declare function setupBleedMeta(options?: BleedMetaOptions): () => void;
export declare function trackScrollColors(stops: BleedColorStop[], options?: Omit<BleedMetaOptions, 'themeColor'>): () => void;



