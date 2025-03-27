import { LanguageCode } from '../i18n/Language.js';

/**
 * Type for multilingual text mapping
 */
export type LanguageTextMap = Partial<Record<LanguageCode, string>>;
