/**
 * パッケージ構造解析のための型定義
 */

// ツール設定
export interface ToolConfig {
  /**
   * 解析設定
   */
  analyze: AnalyzeOptions;
  
  /**
   * ダイアグラム設定
   */
  diagram: DiagramOptions;
  
  /**
   * 出力設定
   */
  output: {
    /**
     * 出力ディレクトリ
     */
    directory: string;
    
    /**
     * 出力フォーマット
     */
    format: 'mermaid' | 'json' | 'html';
    
    /**
     * HTMLテンプレートパス（format: 'html'の場合）
     */
    htmlTemplate?: string;
  };
}

// 解析オプション
export interface AnalyzeOptions {
  /**
   * 解析の詳細レベル
   */
  depth?: 'basic' | 'detailed' | 'full';
  
  /**
   * 解析から除外するパターン（glob形式）
   */
  exclude?: string[];
  
  /**
   * 解析に含めるパターン（glob形式）
   */
  include?: string[];
}

// ダイアグラム生成オプション
export interface DiagramOptions {
  /**
   * ダイアグラムのタイプ
   */
  type: 'class' | 'directory' | 'dependency';
  
  /**
   * 表示の詳細レベル
   */
  detailLevel: 'minimum' | 'standard' | 'full';
  
  /**
   * ダイアグラムのタイトル
   */
  title?: string;
  
  /**
   * 表示する方向（TB: 上から下, LR: 左から右）
   */
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
}

// プロジェクト構造
export interface ProjectStructure {
  /**
   * プロジェクト名
   */
  name: string;
  
  /**
   * プロジェクトのルートディレクトリ
   */
  rootDirectories: DirectoryStructure[];
  
  /**
   * パッケージパスのマップ (パッケージ名 -> パッケージパス)
   */
  packagePaths: Map<string, string>;
  
  /**
   * 解析設定
   */
  configuration: AnalyzeOptions;
}

// ディレクトリ構造
export interface DirectoryStructure {
  /**
   * ディレクトリ名
   */
  name: string;
  
  /**
   * ディレクトリの相対パス
   */
  path: string;
  
  /**
   * ディレクトリ内のファイル
   */
  files: FileStructure[];
  
  /**
   * サブディレクトリ
   */
  subdirectories: DirectoryStructure[];
  
  /**
   * このディレクトリがnpmパッケージかどうか
   */
  isPackage: boolean;
  
  /**
   * パッケージ情報（isPackageがtrueの場合）
   */
  packageInfo?: PackageInfo;
}

// ファイル構造
export interface FileStructure {
  /**
   * ファイル名
   */
  name: string;
  
  /**
   * ファイルの相対パス
   */
  path: string;
  
  /**
   * ファイル内のクラス
   */
  classes: ClassInfo[];
  
  /**
   * ファイル内のインターフェース
   */
  interfaces: InterfaceInfo[];
  
  /**
   * ファイル内の関数
   */
  functions: FunctionInfo[];
  
  /**
   * ファイル内のインポート
   */
  imports: ImportInfo[];
}

// パッケージ情報
export interface PackageInfo {
  /**
   * パッケージ名
   */
  name: string;
  
  /**
   * パッケージのバージョン
   */
  version: string;
  
  /**
   * パッケージの説明
   */
  description?: string;
  
  /**
   * 依存関係
   */
  dependencies?: { [key: string]: string };
}

// クラス情報
export interface ClassInfo {
  /**
   * クラス名
   */
  name: string;
  
  /**
   * エクスポートされているかどうか
   */
  isExported: boolean;
  
  /**
   * クラスのメソッド
   */
  methods: MethodInfo[];
  
  /**
   * クラスのプロパティ
   */
  properties: PropertyInfo[];
  
  /**
   * 継承しているクラス名
   */
  extends?: string;
  
  /**
   * 実装しているインターフェース名
   */
  implements?: string[];
}

// インターフェース情報
export interface InterfaceInfo {
  /**
   * インターフェース名
   */
  name: string;
  
  /**
   * エクスポートされているかどうか
   */
  isExported: boolean;
  
  /**
   * インターフェースのメソッド
   */
  methods: MethodInfo[];
  
  /**
   * インターフェースのプロパティ
   */
  properties: PropertyInfo[];
  
  /**
   * 継承しているインターフェース名
   */
  extends?: string[];
}

// メソッド情報
export interface MethodInfo {
  /**
   * メソッド名
   */
  name: string;
  
  /**
   * 可視性
   */
  visibility: 'public' | 'protected' | 'private';
  
  /**
   * 戻り値の型
   */
  returnType: string;
  
  /**
   * パラメータ
   */
  parameters: ParameterInfo[];
  
  /**
   * 静的メソッドかどうか
   */
  isStatic: boolean;
}

// プロパティ情報
export interface PropertyInfo {
  /**
   * プロパティ名
   */
  name: string;
  
  /**
   * 可視性
   */
  visibility: 'public' | 'protected' | 'private';
  
  /**
   * プロパティの型
   */
  type: string;
  
  /**
   * 静的プロパティかどうか
   */
  isStatic: boolean;
}

// パラメータ情報
export interface ParameterInfo {
  /**
   * パラメータ名
   */
  name: string;
  
  /**
   * パラメータの型
   */
  type: string;
  
  /**
   * デフォルト値があるかどうか
   */
  hasDefaultValue: boolean;
}

// インポート情報
export interface ImportInfo {
  /**
   * インポート元モジュール
   */
  moduleSpecifier: string;
  
  /**
   * インポートされている要素
   */
  namedImports: string[];
  
  /**
   * デフォルトインポート名（存在する場合）
   */
  defaultImport?: string;
}

// 関数情報
export interface FunctionInfo {
  /**
   * 関数名
   */
  name: string;
  
  /**
   * エクスポートされているかどうか
   */
  isExported: boolean;
  
  /**
   * 戻り値の型
   */
  returnType: string;
  
  /**
   * パラメータ
   */
  parameters: ParameterInfo[];
}
