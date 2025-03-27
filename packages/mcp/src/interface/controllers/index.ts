// Export interfaces
export * from "./interfaces/IController.js";
export * from "./interfaces/IBranchController.js";
export * from "./interfaces/IGlobalController.js";
export * from "./interfaces/IContextController.js";
export * from "./interfaces/ITemplateController.js";

// Export implementations
export * from "./BranchController.js";
export * from "./GlobalController.js";
export * from "./ContextController.js";
export * from "./TemplateController.js";

// Export JSON controllers
// Note: Currently only JsonBranchController exists in the JSON subpackage.
// We explicitly don't have JsonGlobalController because the global operations
// are simpler and don't require a specialized controller for JSON operations.
// If complexity increases in the future, we may add JsonGlobalController.
export * from "./json/index.js";
