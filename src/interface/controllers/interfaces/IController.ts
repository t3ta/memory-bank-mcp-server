/**
 * Base controller interface
 * Controllers handle incoming requests and orchestrate the execution of use cases
 */
export interface IController {
  // This is a marker interface to identify controllers
  // Specific methods will be defined in concrete controller interfaces

  // ESLintの空インターフェース警告を回避するためのダミープロパティ
  readonly _type: 'controller';
}
