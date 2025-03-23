import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ContextController } from "../../../../src/interface/controllers/ContextController";
import { ReadContextUseCase } from "../../../../src/application/usecases/common/ReadContextUseCase";
import { ReadRulesUseCase } from "../../../../src/application/usecases/common/ReadRulesUseCase";
import { DomainError, DomainErrorCodes } from "../../../../src/shared/errors/DomainError";
// ts-mockito import removed;

describe("ContextController", () => {
  // Mock instances
  let readContextUseCaseMock: ReadContextUseCase;
  let readRulesUseCaseMock: ReadRulesUseCase;
  let controller: ContextController;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    reset();

    // Create mocked instances using ts-mockito
    readContextUseCaseMock = mock(ReadContextUseCase);
    readRulesUseCaseMock = mock(ReadRulesUseCase);
    
    // Create controller with mocked dependencies
    controller = new ContextController(
      readContextUseCaseMock,
      readRulesUseCaseMock
    );
  });

  describe("readRules", () => {
    it("should return rules content for valid language", async () => {
      // Arrange
      const mockRulesResult = {
        content: "# Test Rules Content",
        language: "en"
      };
      
      readRulesUseCaseMock.execute = jest.fn().mockResolvedValue(mockRulesResult);

      // Act
      const result = await controller.readRules("en");

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRulesResult);
    });

    it("should handle error when reading rules fails", async () => {
      // Arrange
      const mockError = new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        "Rules file not found"
      );
      
      when(readRulesUseCaseMock.execute("invalid-language")).thenReject(mockError);

      // Act
      const result = await controller.readRules("invalid-language");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Rules file not found");
    });
  });

  describe("readContext", () => {
    it("should return context for valid request including rules, branch and global memory", async () => {
      // Arrange
      const mockRequest = {
        branch: "feature/test",
        language: "en",
        includeRules: true,
        includeBranchMemory: true,
        includeGlobalMemory: true
      };

      const mockRulesResult = {
        content: "# Test Rules",
        language: "en"
      };

      const mockBranchMemory = {
        "branchContext.md": "# Test Branch Context",
        "activeContext.md": "# Test Active Context"
      };

      const mockGlobalMemory = {
        "architecture.md": "# Test Architecture",
        "coding-standards.md": "# Test Coding Standards"
      };

      // Setup mocks
      readRulesUseCaseMock.execute = jest.fn().mockResolvedValue(mockRulesResult);
      
      // Need to setup mock based on different params
      when(readContextUseCaseMock.execute(expect.anything())).thenResolve({
        branchMemory: mockBranchMemory,
        globalMemory: mockGlobalMemory
      });

      // Act
      const result = await controller.readContext(mockRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.rules).toEqual(mockRulesResult);
        expect(result.data.branchMemory).toEqual(mockBranchMemory);
        expect(result.data.globalMemory).toEqual(mockGlobalMemory);
      }
    });

    it("should return error when branch does not exist", async () => {
      // Arrange
      const mockRequest = {
        branch: "feature/non-existent",
        language: "en",
        includeBranchMemory: true,
        includeGlobalMemory: false
      };

      const mockError = new DomainError(
        DomainErrorCodes.BRANCH_NOT_FOUND,
        "Branch not found: feature/non-existent"
      );

      when(readContextUseCaseMock.execute(expect.anything())).thenReject(mockError);

      // Act
      const result = await controller.readContext(mockRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Branch not found");
    });

    it("should handle partially successful context retrieval", async () => {
      // Arrange
      const mockRequest = {
        branch: "feature/test",
        language: "en",
        includeRules: true,
        includeBranchMemory: true,
        includeGlobalMemory: true
      };

      const mockBranchMemory = {
        "branchContext.md": "# Test Branch Context"
      };

      // Rules fails but other components succeed
      when(readRulesUseCaseMock.execute("en")).thenReject(new Error("Rules error"));
      
      // Always return branch memory only
      when(readContextUseCaseMock.execute(expect.anything())).thenResolve({
        branchMemory: mockBranchMemory
      });

      // Act
      const result = await controller.readContext(mockRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.rules).toBeUndefined();
        expect(result.data.branchMemory).toEqual(mockBranchMemory);
        // globalMemory should be undefined since this test simulates a case where it's not available
        expect(result.data.globalMemory).toBeUndefined();
      }
    });
  });
});
