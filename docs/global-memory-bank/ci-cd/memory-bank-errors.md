# Memory Bank Error Troubleshooting

tags: #troubleshooting #memory-bank #errors

## Common Errors

### `Cannot read properties of undefined (reading 'getBranchController')`

This error occurs when trying to use `read_branch_core_files` or `write_branch_core_files` functions.

#### Causes:
- Memory leak in the memory-bank-mcp-server
- Branch name format mismatch (e.g., using `feature/xyz` when the directory is `feature-xyz`)

#### Workarounds:
1. **Manual File Access:** Instead of using the helper functions, directly access files using `read_file` and `write_file`
2. **Directory Pattern:** When accessing branch memory bank files, convert slashes to dashes in the path:
   ```
   /docs/branch-memory-bank/feature-improve-ci-cd/
   ```
   instead of 
   ```
   /docs/branch-memory-bank/feature/improve-ci-cd/
   ```

3. **Restart the server:** If possible, restart the memory-bank-mcp-server to clear memory leaks

### `Cannot read properties of undefined (reading 'getGlobalController')`

Similar to the branch controller error, but affects global memory bank operations.

#### Workarounds:
1. **Manual File Access:** Access global memory bank files directly with `read_file` and `write_file`
2. **Directory Path:** Use the correct path format:
   ```
   /docs/global-memory-bank/
   ```

## Prevention

To minimize memory bank errors:

1. Periodically restart the memory-bank-mcp-server
2. Keep file access patterns consistent
3. Document error workarounds in the global memory bank
4. Consider implementing automatic recovery mechanisms in future versions
