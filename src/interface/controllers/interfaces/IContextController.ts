import { Result } from '../../shared/types/Result.js';
import { ContextRequest, ContextResult } from '../../application/usecases/common/ReadContextUseCase.js';
import { RulesResult } from '../../application/usecases/common/ReadRulesUseCase.js';

/**
 * コンテキストコントローラーインターフェース
 */
export interface IContextController {
  /**
   * 指定された言語のルールを読み込む
   * @param language 言語コード ('en', 'ja', 'zh')
   * @returns ルール読み込み結果
   */
  readRules(language: string): Promise<Result<RulesResult>>;

  /**
   * コンテキストを読み込む
   * @param request コンテキストリクエスト
   * @returns コンテキスト読み込み結果
   */
  readContext(request: ContextRequest): Promise<Result<ContextResult>>;
}
