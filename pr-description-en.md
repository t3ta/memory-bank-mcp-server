# Fix Invalid Tag Format and Improve Application Robustness

## Problem

The application would fail to start when encountering invalid tag formats in JSON documents. Specifically, tags containing dots like `v2.0` violate the validation rule that tags may only contain lowercase letters, numbers, and hyphens.

This caused the entire server to fail to start if even a single JSON file had invalid tags, resulting in errors like:

```
DomainError: Tag must contain only lowercase letters, numbers, and hyphens
```

## Solution

1. **Fixed Invalid Tag**: Changed the problematic tag `v2.0` to `v2-0` in `project-overview.json`
2. **Improved Error Handling**:
   - Made tag index update errors non-fatal during initialization
   - Added recovery mechanism when invalid tags are detected during JSON document loading
3. **Automatic Tag Correction**: Enhanced `MemoryDocument.fromJSON` method to automatically sanitize invalid tags

These changes make the application more robust when dealing with documents containing invalid tag formats, allowing the system to sanitize problematic tags without impacting overall system operation.

## Tested

- Verified that the application starts successfully even with documents containing invalid tags
- Confirmed that tags are automatically sanitized (e.g., `v2.0` → `v2-0`)
