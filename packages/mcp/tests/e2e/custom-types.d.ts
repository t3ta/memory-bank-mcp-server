// MCPの型を拡張するための宣言マージング
import '@t3ta/mcp-test';

declare module '@t3ta/mcp-test' {
  // 元のMCPToolResponseインターフェースを拡張
  interface MCPToolResponse<T = any> {
    // 古いテスト互換性のために追加
    success?: boolean;
    data?: T;
  }
}
