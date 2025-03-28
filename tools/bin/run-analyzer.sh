#!/bin/bash

# Schema Package Analyzer Script

# Change to the project directory
cd "/Users/t3ta/workspace/memory-bank-mcp-server"

# Run the analyzer with ts-node
ts-node tools/bin/analyze-schema-package.ts \
  --project "/Users/t3ta/workspace/memory-bank-mcp-server" \
  --output "schema-packages-diagram.md" \
  --type directory \
  --level standard \
  --direction LR

echo "Analysis completed. Output saved to schema-packages-diagram.md"
