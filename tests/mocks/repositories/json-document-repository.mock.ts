import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
import { IJsonDocumentRepository } from '../../../src/domain/repositories/IJsonDocumentRepository';
import { JsonDocument, DocumentType } from '../../../src/domain/entities/JsonDocument';
import { DocumentId } from '../../../src/domain/entities/DocumentId';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../src/domain/entities/Tag';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo';

/**
 * JSONɭ�����ݸ��n�ï�\Y�
 * 
 * @param customizations ���ޤ��p - �ïn/�D����ޤ�Y�_�n����ï
 * @returns �ïU�_�ݸ��h]n���n�ָ���
 * 
 * @example
 * // �,�jD�
 * const { mockRepo, instanceRepo } = createMockJsonDocumentRepository();
 * 
 * // ���ޤ�W_D�
 * const { mockRepo, instanceRepo } = createMockJsonDocumentRepository(mockRepo => {
 *   when(mockRepo.findById(deepEqual(new DocumentId('123')))).thenResolve({
 *     // ����ɭ����
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

  // �թ��n/�D�-�
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

  // ���ޤ��pLB�p�L
  if (customizations) {
    customizations(mockRepo);
  }

  // ��n����Y
  return {
    mockRepo,
    instanceRepo: instance(mockRepo)
  };
}