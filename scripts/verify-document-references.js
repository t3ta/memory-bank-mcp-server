/**
 * グローバルメモリバンクの参照整合性を検証するスクリプト
 * 
 * 使用方法: node verify-document-references.js
 * 
 * このスクリプトは、グローバルメモリバンク内のドキュメント間の参照を確認し、
 * 存在しないファイルや古いパスへの参照を検出します。
 */

const fs = require('fs');
const path = require('path');

// グローバルメモリバンクのルートディレクトリ
const MEMORY_BANK_ROOT = path.resolve(__dirname, '../docs/global-memory-bank');

// 結果保存用の変数
const results = {
  scannedFiles: 0,
  validReferences: 0,
  invalidReferences: 0,
  errors: []
};

/**
 * ディレクトリ内のすべてのJSONファイルを再帰的に取得
 * @param {string} dir ディレクトリパス
 * @param {Array<string>} fileList ファイルリスト
 * @returns {Array<string>} JSONファイルのリスト
 */
function getAllJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      getAllJsonFiles(fullPath, fileList);
    } else if (file.endsWith('.json')) {
      fileList.push(fullPath);
    }
  });
  
  return fileList;
}

/**
 * ファイルパスが存在するかチェック
 * @param {string} filePath ファイルパス
 * @returns {boolean} 存在すればtrue
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * JSONファイル内の参照を抽出
 * @param {string} filePath ファイルパス
 * @returns {Array<string>} 参照パスのリスト
 */
function extractReferences(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);
    const references = [];
    
    // contentセクション内の参照を検索
    if (json.content) {
      const contentStr = JSON.stringify(json.content);
      
      // パターン: "path": "xxx.json" または "path":"xxx.json"
      const pathMatches = contentStr.match(/"path"\s*:\s*"([^"]+\.json)"/g) || [];
      
      pathMatches.forEach(match => {
        const pathValue = match.replace(/"path"\s*:\s*"/, '').replace(/"$/, '');
        references.push(pathValue);
      });
      
      // パターン: referencedDocuments内のpath
      if (json.content.referencedDocuments) {
        json.content.referencedDocuments.forEach(ref => {
          if (ref.path && ref.path.endsWith('.json')) {
            references.push(ref.path);
          }
        });
      }
    }
    
    return references;
  } catch (err) {
    results.errors.push({
      file: filePath,
      error: `JSONパース失敗: ${err.message}`
    });
    return [];
  }
}

/**
 * 参照パスを検証
 * @param {string} referencePath 参照パス
 * @param {string} sourceFile 参照元ファイル
 */
function validateReference(referencePath, sourceFile) {
  // 絶対パスの場合
  if (referencePath.startsWith('/')) {
    const absolutePath = path.resolve(referencePath);
    if (fileExists(absolutePath)) {
      results.validReferences++;
    } else {
      // ファイルが見つからない場合
      results.invalidReferences++;
      results.errors.push({
        file: sourceFile,
        error: `無効な参照: ${referencePath}`
      });
    }
    return;
  }
  
  // docs/global-memory-bank/から始まる場合
  if (referencePath.startsWith('docs/global-memory-bank/')) {
    const normalizedPath = path.resolve(process.cwd(), referencePath);
    if (fileExists(normalizedPath)) {
      results.validReferences++;
    } else {
      // ファイルが見つからない場合
      results.invalidReferences++;
      results.errors.push({
        file: sourceFile,
        error: `無効な参照: ${referencePath}`
      });
    }
    return;
  }
  
  // 相対パスの場合
  const sourceDir = path.dirname(sourceFile);
  const absolutePath = path.resolve(sourceDir, referencePath);
  
  if (fileExists(absolutePath)) {
    results.validReferences++;
  } else {
    // ファイルが見つからない場合
    results.invalidReferences++;
    results.errors.push({
      file: sourceFile,
      error: `無効な参照: ${referencePath}`
    });
  }
}

/**
 * メインの実行関数
 */
function main() {
  console.log('グローバルメモリバンクの参照整合性を検証しています...');
  
  // すべてのJSONファイルを取得
  const jsonFiles = getAllJsonFiles(MEMORY_BANK_ROOT);
  results.scannedFiles = jsonFiles.length;
  
  console.log(`全${jsonFiles.length}ファイルをスキャンします...`);
  
  // 各ファイルの参照を検証
  jsonFiles.forEach(file => {
    const references = extractReferences(file);
    
    references.forEach(ref => {
      validateReference(ref, file);
    });
  });
  
  // 結果を表示
  console.log('\n検証結果:');
  console.log(`スキャンしたファイル: ${results.scannedFiles}`);
  console.log(`有効な参照: ${results.validReferences}`);
  console.log(`無効な参照: ${results.invalidReferences}`);
  
  if (results.invalidReferences > 0) {
    console.log('\n無効な参照の詳細:');
    results.errors.forEach(err => {
      if (err.error.startsWith('無効な参照')) {
        console.log(`- ${err.file}: ${err.error}`);
      }
    });
  }
  
  if (results.errors.filter(err => !err.error.startsWith('無効な参照')).length > 0) {
    console.log('\nその他のエラー:');
    results.errors.forEach(err => {
      if (!err.error.startsWith('無効な参照')) {
        console.log(`- ${err.file}: ${err.error}`);
      }
    });
  }
  
  console.log('\n検証が完了しました。');
}

// スクリプト実行
main();
