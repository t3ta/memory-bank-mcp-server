// Export bridge for backward compatibility
export * from './FileSystemTagIndexRepositoryV1Bridge.js';

// Export actual implementation
export * from './FileSystemTagIndexRepositoryImpl.js';

// Add compatibility alias to simplify migration
import { FileSystemTagIndexRepositoryImpl } from './FileSystemTagIndexRepositoryImpl.js';
export const FileSystemTagIndexRepository = FileSystemTagIndexRepositoryImpl;
