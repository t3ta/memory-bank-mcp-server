// workspace-check.ts
// シンプルなワークスペースパラメータチェック用テストスクリプト

import { createApplication } from '../../src/main/index.js';
import { logger } from '../../src/shared/utils/index.js';

// ログ出力をオーバーライド
const originalInfo = logger.info;
logger.info = function(...args: any[]) {
  console.log(...args);
  return originalInfo.apply(this, args);
};

async function testWorkspaceParam() {
  console.log('------ ワークスペースパラメータテスト開始 ------');
  
  // テスト用パス
  const testWorkspace = '/tmp/test-workspace';
  const testDocs = '/tmp/test-docs';
  
  try {
    console.log(`テストワークスペース: ${testWorkspace}`);
    console.log(`テストドキュメントパス: ${testDocs}`);
    
    // 明示的にワークスペースとドキュメントパスを指定してアプリケーション作成
    const app = await createApplication({
      workspace: testWorkspace,
      memoryRoot: testDocs,
      language: 'ja',
      verbose: true,
    });
    
    // アプリケーションのオプション（public化済み）を確認
    console.log('アプリケーションオプション:', app.options);
    
    // 設定を確認
    console.log('-----');
    console.log('テスト完了!');
    
  } catch (error) {
    console.error('テスト失敗:', error);
  }
}

// テスト実行
testWorkspaceParam();
