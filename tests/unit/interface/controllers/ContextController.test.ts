import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ContextController } from "../../../../src/interface/controllers/ContextController";
import { ReadContextUseCase } from "../../../../src/application/usecases/common/ReadContextUseCase";
import { ReadRulesUseCase } from "../../../../src/application/usecases/common/ReadRulesUseCase";
import { DomainError, DomainErrorCodes } from "../../../../src/shared/errors/DomainError";
import { mock, instance, when, anything, reset } from 'ts-mockito';

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
      instance(readContextUseCaseMock),
      instance(readRulesUseCaseMock)
    );
  });

  describe("readRules", () => {
    it("should return rules content for valid language", async () => {
      // Arrange
      const mockRulesResult = {
        content: "# Test Rules Content",
        language: "en"
      };
      
      when(readRulesUseCaseMock.execute("en")).thenResolve(mockRulesResult);

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
      when(readRulesUseCaseMock.execute("en")).thenResolve(mockRulesResult);
      
      // Need to setup mock based on different params
      when(readContextUseCaseMock.execute(anything())).thenCall((request) => {
        if (request.includeBranchMemory && !request.includeGlobalMemory && !request.includeRules) {
          return Promise.resolve({ branchMemory: mockBranchMemory });
        }
        if (!request.includeBranchMemory && request.includeGlobalMemory && !request.includeRules) {
          return Promise.resolve({ globalMemory: mockGlobalMemory });
        }
        return Promise.resolve({});
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

      when(readContextUseCaseMock.execute(anything())).thenReject(mockError);

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
      
      // Only branch memory succeeds, global memory fails
      when(readContextUseCaseMock.execute(anything())).thenCall((request) => {
        if (request.includeBranchMemory && !request.includeGlobalMemory && !request.includeRules) {
          return Promise.resolve({ branchMemory: mockBranchMemory });
        }
        if (!request.includeBranchMemory && request.includeGlobalMemory && !request.includeRules) {
          return Promise.reject(new Error("Global memory error"));
        }
        return Promise.resolve({});
      });

      // Act
      const result = await controller.readContext(mockRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.rules).toBeUndefined();
        expect(result.data.branchMemory).toEqual(mockBranchMemory);
        expect(result.data.globalMemory).toBeUndefined();
      }
    });
  });
});
