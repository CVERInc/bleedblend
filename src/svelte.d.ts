import { BleedMetaOptions } from './utils';

export interface SvelteActionReturn<Parameter = any> {
  update?: (parameter: Parameter) => void;
  destroy?: () => void;
}

export declare function bleedTop(node: HTMLElement, options?: string | BleedMetaOptions): SvelteActionReturn<string | BleedMetaOptions | undefined>;
export declare function bleedBottom(node: HTMLElement, options?: string | BleedMetaOptions): SvelteActionReturn<string | BleedMetaOptions | undefined>;
export declare function bleedInnerBlur(node: HTMLElement): SvelteActionReturn;
