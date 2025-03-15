#!/bin/bash

# Function to handle errors
handle_error() {
    echo "Error: $1"
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
        if ! echo "$response" | grep -q "$expected_text"; then
            echo "Response does not contain expected text: $expected_text"
            echo "Response: $response"
            return 1
        fi
    fi

    return 0
}

# Test reading English rules
echo -e "\nTesting reading English rules..."
response=$(echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_rules",
    "arguments": {
      "language": "en"
    }
  }
}' | ./node_modules/.bin/ts-node --esm src/index.ts --verbose)

echo -e "\nServer response (English):"
echo "$response"
check_response "$response" "Memory Bank" || handle_error "Failed to read English rules"

# Test reading Japanese rules
echo -e "\nTesting reading Japanese rules..."
response=$(echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "read_rules",
    "arguments": {
      "language": "ja"
    }
  }
}' | ./node_modules/.bin/ts-node --esm src/index.ts --verbose)

echo -e "\nServer response (Japanese):"
echo "$response"
check_response "$response" "メモリーバンク" || handle_error "Failed to read Japanese rules"

echo -e "\nAll tests completed successfully! 🎉"
