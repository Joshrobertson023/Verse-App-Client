export type ReaderPresetKey = 'compact' | 'normal' | 'large' | 'extraLarge';

export type ReaderBackgroundKey = 'default' | 'trueBlack' | 'light' | 'soft';

export interface ReaderSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  background: ReaderBackgroundKey;
  showMetadata: boolean;
  showPublicNoteIcons: boolean;
}

export interface ReaderBackgroundTheme {
  label: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

export interface ReaderFontOption {
  id: string;
  label: string;
  preview?: string;
}

export const READER_FONT_OPTIONS: ReaderFontOption[] = [
  { id: 'System', label: 'System', preview: 'Aa' },
  { id: 'Noto Serif', label: 'Noto Serif', preview: 'Aa' },
  { id: 'Inter', label: 'Inter', preview: 'Aa' },
  { id: 'Merriweather', label: 'Merriweather', preview: 'Aa' },
  { id: 'Lora', label: 'Lora', preview: 'Aa' },
  { id: 'Source Sans Pro', label: 'Source Sans Pro', preview: 'Aa' },
];

export const READER_BACKGROUND_THEMES: Record<ReaderBackgroundKey, ReaderBackgroundTheme> = {
  default: {
    label: 'Default',
    backgroundColor: '#101418',
    textColor: '#F5F7FA',
    accentColor: '#4C82EC',
    borderColor: '#1F252C',
  },
  trueBlack: {
    label: 'True Black',
    backgroundColor: '#000000',
    textColor: '#F9FAFB',
    accentColor: '#5E9BFF',
    borderColor: '#1C1C1E',
  },
  light: {
    label: 'Light',
    backgroundColor: '#F6F7F8',
    textColor: '#1F252C',
    accentColor: '#3066BE',
    borderColor: '#E1E4EA',
  },
  soft: {
    label: 'Warm',
    backgroundColor: '#F4ECD8',
    textColor: '#2F241B',
    accentColor: '#B4833A',
    borderColor: '#E1D2B8',
  },
};

export const READER_PRESETS: Record<ReaderPresetKey, ReaderSettings> = {
  compact: {
    fontFamily: 'Source Sans Pro',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    background: 'default',
    showMetadata: false,
    showPublicNoteIcons: true,
  },
  normal: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    background: 'default',
    showMetadata: true,
    showPublicNoteIcons: true,
  },
  large: {
    fontFamily: 'Lora',
    fontSize: 19,
    lineHeight: 28,
    letterSpacing: 0.1,
    background: 'default',
    showMetadata: true,
    showPublicNoteIcons: true,
  },
  extraLarge: {
    fontFamily: 'Lora',
    fontSize: 22,
    lineHeight: 32,
    letterSpacing: 0.2,
    background: 'default',
    showMetadata: true,
    showPublicNoteIcons: true,
  },
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  ...READER_PRESETS.normal,
  showMetadata: true,
  showPublicNoteIcons: true,
};

export const READER_SETTINGS_STORAGE_KEY = '@verseApp:readerSettings';

