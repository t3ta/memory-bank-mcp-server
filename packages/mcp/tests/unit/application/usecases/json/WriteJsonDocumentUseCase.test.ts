import { WriteJsonDocumentUseCase } from '../../../../../src/application/usecases/json/WriteJsonDocumentUseCase';
import { IFileSystemService } from '../../../../../src/infrastructure/storage/interfaces/IFileSystemService';
// Duplicate import removed by Mirai
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId.js';
import { jest } from '@jest/globals';
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository.js';
import { WriteJsonDocumentInput, WriteJsonDocumentOutput } from '../../../../../src/application/usecases/json/WriteJsonDocumentUseCase.js';
import { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService.js';
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo.js';
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator.js';

// Mocks for IJsonDocumentRepository
const mockJsonDocumentRepository: jest.Mocked<IJsonDocumentRepository> = {
  findById: jest.fn<() => Promise<JsonDocument | null>>(),
  findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
  findByTags: jest.fn<() => Promise<JsonDocument[]>>(),
  findByType: jest.fn<() => Promise<JsonDocument[]>>(),
  save: jest.fn<() => Promise<JsonDocument>>(),
  delete: jest.fn<() => Promise<boolean>>(), // deleteById -> delete
  listAll: jest.fn<() => Promise<JsonDocument[]>>(),
  exists: jest.fn<() => Promise<boolean>>(),
};

const mockTagIndexService: jest.Mocked<IIndexService> = {
  initializeIndex: jest.fn<() => Promise<void>>(),
  buildIndex: jest.fn<() => Promise<void>>(),
  addToIndex: jest.fn<() => Promise<void>>(), // addDocument -> addToIndex
  removeFromIndex: jest.fn<() => Promise<void>>(),
  findById: jest.fn<() => Promise<any>>(), // Return type might need adjustment based on DocumentReference
  findByPath: jest.fn<() => Promise<any>>(),
  findByTags: jest.fn<() => Promise<any[]>>(),
  findByType: jest.fn<() => Promise<any[]>>(),
  listAll: jest.fn<() => Promise<any[]>>(),
  saveIndex: jest.fn<() => Promise<void>>(),
  loadIndex: jest.fn<() => Promise<void>>(),
};

describe('WriteJsonDocumentUseCase', () => {
  let useCase: WriteJsonDocumentUseCase;

  // Create a mock validator
  const mockValidator: jest.Mocked<IDocumentValidator> = {
    validateContent: jest.fn<(documentType: string, content: Record<string, unknown>) => boolean>().mockReturnValue(true),
    validateDocument: jest.fn<(document: unknown) => boolean>().mockReturnValue(true),
    validateMetadata: jest.fn<(metadata: Record<string, unknown>) => boolean>().mockReturnValue(true),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Set the validator before creating the use case or documents
    JsonDocument.setValidator(mockValidator);
    jest.clearAllMocks();
    useCase = new WriteJsonDocumentUseCase(
      mockJsonDocumentRepository,
      mockTagIndexService // Pass the index service mock
    );
  });

  it('should write a new document to a branch successfully', async () => {
    const branchName = 'feature/test-branch';
    const docPathStr = 'new/document.json';
    const docTitle = 'Test Document';
    const docType: DocumentType = 'generic';
    const docTags = ['new', 'test'];
    const docContent = { key: 'value' };

    const input: WriteJsonDocumentInput = {
      branchName: branchName,
      document: {
        path: docPathStr,
        title: docTitle,
        documentType: docType,
        tags: docTags,
        content: docContent,
        // id is optional, let the use case generate it
      },
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedDocPath = DocumentPath.create(docPathStr);
    const expectedTags = docTags.map(t => Tag.create(t));

    // Mock findByPath to return null (indicating new document)
    mockJsonDocumentRepository.findByPath.mockResolvedValue(null);

    // Mock repository save to return the saved document
    // We need to construct the expected JsonDocument that save should return
    const savedDocument = JsonDocument.create({
      id: DocumentId.generate(), // Use generate for new ID
      path: expectedDocPath,
      title: docTitle,
      documentType: docType,
      tags: expectedTags,
      content: docContent,
      // versionInfo will be default for new doc
    });
    mockJsonDocumentRepository.save.mockResolvedValue(savedDocument);

    // Mock index service addToIndex
    mockTagIndexService.addToIndex.mockResolvedValue(undefined);
    const result = await useCase.execute(input);

    // Verify findByPath was called
    expect(mockJsonDocumentRepository.findByPath).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedDocPath
    );

    // Verify repository save was called correctly
    expect(mockJsonDocumentRepository.save).toHaveBeenCalledWith(
      expectedBranchInfo,
      expect.objectContaining({ // Check the structure of the saved document
        _path: expectedDocPath,
        _title: docTitle,
        _documentType: docType,
        _content: docContent,
        // We can't easily check the generated ID, but we check other fields
      })
    );
    // Verify the tags match (comparing Tag objects might be tricky, compare values)
    const savedDocArg = mockJsonDocumentRepository.save.mock.calls[0][1];
    expect(savedDocArg.tags.map(t => t.value)).toEqual(docTags);


    // Verify index service was called
    expect(mockTagIndexService.addToIndex).toHaveBeenCalledWith(
      expectedBranchInfo,
      savedDocument // Use the document returned by the mocked save
    );

    // Verify the output
    expect(result.isNew).toBe(true);
    expect(result.location).toBe(branchName);
    expect(result.document.id).toBe(savedDocument.id.value);
    expect(result.document.path).toBe(docPathStr);
    expect(result.document.title).toBe(docTitle);
    expect(result.document.tags).toEqual(docTags);
    expect(result.document.content).toEqual(docContent);
  });

  it('should update an existing document successfully', async () => {
    const branchName = 'feature/test-branch';
    const docPathStr = 'existing/document.json';
    const docTitle = 'Updated Title';
    const docType: DocumentType = 'progress';
    const docTags = ['updated'];
    const docContent = { status: 'done' };
    const existingDocId = DocumentId.generate();
    const existingVersion = 1;
    const existingDate = new Date(Date.now() - 10000); // Some time ago

    const input: WriteJsonDocumentInput = {
      branchName: branchName,
      document: {
        id: existingDocId.value, // Provide existing ID for update
        path: docPathStr,
        title: docTitle,
        documentType: docType,
        tags: docTags,
        content: docContent,
      },
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedDocPath = DocumentPath.create(docPathStr);
    const expectedTags = docTags.map(t => Tag.create(t));

    // Mock findByPath to return the existing document
    // Ensure versionInfo and its lastModified are correctly set
    const existingVersionInfo = new DocumentVersionInfo({
       version: existingVersion,
       lastModified: existingDate, // Make sure existingDate is a valid Date object
       modifiedBy: 'user'
    });
    const existingDocument = JsonDocument.create({
      id: existingDocId,
      path: expectedDocPath,
      title: 'Old Title',
      documentType: 'progress',
      tags: [Tag.create('old')],
      content: { status: 'wip' },
      versionInfo: existingVersionInfo // Pass the created versionInfo object
    });
    mockJsonDocumentRepository.findByPath.mockResolvedValue(existingDocument);

    // Mock repository save to return the updated document
    const updatedDocument = JsonDocument.create({
      id: existingDocId, // ID should remain the same
      path: expectedDocPath,
      title: docTitle,
      documentType: docType,
      tags: expectedTags,
      content: docContent,
      // When mocking the return of 'save', ensure it includes a valid versionInfo
      // The actual use case calculates the next version, so we mimic that structure.
      versionInfo: existingVersionInfo.nextVersion() // Simulate version increment
    });
    mockJsonDocumentRepository.save.mockResolvedValue(updatedDocument);

    // Mock index service addToIndex (it handles updates too)
    mockTagIndexService.addToIndex.mockResolvedValue(undefined);

    const result = await useCase.execute(input);

    // Verify findByPath was called
    expect(mockJsonDocumentRepository.findByPath).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedDocPath
    );

    // Verify repository save was called with updated data and incremented version
    expect(mockJsonDocumentRepository.save).toHaveBeenCalledWith(
      expectedBranchInfo,
      expect.objectContaining({
        _id: existingDocId,
        _path: expectedDocPath,
        _title: docTitle,
        _documentType: docType,
        _content: docContent,
        _versionInfo: expect.objectContaining({ version: existingVersion + 1 }) // Check version increment
      })
    );
     // Verify the tags match
    const savedDocArgUpdate = mockJsonDocumentRepository.save.mock.calls[0][1];
    expect(savedDocArgUpdate.tags.map(t => t.value)).toEqual(docTags);


    // Verify index service was called with the updated document
    expect(mockTagIndexService.addToIndex).toHaveBeenCalledWith(
      expectedBranchInfo,
      updatedDocument // Use the document returned by the mocked save
    );

    // Verify the output
    expect(result.isNew).toBe(false); // Should indicate an update
    expect(result.location).toBe(branchName);
    expect(result.document.id).toBe(existingDocId.value);
    expect(result.document.path).toBe(docPathStr);
    expect(result.document.title).toBe(docTitle);
    expect(result.document.tags).toEqual(docTags);
    expect(result.document.content).toEqual(docContent);
    expect(result.document.version).toBe(existingVersion + 1); // Check version in output
  });

  it('should write a global document successfully when branchName is omitted', async () => {
    // Similar structure to the first test, but omit branchName in input
    // and verify the correct repository (globalRepository if provided, else jsonRepository) is used.
    const docPathStr = 'core/config.json';
    const docTitle = 'Global Config';
    const docType: DocumentType = 'generic'; // Assuming core files are generic or have specific types
    const docTags = ['global', 'config'];
    const docContent = { setting: true };

     const input: WriteJsonDocumentInput = {
      // No branchName indicates global write
      document: {
        path: docPathStr,
        title: docTitle,
        documentType: docType,
        tags: docTags,
        content: docContent,
      },
    };

    // Create a distinct mock for the global repository
    const mockGlobalRepository: jest.Mocked<IJsonDocumentRepository> = {
      findById: jest.fn<() => Promise<JsonDocument | null>>(),
      findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
      findByTags: jest.fn<() => Promise<JsonDocument[]>>(),
      findByType: jest.fn<() => Promise<JsonDocument[]>>(),
      save: jest.fn<() => Promise<JsonDocument>>(),
      delete: jest.fn<() => Promise<boolean>>(),
      listAll: jest.fn<() => Promise<JsonDocument[]>>(),
      exists: jest.fn<() => Promise<boolean>>(),
    };
    const useCaseWithGlobal = new WriteJsonDocumentUseCase(
      mockJsonDocumentRepository, // Default repo
      mockTagIndexService,
      mockGlobalRepository // Global repo provided
    );

    const expectedDocPath = DocumentPath.create(docPathStr);
    const expectedTags = docTags.map(t => Tag.create(t));
    // Global operations still use a BranchInfo internally for now
    const expectedBranchInfo = BranchInfo.create('feature/global');

    // Mock findByPath on the global repo
    mockGlobalRepository.findByPath.mockResolvedValue(null);

    const savedDocument = JsonDocument.create({
      id: DocumentId.generate(),
      path: expectedDocPath,
      title: docTitle,
      documentType: docType,
      tags: expectedTags,
      content: docContent,
    });
    mockGlobalRepository.save.mockResolvedValue(savedDocument);
    mockTagIndexService.addToIndex.mockResolvedValue(undefined);

    const result = await useCaseWithGlobal.execute(input);

    // Verify findByPath was called on the GLOBAL repository
    expect(mockGlobalRepository.findByPath).toHaveBeenCalledWith(
      expectedBranchInfo, // Still uses BranchInfo internally
      expectedDocPath
    );
    expect(mockJsonDocumentRepository.findByPath).not.toHaveBeenCalled(); // Default repo should NOT be called

    // Verify save was called on the GLOBAL repository
    expect(mockGlobalRepository.save).toHaveBeenCalledWith(
      expectedBranchInfo,
      expect.objectContaining({ _path: expectedDocPath })
    );
    expect(mockJsonDocumentRepository.save).not.toHaveBeenCalled();

    // Verify index service was called
     expect(mockTagIndexService.addToIndex).toHaveBeenCalledWith(
      expectedBranchInfo,
      savedDocument
    );

    // Verify output
    expect(result.isNew).toBe(true);
    expect(result.location).toBe('global'); // Location should be 'global'
    expect(result.document.path).toBe(docPathStr);
  });

  // TODO: Add test cases for:
  // - Handling repository save errors (mock save to reject)
  // - Handling index service errors (mock addToIndex to reject)
  // - Input validation errors (missing path, title, content, etc.)
  // - Global write when globalRepository is NOT provided (should use default repo)

  // TODO: Add test cases for:
  // - Global document write (isGlobal: true in BranchInfo)
  // - Handling repository save errors
  // - Validating input document structure (if applicable)

  // Add more test cases here:
  // - Overwriting an existing document
  // - Writing with no tags
  // - Handling file system errors during ensureDir or writeFile
  // - Handling tag index update errors
  // - Testing with different content types (object, plain text) - though use case might enforce JSON string
  // - Testing with invalid paths or content (if validation is part of the use case)
});
