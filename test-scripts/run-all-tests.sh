#!/bin/bash

# すべての統合テストを実行するスクリプト
# 詳細なデバッグ情報を出力し、テスト結果を分析します

echo "==============================================="
echo "メモリーバンク 統合テスト一括実行 - $(date)"
echo "==============================================="

# 残っているテストディレクトリを削除
echo "残っているテストディレクトリを削除中..."
if [ -d "./temp-test-global" ]; then
  rm -rf ./temp-test-global
fi

if [ -d "./temp-test-branch" ]; then
  rm -rf ./temp-test-branch
fi

if [ -d "./temp-test-integration" ]; then
  rm -rf ./temp-test-integration
fi

# 以前のテスト結果ログを削除
echo "以前のテスト結果ログを削除中..."
rm -f test-results.log branch-test-results.log integration-test-results.log

# テスト実行ディレクトリを作成
mkdir -p test-results

# GlobalMemoryBankテストを実行
echo ""
echo "==============================================="
echo "1. GlobalMemoryBank テスト実行中..."
echo "==============================================="
npx jest tests/integration/GlobalMemoryBank.test.ts --verbose > test-results/global-test-results.log 2>&1
GLOBAL_TEST_RESULT=$?

# BranchMemoryBankテストを実行
echo ""
echo "==============================================="
echo "2. BranchMemoryBank テスト実行中..."
echo "==============================================="
npx jest tests/integration/BranchMemoryBank.test.ts --verbose > test-results/branch-test-results.log 2>&1
BRANCH_TEST_RESULT=$?

# WorkspaceManagerテストを実行
echo ""
echo "==============================================="
echo "3. WorkspaceManager テスト実行中..."
echo "==============================================="
npx jest tests/integration/WorkspaceManager.test.ts --verbose > test-results/workspace-test-results.log 2>&1
WS_TEST_RESULT=$?

# WorkspaceManagerAndMemoryBankテストを実行
echo ""
echo "==============================================="
echo "4. WorkspaceManagerAndMemoryBank テスト実行中..."
echo "==============================================="
npx jest tests/integration/WorkspaceManagerAndMemoryBank.test.ts --verbose > test-results/integration-test-results.log 2>&1
INTEGRATION_TEST_RESULT=$?

# 結果の集計と表示
echo ""
echo "==============================================="
echo "テスト実行結果"
echo "==============================================="

FAILED_TESTS=0

# GlobalMemoryBankテスト結果
if [ $GLOBAL_TEST_RESULT -eq 0 ]; then
  echo "✅ GlobalMemoryBank: すべてのテストが成功"
else
  echo "❌ GlobalMemoryBank: テスト失敗 ($GLOBAL_TEST_RESULT)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  echo "  詳細: test-results/global-test-results.log"
  echo "  失敗したテスト:"
  grep -A 3 -B 1 "FAIL" test-results/global-test-results.log | grep -v "PASS" || echo "  （エラー情報が見つかりません）"
fi

# BranchMemoryBankテスト結果
if [ $BRANCH_TEST_RESULT -eq 0 ]; then
  echo "✅ BranchMemoryBank: すべてのテストが成功"
else
  echo "❌ BranchMemoryBank: テスト失敗 ($BRANCH_TEST_RESULT)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  echo "  詳細: test-results/branch-test-results.log"
  echo "  失敗したテスト:"
  grep -A 3 -B 1 "FAIL" test-results/branch-test-results.log | grep -v "PASS" || echo "  （エラー情報が見つかりません）"
fi

# WorkspaceManagerテスト結果
if [ $WS_TEST_RESULT -eq 0 ]; then
  echo "✅ WorkspaceManager: すべてのテストが成功"
else
  echo "❌ WorkspaceManager: テスト失敗 ($WS_TEST_RESULT)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  echo "  詳細: test-results/workspace-test-results.log"
  echo "  失敗したテスト:"
  grep -A 3 -B 1 "FAIL" test-results/workspace-test-results.log | grep -v "PASS" || echo "  （エラー情報が見つかりません）"
fi

# WorkspaceManagerAndMemoryBankテスト結果
if [ $INTEGRATION_TEST_RESULT -eq 0 ]; then
  echo "✅ WorkspaceManagerAndMemoryBank: すべてのテストが成功"
else
  echo "❌ WorkspaceManagerAndMemoryBank: テスト失敗 ($INTEGRATION_TEST_RESULT)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  echo "  詳細: test-results/integration-test-results.log"
  echo "  失敗したテスト:"
  grep -A 3 -B 1 "FAIL" test-results/integration-test-results.log | grep -v "PASS" || echo "  （エラー情報が見つかりません）"
fi

# 最終結果の表示
echo ""
echo "==============================================="
echo "テスト総合結果"
echo "==============================================="

if [ $FAILED_TESTS -eq 0 ]; then
  echo "✅ すべてのテストスイートが成功しました！"
else
  echo "❌ $FAILED_TESTS 件のテストスイートで失敗がありました"
fi

echo ""
echo "すべてのテスト結果はtest-resultsディレクトリで確認できます"
echo "==============================================="

exit $FAILED_TESTS
