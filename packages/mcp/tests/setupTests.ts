/**
 * Vitest setup file for tests
 */
import { vi } from 'vitest';

// Vitestのグローバル設定
// 注: vitest.config.tsで globals: true を設定している場合は
// このファイルの内容は最小限で済む
// @ts-expect-error - Assign vi to global for testing purposes
global.vi = vi;
