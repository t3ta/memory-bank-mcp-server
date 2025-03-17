# 多言語対応計画（中国語サポート）

## 概要

Memory Bank MCPサーバーは現在、日本語と英語のみをサポートしていますが、グローバル展開に向けて中国語サポートを追加する必要があります。このドキュメントでは、中国語サポートを実装するための詳細な計画を提供します。

## 現状分析

### 現在の言語サポート構造

現在のシステムでは以下の方法で言語サポートを実装しています：

1. **言語型の定義**:
   ```typescript
   // src/shared/types/index.ts
   export type Language = 'en' | 'ja';
   ```

2. **テンプレートファイルの管理**:
   - `src/templates/rules-en.md`
   - `src/templates/rules-ja.md`
   - `src/templates/pull-request-template-en.md`
   - `src/templates/pull-request-template.md` (日本語)
   - `src/templates/develop-to-master-pr-template-en.md`
   - `src/templates/develop-to-master-pr-template.md` (日本語)

3. **言語切り替えロジック**:
   ```typescript
   // src/index.ts (例)
   const isJapanese = language !== 'en';
   let responseMessage = isJapanese
     ? `pullRequest.md ファイルを作成しました。\n\n`
     : `pullRequest.md file has been created.\n\n`;
   ```

4. **CLI言語オプション**:
   ```typescript
   // src/types.ts
   export interface CliOptions {
     workspace?: string;
     memoryRoot?: string;
     verbose?: boolean;
     language?: 'en' | 'ja';
   }
   ```

### 現在の課題

1. 言語サポートがハードコードされている
2. テンプレートファイルの命名が一貫していない
3. 言語切り替えロジックが複数の場所に散在している
4. 新しい言語を追加するプロセスが標準化されていない

## 実装計画

### フェーズ1: 言語サポート基盤の強化（1週間）

#### 1.1 言語型の拡張

```typescript
// src/shared/types/index.ts
export type Language = 'en' | 'ja' | 'zh';
```

#### 1.2 言語設定の一元管理

```typescript
// src/infrastructure/config/language-config.ts
import { Language } from '../../shared/types/index.js';

export interface LanguageConfig {
  code: Language;
  name: string;
  isDefault: boolean;
  isEnabled: boolean;
  fallback: Language;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: 'English', isDefault: true, isEnabled: true, fallback: 'en' },
  { code: 'ja', name: '日本語', isDefault: false, isEnabled: true, fallback: 'en' },
  { code: 'zh', name: '中文', isDefault: false, isEnabled: true, fallback: 'en' },
];

export function getDefaultLanguage(): Language {
  const defaultLang = SUPPORTED_LANGUAGES.find(lang => lang.isDefault);
  return defaultLang ? defaultLang.code : 'en';
}

export function isLanguageSupported(language: string): boolean {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === language && lang.isEnabled);
}

export function getSafeLanguage(language: string): Language {
  return isLanguageSupported(language)
    ? language as Language
    : getDefaultLanguage();
}
```

#### 1.3 テンプレートディレクトリ構造の標準化

現在のテンプレートファイルを言語ごとのディレクトリに整理します：

```
src/
  templates/
    en/
      rules.md
      pull-request-template.md
      develop-to-master-pr-template.md
    ja/
      rules.md
      pull-request-template.md
      develop-to-master-pr-template.md
    zh/
      rules.md
      pull-request-template.md
      develop-to-master-pr-template.md
```

#### 1.4 テンプレートローダーの実装

```typescript
// src/infrastructure/templates/TemplateLoader.ts
import { promises as fs } from 'fs';
import path from 'path';
import { Language } from '../../shared/types/index.js';
import { IConfigProvider } from '../config/interfaces/IConfigProvider.js';
import { getSafeLanguage } from '../config/language-config.js';

export class TemplateLoader {
  constructor(private readonly configProvider: IConfigProvider) {}

  async loadTemplate(templateName: string, language: Language): Promise<string> {
    const safeLanguage = getSafeLanguage(language);
    const fallbackLanguage = 'en'; // デフォルト言語

    const templatePath = path.join(
      this.configProvider.getTemplatesPath(),
      safeLanguage,
      `${templateName}.md`
    );

    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      // 指定された言語のテンプレートが存在しない場合、デフォルト言語のテンプレートを使用
      const fallbackPath = path.join(
        this.configProvider.getTemplatesPath(),
        fallbackLanguage,
        `${templateName}.md`
      );

      try {
        return await fs.readFile(fallbackPath, 'utf-8');
      } catch (fallbackError) {
        throw new Error(`Template not found: ${templateName} for language ${language}`);
      }
    }
  }
}
```

#### 1.5 DIコンテナへの登録

```typescript
// src/main/di/container.ts
import { TemplateLoader } from '../../infrastructure/templates/TemplateLoader.js';

// 既存のDIコンテナ設定に追加
container.register('templateLoader', {
  useFactory: (configProvider) => new TemplateLoader(configProvider),
  dependencies: ['configProvider'],
});
```

### フェーズ2: 中国語テンプレートの作成（1週間）

#### 2.1 中国語テンプレートファイルの作成

以下のテンプレートファイルを中国語で作成します：

1. **src/templates/zh/rules.md**
   ```markdown
   # 记忆库规则

   ## 概述
   记忆库是一个用于存储和组织项目知识的系统。它帮助团队成员共享信息、记录决策并跟踪进度。

   ## 使用指南
   1. 每个分支都应该有自己的记忆库
   2. 全局记忆库用于存储跨分支的信息
   3. 使用标签来组织和查找文档
   4. 定期更新活动上下文文档

   ## 文档类型
   - 分支上下文：描述分支的目的和用户故事
   - 活动上下文：记录当前工作和最近的变更
   - 系统模式：记录技术决策
   - 进度：跟踪功能实现状态

   ## 最佳实践
   - 保持文档简洁明了
   - 使用标准格式
   - 定期更新
   - 在提交PR前确保记忆库是最新的
   ```

2. **src/templates/zh/pull-request-template.md**
   ```markdown
   # 拉取请求

   ## 概述
   <!-- 描述此PR的目的和解决的问题 -->

   ## 变更内容
   <!-- 列出主要变更 -->
   -

   ## 测试
   <!-- 描述如何测试这些变更 -->
   -

   ## 相关问题
   <!-- 链接到相关问题 -->
   -

   ## 检查表
   - [ ] 代码遵循项目编码标准
   - [ ] 添加了适当的测试
   - [ ] 文档已更新
   - [ ] 记忆库已更新
   ```

3. **src/templates/zh/develop-to-master-pr-template.md**
   ```markdown
   # 开发到主分支的拉取请求

   ## 版本
   <!-- 指定版本号 -->
   版本：

   ## 概述
   此PR将开发分支的变更合并到主分支。

   ## 主要功能
   <!-- 列出此版本中包含的主要功能 -->
   -

   ## 修复的错误
   <!-- 列出此版本中修复的错误 -->
   -

   ## 测试结果
   <!-- 提供测试结果摘要 -->
   -

   ## 部署说明
   <!-- 提供任何特殊的部署说明 -->
   -

   ## 检查表
   - [ ] 所有测试都已通过
   - [ ] 版本号已更新
   - [ ] 文档已更新
   - [ ] 变更日志已更新
   ```

#### 2.2 中国語メッセージの追加

メッセージを一元管理するためのローカライゼーションファイルを作成します：

```typescript
// src/locales/messages.ts
import { Language } from '../shared/types/index.js';

type MessageKey =
  | 'pullRequestCreated'
  | 'commitAndPush'
  | 'runCommands'
  | 'prInfo'
  | 'title'
  | 'targetBranch'
  | 'labels';

export const messages: Record<Language, Record<MessageKey, string>> = {
  en: {
    pullRequestCreated: 'pullRequest.md file has been created.',
    commitAndPush: 'Commit and push this file to automatically create a Pull Request via GitHub Actions.',
    runCommands: 'Run the following commands:',
    prInfo: 'PR Information:',
    title: 'Title:',
    targetBranch: 'Target branch:',
    labels: 'Labels:',
  },
  ja: {
    pullRequestCreated: 'pullRequest.md ファイルを作成しました。',
    commitAndPush: 'このファイルをコミットしてプッシュすると、GitHub Actionsによって自動的にPull Requestが作成されます。',
    runCommands: '以下のコマンドを実行してください:',
    prInfo: 'PR情報:',
    title: 'タイトル:',
    targetBranch: 'ターゲットブランチ:',
    labels: 'ラベル:',
  },
  zh: {
    pullRequestCreated: 'pullRequest.md 文件已创建。',
    commitAndPush: '提交并推送此文件，GitHub Actions将自动创建拉取请求。',
    runCommands: '运行以下命令：',
    prInfo: 'PR信息：',
    title: '标题：',
    targetBranch: '目标分支：',
    labels: '标签：',
  },
};

export function getMessage(key: MessageKey, language: Language): string {
  const safeLanguage = getSafeLanguage(language);
  return messages[safeLanguage][key] || messages.en[key];
}
```

#### 2.3 メッセージ使用の実装

```typescript
// src/index.ts (例)
import { getMessage } from './locales/messages.js';

// 既存のコード
let responseMessage = getMessage('pullRequestCreated', language) + '\n\n';
responseMessage += getMessage('commitAndPush', language) + '\n\n';
responseMessage += getMessage('runCommands', language) + '\n';
responseMessage += `git add ${pullRequest.filePath}\n`;
responseMessage += language === 'zh'
  ? `git commit -m "chore: 准备PR"\n`
  : (language === 'ja'
    ? `git commit -m "chore: PR作成準備"\n`
    : `git commit -m "chore: prepare PR"\n`);
responseMessage += `git push\n\n`;
responseMessage += getMessage('prInfo', language) + '\n';
responseMessage += `${getMessage('title', language)} ${pullRequest.title}\n`;
responseMessage += `${getMessage('targetBranch', language)} ${pullRequest.baseBranch}\n`;
responseMessage += `${getMessage('labels', language)} ${pullRequest.labels.join(', ')}\n`;
```

### フェーズ3: CLI引数とコンフィグの更新（3日間）

#### 3.1 CLI引数の拡張

```typescript
// src/cli/index.ts
import { SUPPORTED_LANGUAGES } from '../infrastructure/config/language-config.js';

const argv = yargs(hideBin(process.argv))
  .option('language', {
    alias: 'l',
    type: 'string',
    description: 'Language code (en, ja, zh)',
    choices: SUPPORTED_LANGUAGES.filter(lang => lang.isEnabled).map(lang => lang.code),
    default: getDefaultLanguage(),
  })
  // 他のオプション
  .help()
  .parseSync();
```

#### 3.2 設定プロバイダーの更新

```typescript
// src/infrastructure/config/ConfigProvider.ts
import { Language } from '../../shared/types/index.js';
import { getSafeLanguage } from './language-config.js';

export class ConfigProvider implements IConfigProvider {
  // 既存のコード

  getLanguage(): Language {
    return getSafeLanguage(this.config.language || 'en');
  }

  getTemplatesPath(): string {
    return path.join(this.getRootPath(), 'src', 'templates');
  }
}
```

### フェーズ4: テストと統合（1週間）

#### 4.1 単体テスト

1. **TemplateLoaderのテスト**
   ```typescript
   // src/infrastructure/templates/__tests__/TemplateLoader.test.ts
   import { describe, test, expect, beforeEach, jest } from '@jest/globals';
   import { TemplateLoader } from '../TemplateLoader.js';

   describe('TemplateLoader', () => {
     let templateLoader: TemplateLoader;
     let mockConfigProvider: any;

     beforeEach(() => {
       mockConfigProvider = {
         getTemplatesPath: jest.fn().mockReturnValue('/mock/templates/path'),
       };
       templateLoader = new TemplateLoader(mockConfigProvider);
     });

     test('should load template for specified language', async () => {
       // テスト実装
     });

     test('should fall back to English when template not found in specified language', async () => {
       // テスト実装
     });

     test('should throw error when template not found in any language', async () => {
       // テスト実装
     });
   });
   ```

2. **メッセージ機能のテスト**
   ```typescript
   // src/locales/__tests__/messages.test.ts
   import { describe, test, expect } from '@jest/globals';
   import { getMessage } from '../messages.js';

   describe('Messages', () => {
     test('should return message for English', () => {
       expect(getMessage('pullRequestCreated', 'en')).toBe('pullRequest.md file has been created.');
     });

     test('should return message for Japanese', () => {
       expect(getMessage('pullRequestCreated', 'ja')).toBe('pullRequest.md ファイルを作成しました。');
     });

     test('should return message for Chinese', () => {
       expect(getMessage('pullRequestCreated', 'zh')).toBe('pullRequest.md 文件已创建。');
     });

     test('should fall back to English for unsupported language', () => {
       // @ts-ignore - テスト用に無効な言語を渡す
       expect(getMessage('pullRequestCreated', 'fr')).toBe('pullRequest.md file has been created.');
     });
   });
   ```

#### 4.2 統合テスト

1. **中国語テンプレート読み込みのテスト**
   ```typescript
   // tests/integration/chinese-support.test.ts
   import { describe, test, expect, beforeAll } from '@jest/globals';
   import { createApplication } from '../../src/main/index.js';

   describe('Chinese Language Support', () => {
     let app: any;

     beforeAll(async () => {
       app = await createApplication({
         memoryRoot: './test-docs',
         language: 'zh',
         verbose: false,
       });
     });

     test('should load Chinese rules template', async () => {
       const response = await app.getGlobalController().readRules('zh');
       expect(response.success).toBe(true);
       expect(response.data).toContain('记忆库规则');
     });

     test('should create PR with Chinese messages', async () => {
       // テスト実装
     });
   });
   ```

#### 4.3 手動テスト計画

1. CLIで中国語を指定して実行
   ```bash
   node dist/index.js --language zh
   ```

2. 中国語でのPR作成機能のテスト
3. 中国語テンプレートの表示確認
4. 言語切り替え機能の確認

### フェーズ5: ドキュメント更新（2日間）

#### 5.1 開発者向けドキュメント

1. **多言語サポートガイド**
   - 新しい言語の追加方法
   - テンプレートの作成方法
   - メッセージの追加方法
   - テスト方法

2. **APIドキュメント更新**
   - 言語関連の新しいAPIの説明
   - 設定オプションの更新

#### 5.2 ユーザーガイド更新

1. **言語設定の説明**
   - CLIオプションの説明
   - 設定ファイルでの言語指定方法

2. **中国語サポートの説明**
   - 中国語で利用可能な機能
   - 中国語テンプレートの使用方法

## 実装スケジュール

| フェーズ | タスク | 担当者 | 期間 | 開始日 | 終了日 |
|---------|-------|-------|------|-------|-------|
| 1 | 言語サポート基盤の強化 | TBD | 1週間 | TBD | TBD |
| 2 | 中国語テンプレートの作成 | TBD | 1週間 | TBD | TBD |
| 3 | CLI引数とコンフィグの更新 | TBD | 3日間 | TBD | TBD |
| 4 | テストと統合 | TBD | 1週間 | TBD | TBD |
| 5 | ドキュメント更新 | TBD | 2日間 | TBD | TBD |

## リスクと対策

| リスク | 影響度 | 対策 |
|-------|-------|------|
| 中国語翻訳の品質 | 中 | ネイティブスピーカーによるレビュー |
| 既存コードへの影響 | 高 | 段階的な実装と十分なテスト |
| 文字エンコーディングの問題 | 中 | UTF-8の一貫した使用を確認 |
| パフォーマンスへの影響 | 低 | テンプレートのキャッシュ機構の検討 |

## 将来の拡張性

この実装は、将来的に他の言語（韓国語、フランス語、ドイツ語など）を追加する際の基盤となります。言語サポートの追加は以下の手順で行えます：

1. `Language`型に新しい言語コードを追加
2. `SUPPORTED_LANGUAGES`配列に新しい言語設定を追加
3. 新しい言語用のテンプレートファイルを作成
4. メッセージファイルに新しい言語のメッセージを追加
5. テストを実行して確認

## 結論

この計画に従って実装することで、Memory Bank MCPサーバーに中国語サポートを追加し、将来的な多言語対応の基盤を整えることができます。段階的なアプローチにより、既存の機能を損なうことなく、安全に新機能を追加することが可能です。
