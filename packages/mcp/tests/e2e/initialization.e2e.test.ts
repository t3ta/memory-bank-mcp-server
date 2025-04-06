import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import { MCPInMemoryClient } from './helpers/MCPInMemoryClient.js'; // 作成したクライアントをインポート
// import type { Server } from '@modelcontextprotocol/sdk'; // SDKが見つからないためコメントアウト

describe('MCP E2E Initialization Tests', () => {
  let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv'];
  let client: MCPInMemoryClient;
  let server: any; // Server型が見つからないためanyに変更
  let cleanup: () => Promise<void>;

  // 各テストの前に環境をセットアップ
  beforeEach(async () => {
    const setup = await setupE2ETestEnv();
    testEnv = setup.testEnv;
    // client = setup.client; // clientはsetupE2ETestEnv内で初期化されるように修正が必要かも
    // setupE2ETestEnv から clientTransport を受け取り、ここでクライアントを初期化する
    client = new MCPInMemoryClient(setup.clientTransport);
    await client.initialize(); // ここで初期化を実行

    server = setup.server; // serverインスタンスを保持
    cleanup = setup.cleanup;
  });

  // 各テストの後に環境をクリーンアップ
  afterEach(async () => {
    await cleanup();
  });

  it('should establish connection successfully and perform basic operations', async () => {
    // クライアントは beforeEach で初期化されているはず
    // 簡単なメモリバンク操作を試して接続を確認する
    const branchName = 'feature/init-test-branch';
    const documentPath = 'init-test-doc.json';
    const docContent = JSON.stringify({
      schema: "memory_document_v2",
      metadata: {
        id: "test-e2e-init-doc",
        title: "E2E初期化テスト用ドキュメント",
        documentType: "test",
        path: documentPath,
        tags: ["test", "e2e", "init"],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        value: "E2E初期化テスト用のドキュメント内容"
      }
    }, null, 2);

    // 1. ドキュメントを書き込む
    const writeResult = await client.writeBranchMemoryBank(
      branchName,
      documentPath,
      testEnv.docRoot,
      { content: docContent, tags: ["test", "e2e", "init"] } // optionsオブジェクトで渡す
    );

    // writeResult の形式は MCPサーバーの実装によるが、成功したか確認
    // 例: expect(writeResult.success).toBe(true);
    //     expect(writeResult.data).toBeDefined();
    // 現状はエラーが出なければOKとする
    expect(writeResult).toBeDefined(); // とりあえず存在確認

    // 2. ドキュメントを読み込む
    const readResult = await client.readBranchMemoryBank(
      branchName,
      documentPath,
      testEnv.docRoot
    );

    // readResult の形式を確認
    // 例: expect(readResult.success).toBe(true);
    //     expect(readResult.data).toBeDefined();
    //     expect(readResult.data.document).toBeDefined();
    expect(readResult).toBeDefined(); // とりあえず存在確認
    expect(readResult.document).toBeDefined(); // documentプロパティがあるか
    expect(typeof readResult.document.content).toBe('string'); // contentが文字列か

    // 読み込んだ内容を確認
    const parsedContent = JSON.parse(readResult.document.content);
    expect(parsedContent.metadata.id).toBe('test-e2e-init-doc');
    expect(parsedContent.content.value).toBe('E2E初期化テスト用のドキュメント内容');
    expect(readResult.document.tags).toEqual(expect.arrayContaining(["test", "e2e", "init"])); // タグ確認
  });

  // TODO: 他の初期化関連テストケースを追加
  // - サーバーへの基本的なpingリクエスト（もし実装されていれば）
  // - クライアント切断時の挙動確認
});
