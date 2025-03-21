#!/bin/bash

# Script to analyze and organize the global memory bank
# Usage: ./analyze-and-organize.sh [--dry-run]

# Set variables
SCRIPT_DIR="$(dirname "$0")"
NODE_SCRIPT="${SCRIPT_DIR}/analyze-global-memory-bank.js"
OUTPUT_DIR="/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/analysis"

# Check if analyzer script exists
if [ ! -f "$NODE_SCRIPT" ]; then
    echo "Error: Analyzer script not found at $NODE_SCRIPT"
    exit 1
fi

# Make sure the script is executable
chmod +x "$NODE_SCRIPT"

# Parse arguments
DRY_RUN=0
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=1
            ;;
    esac
done

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Run the analysis script
echo "Starting Global Memory Bank analysis and organization..."

if [ "$DRY_RUN" -eq 1 ]; then
    echo "Running in DRY RUN mode (no files will be written)"
    node "$NODE_SCRIPT" --dry-run
else
    echo "Running analysis and organization..."
    node "$NODE_SCRIPT" --output-dir "$OUTPUT_DIR"
fi

# Check if the script ran successfully
if [ $? -eq 0 ]; then
    echo
    echo "==========================================="
    echo "✨ Analysis and organization completed successfully! ✨"
    echo "==========================================="
    echo
    echo "Raw analysis data: ${OUTPUT_DIR}/global-memory-bank-analysis-raw.json"
    echo "Organized analysis: ${OUTPUT_DIR}/global-memory-bank-organized-analysis.json"
    echo
    echo "You can now use these files to better understand and reorganize your global memory bank."
    echo "The 'global-memory-bank-organized-analysis.json' file contains suggestions for tag categories,"
    echo "tag consolidation, and navigation improvements."
    echo
    echo "To update the Global Memory Bank based on these suggestions, consider using the update-memory-bank.js script."
else
    echo "Analysis failed. See error messages above."
    exit 1
fi
