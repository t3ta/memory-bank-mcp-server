/**
 * Base controller interface
 * Controllers handle incoming requests and orchestrate the execution of use cases
 */
export interface IController {
  // Dummy property to avoid ESLint empty interface warning
  readonly _type: 'controller';
}
