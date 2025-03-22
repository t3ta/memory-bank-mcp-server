import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
import { IJsonDocumentRepository } from '../../../src/domain/repositories/IJsonDocumentRepository';
import { JsonDocument, DocumentType } from '../../../src/domain/entities/JsonDocument';
import { DocumentId } from '../../../src/domain/entities/DocumentId';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../src/domain/entities/Tag';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo';

/**
 * JSONÉ­åáóÈêÝ¸ÈênâÃ¯’\Y‹
 * 
 * @param customizations «¹¿Þ¤º¢p - âÃ¯n/‹D’«¹¿Þ¤ºY‹_n³üëÐÃ¯
 * @returns âÃ¯UŒ_êÝ¸Èêh]n¤ó¹¿ó¹nªÖ¸§¯È
 * 
 * @example
 * // ú,„jD¹
 * const { mockRepo, instanceRepo } = createMockJsonDocumentRepository();
 * 
 * // «¹¿Þ¤ºW_D¹
 * const { mockRepo, instanceRepo } = createMockJsonDocumentRepository(mockRepo => {
 *   when(mockRepo.findById(deepEqual(new DocumentId('123')))).thenResolve({
 *     // «¹¿àÉ­åáóÈ
 *   } as JsonDocument);
 * });
 */
export function createMockJsonDocumentRepository(
  customizations?: (mockRepo: IJsonDocumentRepository) => void
): {
  mockRepo: IJsonDocumentRepository;
  instanceRepo: IJsonDocumentRepository;
} {
  const mockRepo = mock<IJsonDocumentRepository>();

  // ÇÕ©ëÈn/‹D’-š
  when(mockRepo.findById(anything())).thenResolve(null);
  when(mockRepo.findByPath(anything(), anything())).thenResolve(null);
  when(mockRepo.findByTags(anything(), anything(), anything())).thenResolve([]);
  when(mockRepo.findByType(anything(), anything())).thenResolve([]);
  when(mockRepo.listAll(anything())).thenResolve([]);
  when(mockRepo.exists(anything(), anything())).thenResolve(true);
  when(mockRepo.save(anything(), anything())).thenCall(
    (_, document: JsonDocument) => Promise.resolve(document)
  );
  when(mockRepo.delete(anything(), anything())).thenResolve(true);

  // «¹¿Þ¤º¢pLBŒpŸL
  if (customizations) {
    customizations(mockRepo);
  }

  // Ÿ›n¤ó¹¿ó¹’ÔY
  return {
    mockRepo,
    instanceRepo: instance(mockRepo)
  };
}