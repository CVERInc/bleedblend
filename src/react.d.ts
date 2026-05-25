import * as React from 'react';

export interface BleedProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  themeColor?: string;
  appleWebApp?: boolean;
  appleStatusBarStyle?: string;
}


export declare const BleedTop: React.FC<BleedProps>;
export declare const BleedBottom: React.FC<BleedProps>;
export declare const BleedInnerBlur: React.FC<BleedProps>;
