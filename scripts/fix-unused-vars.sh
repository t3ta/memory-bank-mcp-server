#!/bin/bash
# 未使用変数を修正するスクリプトのメインランチャー

# スクリプトファイルを一時ディレクトリに保存
TEMP_DIR=$(mktemp -d)
SIMPLE_SCRIPT="$TEMP_DIR/fix-simple.sh"
ESLINT_SCRIPT="$TEMP_DIR/fix-eslint.js"

echo "一時ディレクトリを作成: $TEMP_DIR"

# シンプルなfixスクリプトをファイルに保存
cat > "$SIMPLE_SCRIPT" << 'EOF'
#!/bin/bash
# 未使用変数を簡単に修正するスクリプト

# プロジェクトルート
PROJECT_ROOT=$(pwd)
echo "プロジェクトルート: $PROJECT_ROOT"

# 修正対象のパターン
echo "未使用変数パターンを修正中..."

# 1. catch文でのエラー変数を修正
find "$PROJECT_ROOT" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" -not -path "*/coverage/*" -exec sed -i'.bak' -E 's/catch\s*\(\s*(err|e|error)\s*\)/catch (_\1)/g' {} \;

# 2. mermaid-generator.tsの個別修正
if [ -f "$PROJECT_ROOT/tools/mermaid-generator.ts" ]; then
  echo "tools/mermaid-generator.tsを修正中..."
  # FileStructureの未使用参照を修正
  sed -i'.bak' -E 's/FileStructure,/_FileStructure,/g' "$PROJECT_ROOT/tools/mermaid-generator.ts"
  # packageNameの未使用変数を修正
  sed -i'.bak' -E 's/packageName\)/(_packageName)/g' "$PROJECT_ROOT/tools/mermaid-generator.ts"
fi

# 3. package-analyzer.tsの個別修正
if [ -f "$PROJECT_ROOT/tools/package-analyzer.ts" ]; then
  echo "tools/package-analyzer.tsを修正中..."
  # catch (e)の修正
  sed -i'.bak' -E 's/catch \(e\)/catch (_e)/g' "$PROJECT_ROOT/tools/package-analyzer.ts"
  # optionsの未使用引数を修正
  sed -i'.bak' -E 's/options\)/(_options)/g' "$PROJECT_ROOT/tools/package-analyzer.ts"
fi

# 4. verify-document-references.jsの修正
if [ -f "$PROJECT_ROOT/scripts/verify-document-references.js" ]; then
  echo "scripts/verify-document-references.jsを修正中..."
  # catch (err)の修正
  sed -i'.bak' -E 's/catch \(err\)/catch (_err)/g' "$PROJECT_ROOT/scripts/verify-document-references.js"
fi

# バックアップファイルを削除
find "$PROJECT_ROOT" -name "*.bak" -delete

echo "単純パターン修正が完了しました！"
EOF

# 実行権限を付与
chmod +x "$SIMPLE_SCRIPT"

# ESLint出力解析スクリプト（より複雑な未使用変数用）
cat > "$ESLINT_SCRIPT" << 'EOF'
#!/usr/bin/env node
/**
 * ESLintの出力を分析して未使用変数を特定し修正するスクリプト
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// プロジェクトルートディレクトリ
const PROJECT_ROOT = process.cwd();

/**
 * ESLintを実行して未使用変数のメッセージを取得
 */
function getUnusedVarsFromESLint() {
  try {
    console.log('ESLintでチェック中...');
    
    // ESLintコマンドを実行 (エラーがあっても終了しないようにtrue追加)
    const output = execSync('yarn lint || true', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    
    // ESLintの出力から未使用変数のメッセージを抽出
    const unusedVars = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // ESLintの未使用変数エラーメッセージを探す
      if (line.includes('is defined but never used') && line.includes('no-unused-vars')) {
        // ファイルパスを抽出
        const filePathMatch = line.match(/([\/\\][^:]+):/);
        if (!filePathMatch) continue;
        
        // 変数名を抽出
        const varNameMatch = line.match(/'([^']+)'/);
        if (!varNameMatch) continue;
        
        const filePath = filePathMatch[1];
        const varName = varNameMatch[1];
        
        // 行番号と列番号を抽出
        const positionMatch = line.match(/:(\d+):(\d+):/);
        if (!positionMatch) continue;
        
        const lineNum = parseInt(positionMatch[1], 10);
        const column = parseInt(positionMatch[2], 10);
        
        unusedVars.push({
          filePath: path.join(PROJECT_ROOT, filePath),
          varName,
          lineNum,
          column
        });
      }
    }
    
    return unusedVars;
  } catch (error) {
    console.error('ESLintでのチェックに失敗:', error.message);
    return [];
  }
}

/**
 * 特定のファイルの特定行で変数名の先頭にアンダースコアを追加
 */
function addUnderscoreToVar(filePath, varName, lineNum) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lineNum <= 0 || lineNum > lines.length) {
      console.error(`無効な行番号: ${lineNum} (ファイル: ${filePath})`);
      return false;
    }
    
    const targetLine = lines[lineNum - 1];
    // 正規表現で変数名を見つけて、先頭にアンダースコアをつける
    const updatedLine = targetLine.replace(
      new RegExp(`\\b${varName}\\b`, 'g'),
      `_${varName}`
    );
    
    if (updatedLine === targetLine) {
      console.log(`  - 変数 "${varName}" を特定できませんでした。: ${filePath}:${lineNum}`);
      return false;
    }
    
    lines[lineNum - 1] = updatedLine;
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`  - 変数 "${varName}" を "_${varName}" に更新しました: ${filePath}:${lineNum}`);
    return true;
  } catch (error) {
    console.error(`ファイル修正エラー (${filePath}):`, error.message);
    return false;
  }
}

/**
 * メイン処理
 */
function main() {
  console.log('ESLint出力から未使用変数を修正します...');
  
  // ESLintから未使用変数を取得
  const unusedVars = getUnusedVarsFromESLint();
  
  if (unusedVars.length === 0) {
    console.log('未使用変数は見つかりませんでした（または、ESLint出力から変数を抽出できませんでした）');
    return;
  }
  
  console.log(`${unusedVars.length}個の未使用変数が見つかりました。修正中...`);
  
  // ファイルごとに変数を修正
  const processedFiles = new Set();
  let fixedCount = 0;
  
  for (const varInfo of unusedVars) {
    const { filePath, varName, lineNum } = varInfo;
    const fixed = addUnderscoreToVar(filePath, varName, lineNum);
    
    if (fixed) {
      fixedCount++;
      processedFiles.add(filePath);
    }
  }
  
  console.log(`${fixedCount}個の未使用変数を修正しました（${processedFiles.size}ファイル中）`);
}

// スクリプト実行
main();
EOF

# 実行権限を付与
chmod +x "$ESLINT_SCRIPT"

# ユーザーにオプションを表示
echo "未使用変数修正スクリプト"
echo "========================"
echo "1) シンプルなパターン修正スクリプトを実行"
echo "2) ESLint出力解析スクリプトを実行"
echo "3) 両方実行（推奨）"
echo "q) 終了"
echo ""
read -p "オプションを選択してください (1/2/3/q): " choice

case "$choice" in
  1)
    echo "シンプルなパターン修正スクリプトを実行します..."
    "$SIMPLE_SCRIPT"
    ;;
  2)
    echo "ESLint出力解析スクリプトを実行します..."
    node "$ESLINT_SCRIPT"
    ;;
  3)
    echo "両方のスクリプトを実行します..."
    "$SIMPLE_SCRIPT"
    echo ""
    node "$ESLINT_SCRIPT"
    ;;
  q|Q)
    echo "終了します。"
    ;;
  *)
    echo "無効な選択です。終了します。"
    ;;
esac

# 一時ファイルを削除
echo ""
echo "一時ファイルを削除中..."
rm -rf "$TEMP_DIR"

echo "完了しました！"
echo "ESLintを実行して修正結果を確認してください: yarn lint"
