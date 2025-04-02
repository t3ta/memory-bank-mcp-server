// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 再帰的にディレクトリをコピーする関数
 * @param {string} src - コピー元ディレクトリのパス
 * @param {string} dest - コピー先ディレクトリのパス
 */
async function copyDir(src, dest) {
  // ディレクトリがなければ作成
  await fs.mkdir(dest, { recursive: true });

  // ディレクトリ内の全エントリを取得
  const entries = await fs.readdir(src, { withFileTypes: true });

  // 各エントリに対して処理
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // ディレクトリなら再帰的にコピー
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      // ファイルならコピー
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// メイン処理
async function main() {
  try {
    console.log('🔍 コピー開始...');

    // 翻訳ファイルをコピー
    await copyDir(
      'packages/mcp/src/infrastructure/i18n/translations',
      'packages/mcp/dist/infrastructure/i18n/translations'
    );
    console.log('✅ 翻訳ファイルをコピーしました！');

    // テンプレートをコピー
    await copyDir('src/templates', 'dist/templates');
    console.log('✅ テンプレートをコピーしました！');

    console.log('✨ すべてのアセットを正常にコピーしました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
