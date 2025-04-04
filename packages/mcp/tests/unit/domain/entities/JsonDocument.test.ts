import { JsonDocument, SCHEMA_VERSION, DocumentType } from '../../../../src/domain/entities/JsonDocument';
import { DocumentPath } from '../../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../../src/domain/entities/Tag';
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError';
import { IDocumentValidator } from '../../../../src/domain/validation/IDocumentValidator';
import { DocumentId } from '../../../../src/domain/entities/DocumentId';
import { DocumentVersionInfo } from '../../../../src/domain/entities/DocumentVersionInfo';

// モックバリデーター
const mockValidator: IDocumentValidator = {
  validateDocument: jest.fn(),
  validateMetadata: jest.fn(), // これを追加！
  validateContent: jest.fn(),
};

describe('JsonDocument', () => {
  // --- Test Setup ---
  const validPath = DocumentPath.create('test/document.json');
  const docId = DocumentId.generate();
  const title = 'Test Document';
  const documentType: DocumentType = 'generic';
  const tags = [Tag.create('test'), Tag.create('json')];
  const content = { key: 'value', nested: { num: 1 } };
  const branch = 'feature/test-branch';
  const versionInfo = new DocumentVersionInfo({ version: 1 });

  // beforeAll(() => {
  //   // テスト全体でモックバリデーターを設定 -> beforeEach に移動
  //   JsonDocument.setValidator(mockValidator);
  // });

  beforeEach(() => {
    // 各テストの前にバリデーターを再設定し、モックの呼び出し履歴をリセット
    JsonDocument.setValidator(mockValidator);
    jest.clearAllMocks();
  });

  // --- Static Factory Methods ---

  describe('fromString', () => {
    // validJsonString は各テストケースで定義する方が柔軟性が高い場合があるが、
    // ここでは describe ブロック内で共通のものを定義
    const validJsonString = JSON.stringify({
      schema: SCHEMA_VERSION,
      metadata: {
        id: docId.value,
        title: title,
        documentType: documentType,
        path: validPath.value,
        tags: tags.map(t => t.value),
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1,
        branch: branch,
      },
      content: content,
    });

    it('有効なJSON文字列からインスタンスを作成できること', () => {
      const doc = JsonDocument.fromString(validJsonString, validPath);
      expect(doc).toBeInstanceOf(JsonDocument);
      expect(doc.id.equals(docId)).toBe(true);
      expect(doc.path.equals(validPath)).toBe(true);
      expect(doc.title).toBe(title);
      expect(doc.documentType).toBe(documentType);
      expect(doc.tags).toEqual(tags);
      expect(doc.content).toEqual(content);
      expect(doc.branch).toBe(branch);
      expect(doc.version).toBe(1);
      // バリデーターが呼ばれたことを確認
      expect(mockValidator.validateDocument).toHaveBeenCalledTimes(1);
    });

    it('無効なJSON文字列でエラーが発生すること', () => {
      const invalidJsonString = '{"invalid json';
      // toThrow にエラークラスとメッセージの部分一致チェックを渡す (正規表現を使用)
      expect(() => JsonDocument.fromString(invalidJsonString, validPath)).toThrow(DomainError);
      expect(() => JsonDocument.fromString(invalidJsonString, validPath)).toThrow(/Failed to parse JSON document/);
      expect(mockValidator.validateDocument).not.toHaveBeenCalled();
    });

    it('スキーマバージョンが不正な場合にバリデーションエラーが発生すること', () => {
       // バリデーターがエラーを投げるようにモックを設定
       (mockValidator.validateDocument as jest.Mock).mockImplementationOnce(() => {
         throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid schema version');
       });
       const jsonWithInvalidSchema = JSON.stringify({
         schema: 'invalid_version',
         metadata: { id: docId.value, title, documentType, path: validPath.value, tags: [], lastModified: new Date(), createdAt: new Date(), version: 1 },
         content: {},
       });
       // toThrow にエラークラスとメッセージの完全一致チェックを渡す (モックで投げてるエラーなので完全一致でOK)
       expect(() => JsonDocument.fromString(jsonWithInvalidSchema, validPath)).toThrow(
         new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid schema version')
       );
       expect(mockValidator.validateDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('fromObject', () => {
     const validObject = {
       schema: SCHEMA_VERSION,
       metadata: {
         id: docId.value,
         title: title,
         documentType: documentType,
         path: validPath.value,
         tags: tags.map(t => t.value),
         lastModified: new Date().toISOString(),
         createdAt: new Date().toISOString(),
         version: 1,
         branch: branch,
       },
       content: content,
     };

    it('有効なオブジェクトからインスタンスを作成できること', () => {
      const doc = JsonDocument.fromObject(validObject, validPath);
      expect(doc).toBeInstanceOf(JsonDocument);
      expect(doc.id.equals(docId)).toBe(true);
      // ... 他のプロパティも同様にチェック ...
      expect(mockValidator.validateDocument).toHaveBeenCalledWith(validObject);
      expect(mockValidator.validateDocument).toHaveBeenCalledTimes(1);
    });

    it('無効なオブジェクト構造でバリデーションエラーが発生すること', () => {
      const invalidObject = { invalid: 'structure' };
      // バリデーターがエラーを投げるようにモックを設定
      (mockValidator.validateDocument as jest.Mock).mockImplementationOnce(() => {
        throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid structure');
      });
      // toThrow にエラークラスとメッセージの完全一致チェックを渡す (モックで投げてるエラーなので完全一致でOK)
      expect(() => JsonDocument.fromObject(invalidObject, validPath)).toThrow(
         new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid structure')
      );
      expect(mockValidator.validateDocument).toHaveBeenCalledWith(invalidObject);
      expect(mockValidator.validateDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('指定されたプロパティで新しいインスタンスを作成できること', () => {
      const doc = JsonDocument.create({
        id: docId,
        path: validPath,
        title: title,
        documentType: documentType,
        tags: tags,
        content: content,
        branch: branch,
        versionInfo: versionInfo,
      });

      expect(doc).toBeInstanceOf(JsonDocument);
      expect(doc.id).toBe(docId);
      expect(doc.path).toBe(validPath);
      expect(doc.title).toBe(title);
      expect(doc.documentType).toBe(documentType);
      expect(doc.tags).toEqual(tags); // 配列は toEqual で比較
      expect(doc.content).toEqual(content); // オブジェクトは toEqual で比較
      expect(doc.branch).toBe(branch);
      expect(doc.versionInfo).toBe(versionInfo);
      expect(doc.version).toBe(1);
      expect(doc.lastModified).toEqual(versionInfo.lastModified); // Date は toEqual で比較
      // コンテンツバリデーションが呼ばれたことを確認
      expect(mockValidator.validateContent).toHaveBeenCalledWith(documentType, content);
      expect(mockValidator.validateContent).toHaveBeenCalledTimes(1);
    });

     it('ID、タグ、ブランチ、バージョン情報がなくてもデフォルト値で作成できること', () => {
       const doc = JsonDocument.create({
         path: validPath,
         title: title,
         documentType: documentType,
         content: content,
       });
       expect(doc.id).toBeInstanceOf(DocumentId);
       expect(doc.tags).toEqual([]);
       expect(doc.branch).toBeUndefined();
       expect(doc.versionInfo).toBeInstanceOf(DocumentVersionInfo);
       expect(doc.version).toBe(1); // デフォルトバージョン
       expect(mockValidator.validateContent).toHaveBeenCalledWith(documentType, content);
     });

    it('不正なコンテンツでバリデーションエラーが発生すること', () => {
      const invalidContent = { wrong: 'structure' };
      // バリデーターがエラーを投げるようにモックを設定
      (mockValidator.validateContent as jest.Mock).mockImplementationOnce(() => {
        throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid content');
      });

      expect(() => JsonDocument.create({
        path: validPath,
        title: title,
        documentType: documentType,
        content: invalidContent,
      // toThrow にエラークラスとメッセージの完全一致チェックを渡す (モックで投げてるエラーなので完全一致)
      })).toThrow(
        new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid content')
      );
      expect(mockValidator.validateContent).toHaveBeenCalledWith(documentType, invalidContent);
      expect(mockValidator.validateContent).toHaveBeenCalledTimes(1);
    });

    // 必須プロパティ（path, title, documentType, content）がない場合のテストはTypeScriptの型チェックに依存するため、
    // ランタイムでのエラーというよりはコンパイルエラーになる。ここでは主にバリデーションエラーをテストする。
  });

  // --- Instance Methods ---

  describe('updatePath', () => {
    let doc: JsonDocument;
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content });
    });

    it('パスを正しく更新し、新しいインスタンスを返すこと', () => {
      const newPath = DocumentPath.create('new/path.json');
      const updatedDoc = doc.updatePath(newPath);

      expect(updatedDoc).not.toBe(doc); // イミュータブルであること
      expect(updatedDoc.path).toBe(newPath);
      expect(updatedDoc.id.equals(doc.id)).toBe(true); // IDは変わらない
      expect(updatedDoc.title).toBe(doc.title); // 他のプロパティは変わらない
      expect(updatedDoc.version).toBe(doc.version + 1); // バージョンがインクリメントされる
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // 更新日時が同じか進んでいることを確認
    });

    it('同じパスで更新しても同じインスタンスを返すこと', () => {
      const updatedDoc = doc.updatePath(validPath);
      expect(updatedDoc).toBe(doc); // 同じインスタンスが返る
      expect(updatedDoc.version).toBe(doc.version);
    });
  });

  describe('updateTitle', () => {
    let doc: JsonDocument;
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content });
    });

    it('タイトルを正しく更新し、新しいインスタンスを返すこと', () => {
      const newTitle = 'New Title';
      const updatedDoc = doc.updateTitle(newTitle);

      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.title).toBe(newTitle);
      expect(updatedDoc.path.equals(doc.path)).toBe(true);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // 更新日時が同じか進んでいることを確認
    });

     it('同じタイトルで更新しても同じインスタンスを返すこと', () => {
       const updatedDoc = doc.updateTitle(title);
       expect(updatedDoc).toBe(doc);
       expect(updatedDoc.version).toBe(doc.version);
     });
  });

  describe('updateContent', () => {
    let doc: JsonDocument<typeof content>;
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content });
    });

    it('コンテントを正しく更新し、新しいインスタンスを返すこと', () => {
      const newContent = { newKey: 'newValue' };
      // この行は重複しているので削除

      jest.clearAllMocks(); // モック呼び出し履歴をクリアしてから updateContent を呼ぶ
      const updatedDoc = doc.updateContent(newContent); // updateContent を呼び出す

      // コンテンツバリデーションが呼ばれたことを確認
      expect(mockValidator.validateContent).toHaveBeenCalledWith(documentType, newContent); // 正しい引数で呼ばれたか
      expect(mockValidator.validateContent).toHaveBeenCalledTimes(1); // 1回だけ呼ばれたか

      // 他のプロパティチェック
      expect(updatedDoc).not.toBe(doc); // イミュータブルであること
      expect(updatedDoc.content).toEqual(newContent);
      expect(updatedDoc.title).toBe(doc.title);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // 更新日時が同じか進んでいることを確認
    });

    it('不正なコンテンツで更新しようとするとエラーが発生すること', () => {
       const invalidContent = { wrong: 'structure' };
       // バリデーターがエラーを投げるようにモックを設定
       (mockValidator.validateContent as jest.Mock).mockImplementationOnce(() => {
         throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid content');
       });

       jest.clearAllMocks(); // モック呼び出し履歴をクリア
       // toThrow 内で updateContent が呼ばれる
       expect(() => doc.updateContent(invalidContent)).toThrow(
         new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid content')
       );
     });
   });

  describe('addTag', () => {
    let doc: JsonDocument;
    const newTag = Tag.create('new-tag'); // 小文字とハイフンのみに修正
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content, tags });
    });

    it('タグを正しく追加し、新しいインスタンスを返すこと', () => {
      const updatedDoc = doc.addTag(newTag);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).toContainEqual(newTag);
      expect(updatedDoc.tags.length).toBe(tags.length + 1);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // 更新日時が同じか進んでいることを確認
    });

    it('既に存在するタグを追加しても同じインスタンスを返すこと', () => {
      const existingTag = tags[0];
      const updatedDoc = doc.addTag(existingTag);
      expect(updatedDoc).toBe(doc);
      expect(updatedDoc.tags.length).toBe(tags.length);
      expect(updatedDoc.version).toBe(doc.version);
    });
  });

  describe('removeTag', () => {
    let doc: JsonDocument;
    const tagToRemove = tags[0];
    const nonExistentTag = Tag.create('non-existent'); // 小文字に修正
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content, tags });
    });

    it('存在するタグを正しく削除し、新しいインスタンスを返すこと', () => {
      const updatedDoc = doc.removeTag(tagToRemove);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).not.toContainEqual(tagToRemove);
      expect(updatedDoc.tags.length).toBe(tags.length - 1);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // 更新日時が同じか進んでいることを確認
    });

    it('存在しないタグを削除しようとしても同じインスタンスを返すこと', () => {
      const updatedDoc = doc.removeTag(nonExistentTag);
      expect(updatedDoc).toBe(doc);
      expect(updatedDoc.tags.length).toBe(tags.length);
      expect(updatedDoc.version).toBe(doc.version);
    });
  });

  describe('updateTags', () => {
     let doc: JsonDocument;
     const newTags = [Tag.create('new1'), Tag.create('new2')];
     beforeEach(() => {
       doc = JsonDocument.create({ path: validPath, title, documentType, content, tags });
     });

    it('タグリストを正しく更新し、新しいインスタンスを返すこと', () => {
      const updatedDoc = doc.updateTags(newTags);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).toEqual(newTags);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // 更新日時が同じか進んでいることを確認
    });
  });

  describe('toObject', () => {
    it('正しい BaseJsonDocumentV2 構造のオブジェクトを返すこと', () => {
      const doc = JsonDocument.create({ id: docId, path: validPath, title, documentType, content, tags, branch, versionInfo });
      const obj = doc.toObject();

      expect(obj.schema).toBe(SCHEMA_VERSION);
      expect(obj.metadata.id).toBe(docId.value);
      expect(obj.metadata.title).toBe(title);
      expect(obj.metadata.documentType).toBe(documentType);
      expect(obj.metadata.path).toBe(validPath.value);
      expect(obj.metadata.tags).toEqual(tags.map(t => t.value));
      expect(obj.metadata.lastModified).toEqual(versionInfo.lastModified); // Dateオブジェクトの比較
      expect(obj.metadata.version).toBe(versionInfo.version);
      expect(obj.metadata.branch).toBe(branch);
      expect(obj.metadata.createdAt).toBeDefined(); // createdAt が存在することを確認
      expect(obj.content).toEqual(content);
    });

     it('ブランチがない場合、metadata に branch が含まれないこと', () => {
       const doc = JsonDocument.create({ path: validPath, title, documentType, content });
       const obj = doc.toObject();
       expect(obj.metadata.branch).toBeUndefined();
     });
  });

  describe('toString', () => {
    it('正しいJSON文字列を返すこと', () => {
       const doc = JsonDocument.create({ id: docId, path: validPath, title, documentType, content, tags, branch, versionInfo });
       const jsonString = doc.toString();
       const parsed = JSON.parse(jsonString); // 再度パースして確認

       expect(parsed.schema).toBe(SCHEMA_VERSION);
       expect(parsed.metadata.id).toBe(docId.value);
       // ... toObject と同様のチェック ...
       expect(parsed.content).toEqual(content);
    });

    it('pretty=true の場合、整形されたJSON文字列を返すこと', () => {
      const doc = JsonDocument.create({ path: validPath, title, documentType, content });
      const prettyJsonString = doc.toString(true);
      // 整形されているか（インデントや改行があるか）を簡易的にチェック
      expect(prettyJsonString).toContain('\n');
      expect(prettyJsonString).toContain('  '); // インデント（スペース2つ）
    });
  });

  describe('equals', () => {
    let doc1: JsonDocument;
    let doc2: JsonDocument;
    let doc3: JsonDocument;

    beforeEach(() => {
      // 各テストの前にインスタンスを生成（この時点では validator は設定済み）
      doc1 = JsonDocument.create({ id: docId, path: validPath, title, documentType, content });
      doc2 = JsonDocument.create({ id: docId, path: DocumentPath.create('other.json'), title: 'Other', documentType, content }); // 同じID、違う内容
      doc3 = JsonDocument.create({ path: validPath, title, documentType, content }); // 違うID
    });

    it('同じIDを持つインスタンスは true を返すこと', () => {
      expect(doc1.equals(doc2)).toBe(true);
    });

    it('異なるIDを持つインスタンスは false を返すこと', () => {
      expect(doc1.equals(doc3)).toBe(false);
    });
  });

   describe('hasTag', () => {
     let doc: JsonDocument;
     let existingTag: Tag;
     let nonExistentTag: Tag;
     beforeEach(() => {
       // 各テストの前にインスタンスとタグを生成
       doc = JsonDocument.create({ path: validPath, title, documentType, content, tags });
       existingTag = tags[0];
       nonExistentTag = Tag.create('non-existent'); // ここも小文字に修正済みのはず
     });

     it('存在するタグに対して true を返すこと', () => {
       expect(doc.hasTag(existingTag)).toBe(true);
     });

     it('存在しないタグに対して false を返すこと', () => {
       expect(doc.hasTag(nonExistentTag)).toBe(false);
     });
   });

   describe('getters', () => {
      let doc: JsonDocument;
      beforeEach(() => {
        // 各テストの前にインスタンスを生成
        doc = JsonDocument.create({ id: docId, path: validPath, title, documentType, content, tags, branch, versionInfo });
      });

      it('各ゲッターが正しい値を返すこと', () => {
        expect(doc.id).toBe(docId);
        expect(doc.path).toBe(validPath);
        expect(doc.title).toBe(title);
        expect(doc.documentType).toBe(documentType);
        expect(doc.tags).toEqual(tags);
        expect(doc.content).toEqual(content);
        expect(doc.branch).toBe(branch);
        expect(doc.versionInfo).toBe(versionInfo);
        expect(doc.lastModified).toEqual(versionInfo.lastModified); // Date は toEqual で比較
        expect(doc.version).toBe(versionInfo.version);
      });
   });

   // describe('Validator Handling', () => {
   //   it('バリデーターが設定されていない場合に getValidator がエラーを投げること', () => {
   //     // 一時的にバリデーターを未設定状態にする（@ts-ignore を使用）
   //     // @ts-ignore - private static プロパティへのアクセス
   //     const originalValidator = JsonDocument.validator;
   //     // @ts-ignore
   //     JsonDocument.validator = undefined;
   //
   //     expect(() => {
   //       // getValidator を内部的に呼び出すメソッドを実行
   //       JsonDocument.create({ path: validPath, title, documentType, content });
   //     }).toThrow(new DomainError(DomainErrorCodes.INITIALIZATION_ERROR, expect.stringContaining('Document validator not set')));
   //
   //     // バリデーターを元に戻す -> finally ブロックや afterEach でやるべき
   //     // @ts-ignore
   //     JsonDocument.validator = originalValidator;
   //   });
   // });

});
