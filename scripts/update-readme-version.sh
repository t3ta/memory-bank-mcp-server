#!/bin/bash

# Check if version argument is provided
if [ -z "$1" ]; then
  echo "Error: New version argument is required."
  exit 1
fi

NEW_VERSION=$1
README_PATH="packages/mcp/README.md"

# Check if README file exists
if [ ! -f "$README_PATH" ]; then
  echo "Error: README file not found at $README_PATH"
  exit 1
fi

echo "Updating README version in $README_PATH to v$NEW_VERSION..."

# Use different sed syntax based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS (BSD sed)
    sed -i '' "s/(v[0-9]\+\.[0-9]\+\.[0-9]\+)/(v$NEW_VERSION)/g" "$README_PATH"
else
    # Linux (GNU sed)
    sed -i "s/(v[0-9]\+\.[0-9]\+\.[0-9]\+)/(v$NEW_VERSION)/g" "$README_PATH"
fi

if [ $? -eq 0 ]; then
  echo "README version updated successfully."
else
  echo "Error: Failed to update README version."
  exit 1
fi

exit 0
