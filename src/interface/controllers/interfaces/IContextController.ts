
import type { RulesResult, ContextRequest, ContextResult } from "../../../application/usecases/index.js";

/**
 * コンテキストコントローラーインターフェース
 */
export interface IContextController {
  /**
   * 指定された言語のルールを読み込む
   * @param language 言語コード ('en', 'ja', 'zh')
   * @returns ルール読み込み結果
   */
  readRules(language: string): Promise<{
    success: boolean;
    data?: RulesResult;
    error?: string;
  }>;

  /**
   * コンテキストを読み込む
   * @param request コンテキストリクエスト
   * @returns コンテキスト読み込み結果
   */
  readContext(request: ContextRequest): Promise<{
    success: boolean;
    data?: ContextResult;
    error?: string;
  }>;
}
