// Export bridge for backward compatibility
export * from './FileSystemTagIndexRepositoryV1Bridge';

// Export actual implementation
export * from './FileSystemTagIndexRepositoryImpl';

// Add compatibility alias to simplify migration
import { FileSystemTagIndexRepositoryImpl } from './FileSystemTagIndexRepositoryImpl';
export const FileSystemTagIndexRepository = FileSystemTagIndexRepositoryImpl;
