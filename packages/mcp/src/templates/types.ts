/**
 * テンプレート関連の型定義
 * @deprecated この型定義は@memory-bank/schemasパッケージに移動しました。今後は@memory-bank/schemas/templatesを使用してください。
 */

// スキーマパッケージからの型定義をエクスポート
export * from '@memory-bank/schemas/templates';

// 以下は過去互換性のために残しているが、非推奨
// @deprecated 上記のimportを使用してください

// Language型はドメイン固有のためここに残す
// (schemasパッケージにも同一の定義があるが、循環参照を避けるためここにも定義)
export type Language = 'en' | 'ja' | 'zh';
