#!/bin/bash

# Script to convert all Markdown files in the docs directory to JSON
# Usage: ./convert-all-docs.sh [--delete-originals] [--force-merge]

# Set variables
DOCS_DIR="/Users/t3ta/workspace/memory-bank-mcp-server/docs"
SCRIPT_DIR="$(dirname "$0")"
CONVERTER="${SCRIPT_DIR}/convert-markdown-to-json.sh"

# Check if converter script exists
if [ ! -f "$CONVERTER" ]; then
    echo "Error: Converter script not found at $CONVERTER"
    exit 1
fi

# Make sure the converter is executable
chmod +x "$CONVERTER"

# Set default flags
DELETE_ORIGINALS=0
FORCE_MERGE=0

# Parse arguments
for arg in "$@"; do
    case $arg in
        --delete-originals)
            DELETE_ORIGINALS=1
            ;;
        --force-merge)
            FORCE_MERGE=1
            ;;
    esac
done

# Warning for delete originals
if [ "$DELETE_ORIGINALS" -eq 1 ]; then
    echo "WARNING: Original markdown files will be deleted after successful conversion"
    read -p "Are you sure you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

# Warning for force merge
if [ "$FORCE_MERGE" -eq 1 ]; then
    echo "WARNING: Existing JSON files will be merged with markdown content"
    read -p "Are you sure you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

# Find all markdown files
echo "Finding markdown files in $DOCS_DIR..."
MD_FILES=$(find "$DOCS_DIR" -name "*.md")

# Initialize counters
TOTAL_COUNT=0
SKIPPED_COUNT=0
CONVERTED_COUNT=0
MERGED_COUNT=0
FAILED_COUNT=0
DELETED_COUNT=0

# Process each markdown file
for md_file in $MD_FILES; do
    TOTAL_COUNT=$((TOTAL_COUNT+1))
    
    # Determine output JSON file path
    json_file="${md_file%.md}.json"
    
    # Check if JSON file already exists
    if [ -f "$json_file" ] && [ "$FORCE_MERGE" -eq 0 ]; then
        echo "JSON equivalent already exists for $md_file"
        
        # If delete flag is set, remove the original markdown file
        if [ "$DELETE_ORIGINALS" -eq 1 ]; then
            echo "Deleting original markdown file: $md_file"
            rm "$md_file"
            DELETED_COUNT=$((DELETED_COUNT+1))
        else
            echo "Skipping conversion (use --delete-originals to remove the original, or --force-merge to merge content)"
        fi
        
        SKIPPED_COUNT=$((SKIPPED_COUNT+1))
        continue
    fi
    
    # If JSON exists and we're merging
    if [ -f "$json_file" ] && [ "$FORCE_MERGE" -eq 1 ]; then
        echo "Merging content from $md_file into existing $json_file"
        
        # Create a temporary file for the merged content
        temp_json="/tmp/temp_merged_$(basename "$json_file")"
        
        # Get file modification timestamps
        md_timestamp=$(stat -f "%m" "$md_file")
        json_timestamp=$(stat -f "%m" "$json_file")
        
        # Check which file is newer
        if [ "$md_timestamp" -gt "$json_timestamp" ]; then
            echo "Markdown file is newer than JSON, using markdown as source"
            "$CONVERTER" "$md_file" "$temp_json" --preserve-metadata "$json_file"
        else
            echo "JSON file is newer than markdown, using JSON as base and enhancing with markdown"
            "$CONVERTER" "$md_file" "$temp_json" --enhance-existing "$json_file"
        fi
        
        # Check if temp file was created successfully
        if [ -f "$temp_json" ]; then
            # Backup the original JSON file
            cp "$json_file" "${json_file}.bak"
            
            # Replace with the merged file
            mv "$temp_json" "$json_file"
            echo "Successfully merged content into: $json_file (backup at ${json_file}.bak)"
            MERGED_COUNT=$((MERGED_COUNT+1))
            
            # Delete original markdown if requested
            if [ "$DELETE_ORIGINALS" -eq 1 ]; then
                rm "$md_file"
                echo "Deleted original: $md_file"
                DELETED_COUNT=$((DELETED_COUNT+1))
            fi
        else
            echo "Failed to merge content from $md_file into $json_file"
            FAILED_COUNT=$((FAILED_COUNT+1))
        fi
        
        continue
    fi
    
    # Convert the file (if we got here, either JSON doesn't exist or we're forcing)
    echo "Converting: $md_file"
    if "$CONVERTER" "$md_file" "$json_file"; then
        echo "Successfully converted: $md_file -> $json_file"
        CONVERTED_COUNT=$((CONVERTED_COUNT+1))
        
        # Delete original if requested and conversion was successful
        if [ "$DELETE_ORIGINALS" -eq 1 ]; then
            rm "$md_file"
            echo "Deleted original: $md_file"
            DELETED_COUNT=$((DELETED_COUNT+1))
        fi
    else
        echo "Failed to convert: $md_file"
        FAILED_COUNT=$((FAILED_COUNT+1))
    fi
done

# Print summary
echo
echo "Conversion Summary:"
echo "------------------"
echo "Total markdown files found: $TOTAL_COUNT"
echo "Files skipped (JSON already exists): $SKIPPED_COUNT"
echo "Files successfully converted: $CONVERTED_COUNT"
echo "Files merged with existing JSON: $MERGED_COUNT"
echo "Files failed to convert/merge: $FAILED_COUNT"
if [ "$DELETE_ORIGINALS" -eq 1 ]; then
    echo "Original files deleted: $DELETED_COUNT"
fi

# Final status
if [ "$FAILED_COUNT" -gt 0 ]; then
    echo
    echo "WARNING: Some files failed to convert. Check the logs above for details."
    exit 1
fi

echo
echo "Conversion process completed successfully!"
