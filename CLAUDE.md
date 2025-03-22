# memory-bank-mcp-server Development Guide

## Build/Test Commands
- Build: `yarn build`
- Lint: `yarn lint` (fix: `yarn lint:fix`)
- Format: `yarn format`
- Run all tests: `yarn test`
- Run single test: `yarn test -- -t "test name pattern"`
- Run E2E tests: `yarn test:e2e`
- Run integration tests: `yarn test:integration`

## Code Style Guidelines
- **TypeScript**: ES2020 with ES Modules (import/export)
- **Naming**: PascalCase for classes/interfaces, camelCase for variables/functions
- **Formatting**: 100 char line limit, 2-space indent, single quotes
- **Imports**: Order by external→internal, no CommonJS requires
- **Error Handling**: Extend BaseError with proper error codes/details
- **Logging**: Use logger from shared/utils/logger.ts with appropriate log levels
- **Types**: Use interfaces for public APIs, explicit return types
- **Testing**: Jest with ts-jest, use descriptive test names
- **Architecture**: Clean Architecture pattern with Domain/Application/Infrastructure layers