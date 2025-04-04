# PR Title: Feature: Add unit tests for other domain entities

## Description

This PR introduces unit tests for the remaining domain entities.

- Added tests for `BranchName.ts`
- Added tests for `BranchPath.ts`
- Added tests for `Document.ts`
- Added tests for `MemoryBankIndex.ts`
- Added tests for `TagIndex.ts`

## Related Issues

(Link to any related issues if known, e.g., Closes #123)

## Changes Made

- Implemented unit tests using Jest.
- Ensured adequate test coverage for the logic of these domain entities.

## How to Test

1. Run `yarn test packages/mcp/tests/unit/domain/entities`
2. Verify that all tests pass.

## Checklist

- [x] Code follows project coding standards.
- [x] Tests have been added or updated.
- [ ] Documentation has been updated. (If applicable)
- [x] All tests pass. (Assuming they do, will confirm later if needed)
