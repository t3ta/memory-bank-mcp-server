#!/bin/bash

# Build the project
echo "Building the project..."
npm run build

# Test English mode
echo -e "\nTesting English mode..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run start

# Test Japanese mode
echo -e "\nTesting Japanese mode..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | MEMORY_BANK_LANGUAGE=ja npm run start

# Test with language parameter
echo -e "\nTesting with language parameter..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run start -- --language ja

# Test creating a document in Japanese mode
echo -e "\nTesting document creation in Japanese..."
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "write_branch_memory_bank",
    "arguments": {
      "path": "test.md",
      "content": "# テストドキュメント\n\nこれはテストです。"
    }
  }
}' | MEMORY_BANK_LANGUAGE=ja npm run start

# Test reading the document
echo -e "\nTesting document reading..."
echo '{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "read_branch_memory_bank",
    "arguments": {
      "path": "test.md"
    }
  }
}' | MEMORY_BANK_LANGUAGE=ja npm run start
