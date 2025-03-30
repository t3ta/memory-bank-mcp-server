# @memory-bank/schemas

Schema definitions for Memory Bank system. This package provides schemas for JSON data validation and type checking.

## Installation

```bash
npm install @memory-bank/schemas
# or
yarn add @memory-bank/schemas
```

## Usage

```typescript
import { TagSchema, FlexibleDateSchema } from '@memory-bank/schemas';

// Validate data using schemas
const tagResult = TagSchema.safeParse('example-tag');
if (tagResult.success) {
  // Validation succeeded
  const validTag = tagResult.data;
  // ...
} else {
  // Validation failed
  console.error(tagResult.error);
}

// Parse dates flexibly
const dateResult = FlexibleDateSchema.safeParse('2025-03-27T12:00:00Z');
if (dateResult.success) {
  const parsedDate = dateResult.data; // Instance of Date
  console.log(parsedDate.toISOString());
}
```

## Main Schemas

The package currently includes:

- `TagSchema` - Schema for tags (lowercase alphanumeric with hyphens)
- `FlexibleDateSchema` - Schema for flexible date formats (accepts Date objects or strings)

Coming soon:
- Document schemas (v2)
- Metadata schemas
- Tag index schemas

## TypeScript Types

This package also provides TypeScript type definitions:

```typescript
import { ValidationErrorType, ValidationResult } from '@memory-bank/schemas';

// Use types
const validationResult: ValidationResult = {
  success: true
};

// Or for errors
const validationError: ValidationResult = {
  success: false,
  errors: [
    { 
      message: 'Invalid tag format',
      path: ['tags', '0']
    }
  ]
};
```

## Development

To build the package locally:

```bash
yarn install
yarn build
```

To run tests:

```bash
yarn test
```

## License

MIT
