#!/usr/bin/env node

/**
 * 循環依存チェックスクリプト
 *
 * このスクリプトはプロジェクト内の循環依存関係を検出します。
 * 循環依存はメモリリークや予期しない動作の原因となることがあります。
 */

import madge from 'madge';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../src');

async function main() {
  try {
    console.log('循環依存のチェックを開始します..');
    console.log(`対象ディレクトリ: ${SRC_DIR}`);

    const result = await madge(SRC_DIR, {
      fileExtensions: ['ts'],
      excludeRegExp: [/\.d\.ts$/, /\bnode_modules\b/, /\bdist\b/, /\bcoverage\b/]
    });

    // 循環依存関係の検出
    const circularDeps = result.circular();

    if (circularDeps.length > 0) {
      console.error('\n🔄 循環依存が検出されました:');
      circularDeps.forEach((paths, i) => {
        console.error(`\n循環 #${i + 1}:`);
        const formattedPath = paths.join('\n  ↓\n');
        console.error(formattedPath);
        console.error(`  ↓\n${paths[0]} (循環開始点に戻る)`);
      });

      // 循環依存の数をカウント
      console.error(`\n合計 ${circularDeps.length} 個の循環依存が見つかりました。`);
      process.exit(1);
    } else {
      console.log('✅ 循環依存は見つかりませんでした。');
    }

    // 基本情報
    console.log('\n📊 依存関係の基本情報:');

    try {
      const modules = Object.keys(result.obj()).length;
      console.log(`- モジュール総数: ${modules}`);
    } catch {
      console.log('- モジュール情報の取得に失敗しました');
    }

  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('予期しないエラーが発生しました:', error);
  process.exit(1);
});
