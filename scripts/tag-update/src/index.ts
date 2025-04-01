#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import minimist from 'minimist';
import chalk from 'chalk';
import { Logger, LogLevel } from './logger';
import { Config } from './config';
import { BackupManager } from './backup-manager';
import { FileScanner } from './file-scanner';
import { TagProcessor } from './tag-processor';
import { IndexGenerator } from './index-generator';

// コマンドライン引数のパース
const argv = minimist(process.argv.slice(2), {
  string: ['config', 'root-dir', 'tag-categorization', 'backup-dir'],
  boolean: ['dry-run', 'verbose', 'help', 'skip-backup', 'legacy-only'],
  alias: {
    c: 'config',
    r: 'root-dir',
    t: 'tag-categorization',
    b: 'backup-dir',
    d: 'dry-run',
    v: 'verbose',
    h: 'help',
    s: 'skip-backup',
    l: 'legacy-only'
  },
  default: {
    'dry-run': false,
    'verbose': false,
    'help': false,
    'skip-backup': false,
    'legacy-only': false
  }
});

// ヘルプの表示
if (argv.help) {
  console.log(`
${chalk.bold('グローバルメモリバンクタグ更新スクリプト')}

${chalk.bold('使用方法:')}
  yarn start [options]

${chalk.bold('オプション:')}
  -c, --config <path>            設定ファイルのパス
  -r, --root-dir <path>          グローバルメモリバンクのルートディレクトリ
  -t, --tag-categorization <path> タグカテゴリ定義ファイルのパス
  -b, --backup-dir <path>        バックアップディレクトリのパス
  -d, --dry-run                  変更を実際に適用せずに実行（テストモード）
  -v, --verbose                  詳細なログを出力
  -s, --skip-backup              バックアップを作成しない
  -l, --legacy-only              レガシーインデックスのみを更新
  -h, --help                     このヘルプを表示

${chalk.bold('例:')}
  yarn start --dry-run           ドライランモードで実行
  yarn start --verbose           詳細なログを出力
  yarn start --root-dir ./docs   カスタムディレクトリを指定
  `);
  process.exit(0);
}

/**
 * メイン処理
 */
async function main() {
  try {
    // 設定の読み込み
    const config = new Config(argv.config);

    // コマンドライン引数から設定を更新
    if (argv['root-dir']) {
      config.updateConfig({ rootDir: argv['root-dir'] });
    }

    if (argv['tag-categorization']) {
      config.updateConfig({ tagCategorizationPath: argv['tag-categorization'] });
    }

    if (argv['backup-dir']) {
      config.updateConfig({ backupDir: argv['backup-dir'] });
    }

    // ログレベルの設定
    const logLevel = argv.verbose ? LogLevel.DEBUG : LogLevel.INFO;
    config.updateConfig({ logLevel });

    // ドライランモードの設定
    config.updateConfig({ dryRun: argv['dry-run'] });

    // ロガーの初期化
    const logger = new Logger(config.getConfig().logLevel);

    logger.info(chalk.bold('グローバルメモリバンクタグ更新スクリプト'));
    logger.info(`実行モード: ${config.get('dryRun') ? chalk.yellow('ドライラン（変更は適用されません）') : chalk.green('本番（変更が適用されます）')}`);

    // 設定の表示
    logger.info('設定:');
    logger.info(`  ルートディレクトリ: ${config.get('rootDir')}`);
    logger.info(`  バックアップディレクトリ: ${config.get('backupDir')}`);
    logger.info(`  タグカテゴリ定義: ${config.get('tagCategorizationPath')}`);
    logger.info(`  タグインデックスパス: ${config.get('tagsIndexPath')}`); // Use new config key
    logger.info(`  ドキュメントメタパス: ${config.get('documentsMetaPath')}`); // Use new config key
    logger.info(`  レガシーインデックスパス: ${config.get('legacyIndexPath')}`);

    // バックアップマネージャーの初期化
    const backupManager = new BackupManager(logger);

    // ファイルスキャナーの初期化
    const fileScanner = new FileScanner({
      rootDir: config.get('rootDir'),
      excludeDirs: config.get('excludeDirs'),
      fileExtensions: ['.json']
    }, logger);

    // タグプロセッサーの初期化
    const tagProcessor = new TagProcessor(logger);
    await tagProcessor.loadTagCategorization(config.get('tagCategorizationPath'));

    // インデックスジェネレーターの初期化
    const indexGenerator = new IndexGenerator(tagProcessor, logger);

    // ファイルのスキャン
    logger.info(chalk.blue('ファイルのスキャンを開始します...'));
    const files = await fileScanner.scanFiles();
    logger.info(`${files.length}個のJSONファイルが見つかりました`);

    // バックアップの作成（スキップオプションがない場合）
    if (!argv['skip-backup']) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupTargets = [
        config.get('tagsIndexPath'), // Use new config key for backup target
        config.get('documentsMetaPath'), // Use new config key for backup target
        config.get('legacyIndexPath'),
        ...files
      ];

      logger.info(chalk.blue('バックアップを作成しています...'));
      const backupDir = await backupManager.createBackup({
        backupDir: config.get('backupDir'),
        timestamp,
        files: backupTargets
      });
      logger.info(`バックアップを作成しました: ${backupDir}`);
    } else {
      logger.warning('バックアップはスキップされました');
    }

    // レガシーインデックスのみのモードでない場合はタグを更新
    if (!argv['legacy-only']) {
      // タグの更新
      logger.info(chalk.blue('タグの更新を開始します...'));

      let processedCount = 0;
      for (const file of files) {
        await tagProcessor.processFile(file, config.get('dryRun'));

        // 進捗表示
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === files.length) {
          logger.info(`処理状況: ${processedCount}/${files.length} ファイル (${Math.floor(processedCount / files.length * 100)}%)`);
        }
      }

      // 処理結果の表示
      const stats = tagProcessor.getStats();
      logger.info(chalk.green('タグの更新が完了しました'));
      logger.info(`処理ファイル数: ${stats.processedFiles}`);
      logger.info(`更新ファイル数: ${stats.updatedFiles}`);
      logger.info(`スキップファイル数: ${stats.skippedFiles}`);
      logger.info(`失敗ファイル数: ${stats.failedFiles}`);
      logger.info(`タグ更新数: ${stats.tagsUpdated} (追加: ${stats.tagsAdded}, 削除: ${stats.tagsRemoved})`);
    } else if (argv['legacy-only']) {
      logger.info('レガシーインデックスのみモード: タグの更新はスキップされました');
    }

    // 新しいタグインデックスの生成（レガシーのみモードでない場合）
    if (!argv['legacy-only']) {
      logger.info(chalk.blue('新しいタグインデックスを生成しています...'));
      // Generate both new indices
      const { tagsIndex, documentsMetaIndex } = await indexGenerator.generateIndex(files);

      // Save the new tags index
      logger.info(chalk.blue('新しいタグインデックスを保存しています...'));
      await indexGenerator.saveIndex(tagsIndex, config.get('tagsIndexPath'), config.get('dryRun'));

      // Save the new documents metadata index
      logger.info(chalk.blue('新しいドキュメントメタデータを保存しています...'));
      await indexGenerator.saveIndex(documentsMetaIndex, config.get('documentsMetaPath'), config.get('dryRun'));
    }

    // レガシーインデックスの生成
    logger.info(chalk.blue('レガシーインデックスを生成しています...'));
    const legacyIndex = await indexGenerator.generateLegacyIndex(files);

    // レガシーインデックスの保存
    await indexGenerator.saveIndex(legacyIndex, config.get('legacyIndexPath'), config.get('dryRun'));

    // 処理結果のサマリー
    logger.info(chalk.green.bold('処理が完了しました'));

    if (config.get('dryRun')) {
      logger.info(chalk.yellow('ドライランモードのため、実際の変更は適用されていません'));
      logger.info('変更を適用するには、--dry-run オプションを外して再実行してください');
    } else {
      logger.info('すべての変更が適用されました');
    }

    // 統計情報の表示
    logger.info(`統計情報: ${JSON.stringify(tagProcessor.getStats())}`);

    // 完了
    if (!config.get('dryRun')) {
      logger.info(chalk.green('タグ更新プロセスが正常に完了しました'));
    } else {
      logger.info(chalk.yellow('タグ更新プロセスのドライランが正常に完了しました'));
    }
  } catch (error) {
    // エラーハンドリング
    console.error(chalk.red('エラーが発生しました:'));
    console.error(error);
    process.exit(1);
  }
}

// スクリプトを実行
main().catch(error => {
  console.error(chalk.red('致命的なエラーが発生しました:'));
  console.error(error);
  process.exit(1);
});
