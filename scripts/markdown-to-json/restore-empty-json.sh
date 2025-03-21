#!/bin/bash

# Script to restore empty JSON files from their backups
# Usage: ./restore-empty-json.sh

# Set variables
DOCS_DIR="/Users/t3ta/workspace/memory-bank-mcp-server/docs"

# Find all JSON files
echo "Finding JSON files in $DOCS_DIR..."
JSON_FILES=$(find "$DOCS_DIR" -name "*.json" ! -name "*.bak")

# Initialize counters
TOTAL_COUNT=0
EMPTY_COUNT=0
RESTORED_COUNT=0
FAILED_COUNT=0

# Process each JSON file
for json_file in $JSON_FILES; do
    TOTAL_COUNT=$((TOTAL_COUNT+1))
    
    # Check if the file is empty
    if [ ! -s "$json_file" ]; then
        echo "Found empty file: $json_file"
        EMPTY_COUNT=$((EMPTY_COUNT+1))
        
        # Check if a backup exists
        backup_file="${json_file}.bak"
        if [ -f "$backup_file" ]; then
            echo "Restoring from backup: $backup_file"
            cp "$backup_file" "$json_file"
            
            # Verify the restoration
            if [ -s "$json_file" ]; then
                echo "Successfully restored: $json_file"
                RESTORED_COUNT=$((RESTORED_COUNT+1))
            else
                echo "Failed to restore: $json_file"
                FAILED_COUNT=$((FAILED_COUNT+1))
            fi
        else
            echo "No backup found for: $json_file"
            FAILED_COUNT=$((FAILED_COUNT+1))
        fi
    fi
done

# Print summary
echo
echo "Restoration Summary:"
echo "------------------"
echo "Total JSON files found: $TOTAL_COUNT"
echo "Empty files detected: $EMPTY_COUNT"
echo "Files successfully restored: $RESTORED_COUNT"
echo "Files failed to restore: $FAILED_COUNT"

# Final status
if [ "$FAILED_COUNT" -gt 0 ]; then
    echo
    echo "WARNING: Some files could not be restored. Check the logs above for details."
    exit 1
fi

echo
echo "Restoration process completed successfully!"
