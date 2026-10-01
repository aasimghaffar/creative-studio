/** Logo studio settings — standalone model; the backend builds the AI prompt. */
export interface LogoSettings {
  prompt: string;
  negativePrompt: string;
  /** Selected prompt template label (null = none). */
  template: string | null;
  style: string;
  /** Up to 3 brand colors (hex). */
  colors: string[];
  ratio: string;
  quantity: number;
  quality: string;
  transparent: boolean;
}
