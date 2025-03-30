import type { RulesResult, ContextRequest, ContextResult } from "../../../application/usecases/types.js";
import type { IController } from "./IController.js";

/**
 * Context Controller Interface
 */
export interface IContextController extends IController {
  /**
   * Read rules for the specified language
   * @param language Language code ('en', 'ja', 'zh')
   * @returns Rules reading result
   */
  readRules(language: string): Promise<{
    success: boolean;
    data?: RulesResult;
    error?: string;
  }>;

  /**
   * Read context information
   * @param request Context request
   * @returns Context reading result
   */
  readContext(request: ContextRequest): Promise<{
    success: boolean;
    data?: ContextResult;
    error?: string;
  }>;
}
