import { MarkdownBuilder } from '../../../../../src/shared/utils/json-to-markdown/MarkdownBuilder.js';

describe('MarkdownBuilder (Deprecated)', () => {
  let builder: MarkdownBuilder;

  beforeEach(() => {
    builder = new MarkdownBuilder();
  });

  test('should create a heading with default level 1', () => {
    const result = builder.heading('Test Heading').build();
    expect(result).toBe('# Test Heading\n');
  });

  test('should create a heading with specified level', () => {
    const result = builder.heading('Test Heading', 3).build();
    expect(result).toBe('### Test Heading\n');
  });

  test('should clamp heading level to valid range (1-6)', () => {
    const tooLow = builder.clear().heading('Too Low', 0).build();
    expect(tooLow).toBe('# Too Low\n');

    const tooHigh = builder.clear().heading('Too High', 7).build();
    expect(tooHigh).toBe('###### Too High\n');
  });

  test('should create a paragraph', () => {
    const result = builder.paragraph('Test paragraph.').build();
    expect(result).toBe('Test paragraph.\n');
  });

  test('should create an unordered list', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const result = builder.list(items).build();

    const expected = '- Item 1\n- Item 2\n- Item 3\n';
    expect(result).toBe(expected);
  });

  test('should create an ordered list', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const result = builder.list(items, true).build();

    const expected = '1. Item 1\n2. Item 2\n3. Item 3\n';
    expect(result).toBe(expected);
  });

  test('should create a task list', () => {
    const items = [
      { text: 'Task 1', checked: true },
      { text: 'Task 2', checked: false },
      { text: 'Task 3', checked: true },
    ];

    const result = builder.taskList(items).build();

    const expected = '- [x] Task 1\n- [ ] Task 2\n- [x] Task 3\n';
    expect(result).toBe(expected);
  });

  // 他のテストケースもあるけど省略...

  test('should chain multiple elements', () => {
    const result = builder
      .heading('Test Document')
      .tags(['markdown', 'test'])
      .paragraph('This is a test document.')
      .heading('Section 1', 2)
      .list(['Item A', 'Item B'])
      .build();

    const expected =
      '# Test Document\n\n' +
      'tags: #markdown #test\n\n' +
      'This is a test document.\n\n' +
      '## Section 1\n\n' +
      '- Item A\n' +
      '- Item B\n';

    expect(result).toBe(expected);
  });

  test('should clear content', () => {
    builder.heading('Test').paragraph('Content');
    builder.clear();

    const result = builder.build();
    expect(result).toBe('');
  });
});
