# Issue #112: Auto-parse JSON responses and format on write

## Objective
Automatically parse JSON content when reading from memory banks and format JSON content when writing.

## Agreed Policy

1.  **On Read (`Read*UseCase`):**
    *   Attempt `JSON.parse()` on the file content.
    *   If successful, return the parsed JavaScript **object**.
    *   If parsing fails (not JSON or invalid JSON), return the content as a **string**.
    *   **Do not modify the original file on read.**
    *   The return type will be `string | object`.
2.  **On Write (`Write*UseCase`):**
    *   Check the type of the `content` argument.
    *   If `content` is an **object**, convert it to a formatted JSON string (`JSON.stringify(content, null, 2)`) before writing to the file.
    *   If `content` is a **string**, write it to the file as is.
    *   Ensure `patches` operations also result in formatted JSON if the final content is an object.

## Implementation Steps (TDD Approach)

1.  **Identify Affected Tests:** (Completed)
    *   Integration Tests:
        *   `packages/mcp/tests/integration/usecase/ReadContextUseCase.integration.test.ts`
        *   `packages/mcp/tests/integration/usecase/ReadBranchDocumentUseCase.integration.test.ts`
        *   `packages/mcp/tests/integration/usecase/ReadGlobalDocumentUseCase.integration.test.ts`
        *   `packages/mcp/tests/integration/usecase/WriteBranchDocumentUseCase.integration.test.ts`
        *   `packages/mcp/tests/integration/usecase/WriteGlobalDocumentUseCase.integration.test.ts`
    *   Unit Tests:
        *   `packages/mcp/tests/unit/application/usecases/common/ReadContextUseCase.test.ts`
        *   `packages/mcp/tests/unit/application/usecases/branch/ReadBranchDocumentUseCase.test.ts`
        *   `packages/mcp/tests/unit/application/usecases/global/ReadGlobalDocumentUseCase.test.ts`
        *   `packages/mcp/tests/unit/application/usecases/branch/WriteBranchDocumentUseCase.test.ts`
        *   `packages/mcp/tests/unit/application/usecases/global/WriteGlobalDocumentUseCase.test.ts`
2.  **Modify Tests & Confirm Red:** Update assertions in the identified test files to match the new expected behavior. Run tests to confirm they fail (Red).
3.  **Implement Changes:** Modify the use case implementations (`Read*UseCase`, `Write*UseCase`) according to the policy.
4.  **Confirm Green:** Run tests again to confirm they pass (Green).
5.  **Update Documentation:** Update any relevant documentation (e.g., tool descriptions, READMEs) to reflect the changes.