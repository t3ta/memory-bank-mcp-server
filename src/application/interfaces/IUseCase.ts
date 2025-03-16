/**
 * Generic interface for use cases
 * 
 * @template TInput Type of the input data
 * @template TOutput Type of the output data
 */
export interface IUseCase<TInput, TOutput> {
  /**
   * Execute the use case
   * 
   * @param input Input data
   * @returns Promise resolving to output data
   */
  execute(input: TInput): Promise<TOutput>;
}
