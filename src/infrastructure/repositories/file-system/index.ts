// Export bridge for backward compatibility
export * from '../.jsFileSystemTagIndexRepositoryV1Bridge.js';

// Export actual implementation
export * from '../.jsFileSystemTagIndexRepositoryImpl.js';

// Add compatibility alias to simplify migration
import { FileSystemTagIndexRepositoryImpl } from '../.jsFileSystemTagIndexRepositoryImpl.js';
export const FileSystemTagIndexRepository = FileSystemTagIndexRepositoryImpl;
