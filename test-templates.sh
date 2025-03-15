#!/bin/bash

# Function to handle errors
handle_error() {
    echo "Error: $1"
    cd ..
    rm -rf test-repo
    exit 1
}

# Function to check JSON response
check_response() {
    local response="$1"
    local expected_text="$2"

    if [ -z "$response" ]; then
        echo "Empty response from server"
        return 1
    fi

    # Check for JSON errors
    if echo "$response" | grep -q '"error":'; then
        echo "Server returned error: $response"
        return 1
    fi

    # Check for expected text
    if [ -n "$expected_text" ]; then
        if ! echo "$response" | grep -q "\"text\":\"$expected_text\""; then
            echo "Response does not contain expected text: $expected_text"
            echo "Response: $response"
            return 1
        fi
    fi

    return 0
}

# Set up test repository
echo -e "\nSetting up test repository..."
rm -rf test-repo
mkdir test-repo
cd test-repo || handle_error "Failed to create test directory"
git init || handle_error "Failed to initialize git repository"
git config --global user.email "test@example.com"
git config --global user.name "Test User"
git commit --allow-empty -m "Initial commit" || handle_error "Failed to create initial commit"
git checkout -b feature/test || handle_error "Failed to create feature branch"

# Test initialization in English
echo -e "\nTesting English initialization..."
rm -rf docs
response=$(echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "write_branch_memory_bank",
    "arguments": {
      "path": "branchContext.md",
      "content": ""
    }
  }
}' | ../node_modules/.bin/ts-node --esm ../src/index.ts --verbose --language en)

echo -e "\nServer response (English):"
echo "$response"
check_response "$response" "Branch memory bank initialized successfully" || handle_error "Failed to initialize English memory bank"

# Wait for file system
sleep 1

# Verify English content
echo -e "\nEnglish template content:"
if [ ! -f "docs/branch-memory-bank/feature-test/branchContext.md" ]; then
    handle_error "English template file not created"
fi

cat docs/branch-memory-bank/feature-test/branchContext.md

if ! grep -q "Branch Context" "docs/branch-memory-bank/feature-test/branchContext.md"; then
    handle_error "English template does not contain expected content"
fi

# Test initialization in Japanese
echo -e "\nTesting Japanese initialization..."
rm -rf docs
response=$(echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "write_branch_memory_bank",
    "arguments": {
      "path": "branchContext.md",
      "content": ""
    }
  }
}' | ../node_modules/.bin/ts-node --esm ../src/index.ts --verbose --language ja)

echo -e "\nServer response (Japanese):"
echo "$response"
check_response "$response" "Branch memory bank initialized successfully" || handle_error "Failed to initialize Japanese memory bank"

# Wait for file system
sleep 1

# Verify Japanese content
echo -e "\nJapanese template content:"
if [ ! -f "docs/branch-memory-bank/feature-test/branchContext.md" ]; then
    handle_error "Japanese template file not created"
fi

cat docs/branch-memory-bank/feature-test/branchContext.md

if ! grep -q "ブランチコンテキスト" "docs/branch-memory-bank/feature-test/branchContext.md"; then
    handle_error "Japanese template does not contain expected content"
fi

# Additional test: Write and read a document in Japanese
echo -e "\nTesting write and read in Japanese..."
response=$(echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "write_branch_memory_bank",
    "arguments": {
      "path": "test.md",
      "content": "# テスト\n\nこれはテストファイルです。"
    }
  }
}' | ../node_modules/.bin/ts-node --esm ../src/index.ts --verbose --language ja)

check_response "$response" "Document written successfully" || handle_error "Failed to write Japanese document"

response=$(echo '{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "read_branch_memory_bank",
    "arguments": {
      "path": "test.md"
    }
  }
}' | ../node_modules/.bin/ts-node --esm ../src/index.ts --verbose --language ja)

if ! echo "$response" | grep -q "テストファイル"; then
    echo "Response: $response"
    handle_error "Could not read Japanese content correctly"
fi

# Clean up
echo -e "\nCleaning up..."
cd .. || handle_error "Failed to return to original directory"
rm -rf test-repo

echo -e "\nAll tests completed successfully! 🎉"
