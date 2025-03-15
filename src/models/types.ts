/**
 * Supported languages
 */
export type Language = 'en' | 'ja';

/**
 * Types of memory banks available in the system
 */
export enum MemoryBankType {
  GLOBAL = 'global',
  BRANCH = 'branch'
}

/**
 * Structure of a document stored in the memory bank
 */
export interface MemoryDocument {
  path: string;
  content: string;
  tags: string[];
  lastModified: Date;
}

/**
 * Configuration options for setting up the memory bank
 */
export interface WorkspaceConfig {
  workspaceRoot: string;
  memoryBankRoot: string;
  verbose: boolean;
  language: Language;
}

/**
 * Command line options for the server
 */
export interface CliOptions {
  workspace?: string;
  memoryRoot?: string;
  verbose?: boolean;
  language?: Language;
}

/**
 * Core files required for branch memory bank
 */
export const BRANCH_CORE_FILES = [
  'branchContext.md',
  'activeContext.md',
  'systemPatterns.md',
  'progress.md'
] as const;

/**
 * Localized template content
 */
export const TEMPLATES = {
  en: {
    branchContext: `# Branch Context

## Purpose

Branch: {branchName}
Created: {timestamp}

## User Stories

- [ ] Define the problem to solve
- [ ] Describe required features
- [ ] Specify expected behavior
`,

    activeContext: `# Active Context

## Current Work

## Recent Changes

## Active Decisions

## Active Considerations

## Next Steps
`,

    systemPatterns: `# System Patterns

## Technical Decisions

## Related Files and Directory Structure
`,

    progress: `# Progress

## Working Features

## Pending Implementation

## Current Status

## Known Issues
`,

    // Global memory bank templates
    architecture: `# System Architecture

tags: #architecture #system-design

## Overview

[Describe the overall system architecture]

## Components

[List and describe major system components]

## Design Decisions

[Document key architectural decisions]
`,

    codingStandards: `# Coding Standards

tags: #standards #best-practices

## General Guidelines

[List general coding guidelines]

## Language-Specific Standards

[Document language-specific standards]
`,

    domainModels: `# Domain Models

tags: #domain #models #architecture

## Core Models

[Define core domain models]

## Relationships

[Document relationships between models]
`,

    glossary: `# Project Glossary

tags: #glossary #terminology

## Terms

[List and define project-specific terms]

## Acronyms

[List and define commonly used acronyms]
`,

    techStack: `# Technology Stack

tags: #tech-stack #infrastructure

## Backend Technologies

[List backend technologies]

## Frontend Technologies

[List frontend technologies]

## Infrastructure

[Describe infrastructure components]
`,

    userGuide: `# User Guide

tags: #guide #documentation

## Overview

[Provide an overview of the system]

## Usage Instructions

[Document how to use the system]
`
  },
  ja: {
    branchContext: `# ブランチコンテキスト

## 目的

ブランチ: {branchName}
作成日時: {timestamp}

## ユーザーストーリー

- [ ] 解決する課題を定義
- [ ] 必要な機能を記述
- [ ] 期待される動作を明記
`,

    activeContext: `# アクティブコンテキスト

## 現在の作業内容

## 最近の変更点

## アクティブな決定事項

## 検討事項

## 次のステップ
`,

    systemPatterns: `# システムパターン

## 技術的決定事項

## 関連ファイルとディレクトリ構造
`,

    progress: `# 進捗状況

## 動作している機能

## 未実装の機能

## 現在の状態

## 既知の問題
`,

    // Global memory bank templates
    architecture: `# システムアーキテクチャ

tags: #architecture #system-design

## 概要

[システムアーキテクチャの説明]

## コンポーネント

[主要なシステムコンポーネントの一覧と説明]

## 設計上の決定事項

[重要なアーキテクチャ上の決定事項]
`,

    codingStandards: `# コーディング規約

tags: #standards #best-practices

## 一般的なガイドライン

[一般的なコーディングガイドライン]

## 言語固有の規約

[言語固有の規約について]
`,

    domainModels: `# ドメインモデル

tags: #domain #models #architecture

## コアモデル

[コアドメインモデルの定義]

## 関連性

[モデル間の関連性について]
`,

    glossary: `# 用語集

tags: #glossary #terminology

## 用語

[プロジェクト固有の用語の一覧と定義]

## 略語

[よく使用される略語の一覧と定義]
`,

    techStack: `# 技術スタック

tags: #tech-stack #infrastructure

## バックエンド技術

[バックエンド技術の一覧]

## フロントエンド技術

[フロントエンド技術の一覧]

## インフラストラクチャ

[インフラストラクチャコンポーネントの説明]
`,

    userGuide: `# ユーザーガイド

tags: #guide #documentation

## 概要

[システムの概要]

## 使用方法

[システムの使用方法について]
`
  }
} as const;

/**
 * Result of validating a memory bank structure
 */
export interface ValidationResult {
  isValid: boolean;
  missingFiles: string[];
  errors: string[];
}

/**
 * Response content type for MCP tools
 */
export interface ToolContent {
  type: string;
  text: string;
  mimeType?: string;
}

/**
 * Response structure for MCP tools
 */
export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Base request arguments for all tools
 */
export interface BaseToolArgs {
  [key: string]: unknown;
}

/**
 * Read memory bank request arguments
 */
export interface ReadMemoryBankArgs extends BaseToolArgs {
  path: string;
}

/**
 * Write memory bank request arguments
 */
export interface WriteMemoryBankArgs extends BaseToolArgs {
  path: string;
  content: string;
  tags?: string[];
}

/**
 * Update active context request arguments
 */
export interface UpdateActiveContextArgs extends BaseToolArgs {
  currentWork?: string;
  recentChanges?: string[];
  activeDecisions?: string[];
  considerations?: string[];
  nextSteps?: string[];
}

/**
 * Update progress request arguments
 */
export interface UpdateProgressArgs extends BaseToolArgs {
  workingFeatures?: string[];
  pendingImplementation?: string[];
  status?: string;
  knownIssues?: string[];
}

/**
 * Add technical decision request arguments
 */
export interface AddTechnicalDecisionArgs extends BaseToolArgs {
  title: string;
  context: string;
  decision: string;
  consequences: string[];
}

/**
 * Search by tags request arguments
 */
export interface SearchByTagsArgs extends BaseToolArgs {
  tags: string[];
}
