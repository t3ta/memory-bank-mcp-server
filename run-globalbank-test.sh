#!/bin/bash

# GlobalMemoryBank統合テストを実行するスクリプト
# 詳細なデバッグ情報を出力し、テスト結果を分析します

echo "==============================================="
echo "GlobalMemoryBank 統合テスト実行 - $(date)"
echo "==============================================="

# テストディレクトリが残っていれば削除
if [ -d "./temp-test-global" ]; then
  echo "残っているテストディレクトリを削除します..."
  rm -rf ./temp-test-global
fi

# テストを実行し、詳細出力を保存
echo "テストを実行中..."
npx jest tests/integration/GlobalMemoryBank.test.ts --verbose > test-results.log 2>&1
TEST_EXIT_CODE=$?

# 結果の概要を表示
echo ""
echo "テスト実行結果: $TEST_EXIT_CODE"
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ すべてのテストが成功しました！"
else
  echo "❌ テストに失敗があります。詳細はログを確認してください。"
  
  # エラーがある場合はログからエラー部分を抽出
  echo ""
  echo "==============================================="
  echo "エラー詳細:"
  echo "==============================================="
  grep -A 5 "Error:" test-results.log
  
  # 失敗したテストを抽出
  echo ""
  echo "==============================================="
  echo "失敗したテスト:"
  echo "==============================================="
  grep -A 3 -B 1 "FAIL" test-results.log
fi

echo ""
echo "詳細なログはtest-results.logファイルで確認できます"
echo "==============================================="
