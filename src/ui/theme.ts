import type { ThemeId } from '../core/preferences.ts';

export type Palette = {
  name: string;
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    ink: string;
    secondary: string;
    border: string;
    accent: string;
    onAccent: string;
    warning: string;
    error: string;
    figureShadow: string;
  };
  figure: { shadow: number[]; light: number[] };
};

export const palettes: Record<ThemeId, Palette> = {
  ink: {
    name: 'Ink', dark: true,
    colors: {
      background: '#151515', surface: '#202020', surfaceMuted: '#2B2B2B',
      ink: '#F4F4F2', secondary: '#A4A4A0', border: '#363634',
      accent: '#FE915E', onAccent: '#20160E', warning: '#EAC06E',
      error: '#FF9292', figureShadow: '#000000',
    },
    figure: { shadow: [70, 70, 72], light: [224, 224, 218] },
  },
  paper: {
    name: 'Paper', dark: false,
    colors: {
      background: '#F7F7F5', surface: '#FFFFFF', surfaceMuted: '#EAEAE6',
      ink: '#202020', secondary: '#666662', border: '#D9D9D3',
      accent: '#303030', onAccent: '#FFFFFF', warning: '#875211',
      error: '#B33636', figureShadow: '#444440',
    },
    figure: { shadow: [61, 61, 63], light: [192, 192, 187] },
  },
  blue: {
    name: 'Blue', dark: true,
    colors: {
      background: '#101C30', surface: '#17273F', surfaceMuted: '#213651',
      ink: '#F0F4FC', secondary: '#A7B8CE', border: '#30465F',
      accent: '#91BDFF', onAccent: '#10213A', warning: '#F1C77C',
      error: '#FF9EA4', figureShadow: '#020817',
    },
    figure: { shadow: [49, 73, 104], light: [207, 222, 246] },
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20 };
