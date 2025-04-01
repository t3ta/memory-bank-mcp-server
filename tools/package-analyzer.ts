import { Project, SourceFile, ClassDeclaration, InterfaceDeclaration, FunctionDeclaration, ImportDeclaration } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import {
  AnalyzeOptions,
  ProjectStructure,
  DirectoryStructure,
  FileStructure,
  ClassInfo,
  InterfaceInfo,
  FunctionInfo,
  MethodInfo,
  PropertyInfo,
  ParameterInfo,
  ImportInfo,
  PackageInfo
} from './types';

/**
 * パッケージ構造を解析するクラス
 */
export class PackageAnalyzer {
  private defaultOptions: AnalyzeOptions = {
    depth: 'basic',
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts'],
    include: ['**/*.ts', '**/*.tsx']
  };

  /**
   * プロジェクト全体を解析し、構造情報を取得
   */
  public analyzeProject(projectPath: string, options: AnalyzeOptions = {}): ProjectStructure {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const project = new Project();
    
    // 指定されたプロジェクトのファイルを追加
    const includePatterns = mergedOptions.include || [];
    const fullPaths = includePatterns.map(pattern => path.join(projectPath, pattern));
    
    console.log(`解析対象パス: ${projectPath}`);
    console.log(`解析対象パターン: ${fullPaths.join(', ')}`);
    
    try {
      project.addSourceFilesAtPaths(fullPaths);
      console.log(`ファイル数: ${project.getSourceFiles().length}`);
    } catch (error) {
      console.error(`ファイル追加エラー: ${error}`);
    }
    
    // パッケージパスのマップを作成
    const packagePaths = new Map<string, string>();
    const packagesDir = path.join(projectPath, 'packages');
    
    if (fs.existsSync(packagesDir)) {
      const packageDirs = fs.readdirSync(packagesDir);
      
      for (const packageName of packageDirs) {
        const packagePath = path.join(packagesDir, packageName);
        if (fs.statSync(packagePath).isDirectory()) {
          // package.jsonがあるかチェック
          const packageJsonPath = path.join(packagePath, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
              packagePaths.set(packageJson.name, packagePath);
            } catch (e) {
              console.error(`Invalid package.json in ${packagePath}`);
            }
          }
        }
      }
    }
    
    // プロジェクト構造を解析
    const rootDirectories: DirectoryStructure[] = [];
    
    // packagesディレクトリを特別に処理
    if (fs.existsSync(packagesDir)) {
      console.log(`パッケージディレクトリ存在確認: ${packagesDir} - 存在します`);
      const packageDirs = fs.readdirSync(packagesDir);
      console.log(`パッケージディレクトリ内コンテンツ: ${packageDirs.join(', ')}`);
      
      // 各パッケージディレクトリを解析
      for (const packageName of packageDirs) {
        const packagePath = path.join(packagesDir, packageName);
        console.log(`パッケージパス確認: ${packagePath}`);
        
        if (fs.statSync(packagePath).isDirectory()) {
          console.log(`パッケージディレクトリ解析: ${packageName}`);
          rootDirectories.push(
            this.analyzeDirectoryPath(packagePath, project, mergedOptions)
          );
        } else {
          console.log(`ディレクトリではないのでスキップ: ${packageName}`);
        }
      }
    } else {
      console.log(`パッケージディレクトリは存在しません: ${packagesDir}`);
    }
    
    return {
      name: path.basename(projectPath),
      rootDirectories,
      packagePaths,
      configuration: mergedOptions
    };
  }
  
  /**
   * ディレクトリを解析し、構造情報を取得（パスで指定版）
   */
  public analyzeDirectoryPath(dirPath: string, project: Project, options: AnalyzeOptions): DirectoryStructure {
    const dirName = path.basename(dirPath);
    const files: FileStructure[] = [];
    const subdirectories: DirectoryStructure[] = [];
    
    // ディレクトリがパッケージかどうかを判定
    let isPackage = false;
    let packageInfo: PackageInfo | undefined;
    
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        isPackage = true;
        packageInfo = {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description,
          dependencies: packageJson.dependencies
        };
      } catch (e) {
        console.error(`Invalid package.json in ${dirPath}`);
      }
    }
    
    // ファイルを解析
    // ts-morphのフィルタリングはパターンでしか受け付けないので、全ファイル取得して後でフィルタリング
    const allSourceFiles = project.getSourceFiles();
    const sourceFiles = allSourceFiles.filter(f => f.getFilePath().startsWith(dirPath));
    for (const sourceFile of sourceFiles) {
      // 除外パターンにマッチするかチェック
      if (options.exclude && options.exclude.some(pattern => {
        return new RegExp(pattern.replace(/\*/g, '.*')).test(sourceFile.getFilePath());
      })) {
        continue;
      }
      
      files.push(this.analyzeSourceFile(sourceFile, options));
    }
    
    // サブディレクトリを解析
    const subdirEntries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of subdirEntries) {
      if (entry.isDirectory()) {
        const subdirPath = path.join(dirPath, entry.name);
        const subdirName = entry.name;
        
        // node_modules等の除外
        if (subdirName === 'node_modules' || 
            subdirName === 'dist' || 
            subdirName === 'build') {
          continue;
        }
        
        subdirectories.push(this.analyzeDirectoryPath(subdirPath, project, options));
      }
    }
    
    return {
      name: dirName,
      path: dirPath,
      files,
      subdirectories,
      isPackage,
      packageInfo
    };
  }
  
  /**
   * ソースファイルを解析し、構造情報を取得
   */
  public analyzeSourceFile(sourceFile: SourceFile, options: AnalyzeOptions): FileStructure {
    const filePath = sourceFile.getFilePath();
    const fileName = path.basename(filePath);
    
    const classes: ClassInfo[] = [];
    const interfaces: InterfaceInfo[] = [];
    const functions: FunctionInfo[] = [];
    const imports: ImportInfo[] = [];
    
    // クラスを解析
    for (const classDeclaration of sourceFile.getClasses()) {
      classes.push(this.analyzeClass(classDeclaration));
    }
    
    // インターフェースを解析
    for (const interfaceDeclaration of sourceFile.getInterfaces()) {
      interfaces.push(this.analyzeInterface(interfaceDeclaration));
    }
    
    // 関数を解析
    for (const functionDeclaration of sourceFile.getFunctions()) {
      functions.push(this.analyzeFunction(functionDeclaration));
    }
    
    // インポートを解析
    for (const importDeclaration of sourceFile.getImportDeclarations()) {
      imports.push(this.analyzeImport(importDeclaration));
    }
    
    return {
      name: fileName,
      path: filePath,
      classes,
      interfaces,
      functions,
      imports
    };
  }
  
  /**
   * クラスを解析し、情報を取得
   */
  private analyzeClass(classDeclaration: ClassDeclaration): ClassInfo {
    const methods: MethodInfo[] = [];
    const properties: PropertyInfo[] = [];
    
    // メソッドを解析
    for (const methodDeclaration of classDeclaration.getMethods()) {
      const parameters: ParameterInfo[] = [];
      
      for (const param of methodDeclaration.getParameters()) {
        parameters.push({
          name: param.getName() || `param${parameters.length}`,
          type: param.getType().getText(),
          hasDefaultValue: param.isOptional()
        });
      }
      
      methods.push({
        name: methodDeclaration.getName() || 'unnamed',
        visibility: (methodDeclaration.hasModifier('private') ? 'private' : 
                     methodDeclaration.hasModifier('protected') ? 'protected' : 'public'),
        returnType: methodDeclaration.getReturnType().getText(),
        parameters,
        isStatic: methodDeclaration.isStatic()
      });
    }
    
    // プロパティを解析
    for (const propertyDeclaration of classDeclaration.getProperties()) {
      properties.push({
        name: propertyDeclaration.getName() || 'unnamed',
        visibility: (propertyDeclaration.hasModifier('private') ? 'private' : 
                     propertyDeclaration.hasModifier('protected') ? 'protected' : 'public'),
        type: propertyDeclaration.getType().getText(),
        isStatic: propertyDeclaration.isStatic()
      });
    }
    
    // 継承クラスの取得
    const extendsClause = classDeclaration.getExtends();
    const extendedClass: string | undefined = extendsClause ? extendsClause.getText() : undefined;
    
    // 実装インターフェースの取得
    const implementsClause = classDeclaration.getImplements();
    const implementedInterfaces: string[] = implementsClause.map(impl => impl.getText());
    
    return {
      name: classDeclaration.getName() || 'UnnamedClass',
      isExported: classDeclaration.isExported(),
      methods,
      properties,
      extends: extendedClass,
      implements: implementedInterfaces.length > 0 ? implementedInterfaces : undefined
    };
  }
  
  /**
   * インターフェースを解析し、情報を取得
   */
  private analyzeInterface(interfaceDeclaration: InterfaceDeclaration): InterfaceInfo {
    const methods: MethodInfo[] = [];
    const properties: PropertyInfo[] = [];
    
    // メソッドを解析
    for (const methodDeclaration of interfaceDeclaration.getMethods()) {
      const parameters: ParameterInfo[] = [];
      
      for (const param of methodDeclaration.getParameters()) {
        parameters.push({
          name: param.getName() || `param${parameters.length}`,
          type: param.getType().getText(),
          hasDefaultValue: param.isOptional()
        });
      }
      
      methods.push({
        name: methodDeclaration.getName() || 'unnamed',
        visibility: 'public', // インターフェースのメソッドは常にpublic
        returnType: methodDeclaration.getReturnType().getText(),
        parameters,
        isStatic: false // インターフェースのメソッドは静的ではない
      });
    }
    
    // プロパティを解析
    for (const propertySignature of interfaceDeclaration.getProperties()) {
      properties.push({
        name: propertySignature.getName() || 'unnamed',
        visibility: 'public', // インターフェースのプロパティは常にpublic
        type: propertySignature.getType().getText(),
        isStatic: false // インターフェースのプロパティは静的ではない
      });
    }
    
    // 継承インターフェースの取得
    const extendsExpressions = interfaceDeclaration.getExtends();
    const extendedInterfaces: string[] = extendsExpressions.map(expr => expr.getText());
    
    return {
      name: interfaceDeclaration.getName() || 'UnnamedInterface',
      isExported: interfaceDeclaration.isExported(),
      methods,
      properties,
      extends: extendedInterfaces.length > 0 ? extendedInterfaces : undefined
    };
  }
  
  /**
   * 関数を解析し、情報を取得
   */
  private analyzeFunction(functionDeclaration: FunctionDeclaration): FunctionInfo {
    const parameters: ParameterInfo[] = [];
    
    for (const param of functionDeclaration.getParameters()) {
      parameters.push({
        name: param.getName() || `param${parameters.length}`,
        type: param.getType().getText(),
        hasDefaultValue: param.isOptional()
      });
    }
    
    return {
      name: functionDeclaration.getName() || 'UnnamedFunction',
      isExported: functionDeclaration.isExported(),
      returnType: functionDeclaration.getReturnType().getText(),
      parameters
    };
  }
  
  /**
   * インポートを解析し、情報を取得
   */
  private analyzeImport(importDeclaration: ImportDeclaration): ImportInfo {
    const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
    const namedImports = importDeclaration.getNamedImports().map(namedImport => namedImport.getName());
    const defaultImport = importDeclaration.getDefaultImport()?.getText();
    
    return {
      moduleSpecifier,
      namedImports,
      defaultImport
    };
  }
}