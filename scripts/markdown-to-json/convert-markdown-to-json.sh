#!/bin/bash

# Script to convert a Markdown file to JSON using shitauke
# Usage: ./convert-markdown-to-json.sh <input-markdown-path> <output-json-path> [--preserve-metadata <source-json>] [--enhance-existing <source-json>]

# Check if needed arguments are provided
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <input-markdown-path> <output-json-path> [--preserve-metadata <source-json>] [--enhance-existing <source-json>]"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"
MERGE_MODE=""
SOURCE_JSON=""

# Parse additional arguments
shift 2
while [ "$#" -gt 0 ]; do
    case "$1" in
        --preserve-metadata)
            MERGE_MODE="preserve-metadata"
            SOURCE_JSON="$2"
            shift 2
            ;;
        --enhance-existing)
            MERGE_MODE="enhance-existing"
            SOURCE_JSON="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file $INPUT_FILE does not exist"
    exit 1
fi

# If merging, check if source JSON exists
if [ -n "$MERGE_MODE" ] && [ ! -f "$SOURCE_JSON" ]; then
    echo "Error: Source JSON file $SOURCE_JSON does not exist"
    exit 1
fi

# Extract title from markdown file
TITLE=$(grep -m 1 "^# " "$INPUT_FILE" | sed 's/^# //')
if [ -z "$TITLE" ]; then
    TITLE="Untitled Document"
fi

# Get just the filename part
RELATIVE_PATH=$(basename "$INPUT_FILE")

# Generate a temporary UUID using uuidgen if available, otherwise use date+random
if command -v uuidgen > /dev/null; then
    UUID=$(uuidgen)
else
    UUID=$(date +%s%N | md5sum | head -c 32)
    UUID="${UUID:0:8}-${UUID:8:4}-${UUID:12:4}-${UUID:16:4}-${UUID:20:12}"
fi

# Generate current datetime in ISO format
DATETIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

# Create temporary file for Gemini's output
TEMP_FILE="/tmp/temp-$(date +%s).json"

# If we're in merge mode, extract metadata from source JSON
if [ -n "$MERGE_MODE" ]; then
    if command -v jq > /dev/null; then
        if [ "$MERGE_MODE" = "preserve-metadata" ]; then
            # Extract metadata from source JSON to preserve
            UUID=$(jq -r '.metadata.id' "$SOURCE_JSON")
            CREATED_AT=$(jq -r '.metadata.createdAt' "$SOURCE_JSON")
            
            # But use current timestamp for lastModified
            echo "Preserving original metadata (id, createdAt) but updating lastModified"
        elif [ "$MERGE_MODE" = "enhance-existing" ]; then
            # Extract all metadata from source JSON
            UUID=$(jq -r '.metadata.id' "$SOURCE_JSON")
            CREATED_AT=$(jq -r '.metadata.createdAt' "$SOURCE_JSON")
            DATETIME=$(jq -r '.metadata.lastModified' "$SOURCE_JSON")
            
            echo "Using all metadata from existing JSON file"
        fi
    else
        echo "Warning: jq is not available, metadata preservation may not work correctly"
    fi
fi

# Run shitauke command to convert markdown to JSON
PROMPT="Convert this markdown file to a JSON document. 
The output should be in the following format EXACTLY: 
{ 
  'schema': 'memory_document_v2', 
  'metadata': { 
    'id': 'auto-uuid', 
    'title': '$TITLE', 
    'documentType': 'generic', 
    'path': '$RELATIVE_PATH', 
    'tags': [], 
    'lastModified': 'auto-date', 
    'createdAt': 'auto-date', 
    'version': 1 
  }, 
  'content': { 
    // Each section heading in the markdown should be a property key here, 
    // and the section content should be the value. 
    // Do not include the heading itself in the content.
  } 
}"

echo "Converting $INPUT_FILE to JSON format..."
shitauke send -m gemini-2.0-flash -p gemini -f json -i "$INPUT_FILE" -o "$TEMP_FILE" "$PROMPT"

# Check if conversion succeeded
if [ ! -f "$TEMP_FILE" ]; then
    echo "Error: Failed to convert markdown to JSON"
    exit 1
fi

# If we're in enhance mode, we need to merge the content
if [ "$MERGE_MODE" = "enhance-existing" ] && command -v jq > /dev/null; then
    MERGE_TEMP="/tmp/merged-$(date +%s).json"
    
    # Combine content from both files, with source JSON taking precedence
    jq -s '.[0].content * .[1].content | {schema: "memory_document_v2", metadata: .[0].metadata, content: .}' "$SOURCE_JSON" "$TEMP_FILE" > "$MERGE_TEMP"
    
    # Use merged content
    mv "$MERGE_TEMP" "$TEMP_FILE"
    echo "Enhanced existing JSON with markdown content"
fi

# Update the JSON with proper UUID and datetimes using jq if available
if command -v jq > /dev/null; then
    if [ "$MERGE_MODE" = "preserve-metadata" ]; then
        # Use preserved UUID and createdAt, but current lastModified
        jq --arg uuid "$UUID" --arg datetime "$DATETIME" --arg created "$CREATED_AT" \
           '.metadata.id = $uuid | .metadata.lastModified = $datetime | .metadata.createdAt = $created' \
           "$TEMP_FILE" > "$OUTPUT_FILE"
    else
        # Use provided UUID, lastModified and createdAt
        jq --arg uuid "$UUID" --arg datetime "$DATETIME" --arg created "${CREATED_AT:-$DATETIME}" \
           '.metadata.id = $uuid | .metadata.lastModified = $datetime | .metadata.createdAt = $created' \
           "$TEMP_FILE" > "$OUTPUT_FILE"
    fi
else
    # Simple string replacement as fallback
    sed "s/\"auto-uuid\"/\"$UUID\"/g; s/\"auto-date\"/\"$DATETIME\"/g" "$TEMP_FILE" > "$OUTPUT_FILE"
fi

echo "Conversion successful: $OUTPUT_FILE"

# Clean up temp file
rm -f "$TEMP_FILE"

exit 0
