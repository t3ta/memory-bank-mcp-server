import * as path from 'path';
import {
  ProjectStructure,
  DirectoryStructure,
  ClassInfo,
  InterfaceInfo,
  DiagramOptions
} from './types';

/**
 * mermaidダイアグラムを生成するクラス
 */
export class MermaidGenerator {
  /**
   * ディレクトリ構造図を生成
   */
  public generateDirectoryDiagram(structure: ProjectStructure, options: DiagramOptions = { type: 'directory', detailLevel: 'standard' }): string {
    const direction = options.direction || 'TB';
    const lines: string[] = [];
    
    // ダイアグラムヘッダー
    lines.push(`graph ${direction}`);
    
    if (options.title) {
      lines.push(`  %% ${options.title}`);
      lines.push('');
    }
    
    // スタイル定義
    lines.push('  %% スタイル定義');
    lines.push('  classDef package fill:#f9f,stroke:#333,stroke-width:1px;');
    lines.push('  classDef directory fill:#bbf,stroke:#333,stroke-width:1px;');
    lines.push('  classDef file fill:#f9f9f9,stroke:#333,stroke-width:1px;');
    lines.push('');
    
    // ルートディレクトリの処理
    for (const rootDir of structure.rootDirectories) {
      this.processDirectoryForMermaid(rootDir, lines, '', options);
    }
    
    // クラス定義の適用
    lines.push('');
    lines.push('  %% クラス定義の適用');
    lines.push('  class root directory;');
    
    // パッケージに対してpackageクラスを適用
    structure.packagePaths.forEach((packagePath) => {
      const safePackageName = this.sanitizeId(path.basename(packagePath));
      lines.push(`  class ${safePackageName} package;`);
    });
    
    return lines.join('\n');
  }
  
  /**
   * クラス図を生成
   */
  public generateClassDiagram(structure: ProjectStructure, options: DiagramOptions = { type: 'class', detailLevel: 'standard' }): string {
    const lines: string[] = [];
    
    // ダイアグラムヘッダー
    lines.push('classDiagram');
    
    if (options.title) {
      lines.push(`  %% ${options.title}`);
      lines.push('');
    }
    
    // パッケージ毎のクラスとインターフェースを収集
    const classesAndInterfaces = new Map<string, { classes: ClassInfo[], interfaces: InterfaceInfo[] }>();
    
    for (const rootDir of structure.rootDirectories) {
      this.collectClassesAndInterfaces(rootDir, classesAndInterfaces);
    }
    
    // クラスとインターフェースの定義を生成
    classesAndInterfaces.forEach((data, _packageName) => {
      if (data.classes.length > 0 || data.interfaces.length > 0) {
        lines.push(`  %% パッケージ: ${_packageName}`);
        lines.push('');
        
        // インターフェース定義
        for (const interfaceInfo of data.interfaces) {
          this.generateInterfaceDefinition(interfaceInfo, lines, options);
        }
        
        // クラス定義
        for (const classInfo of data.classes) {
          this.generateClassDefinition(classInfo, lines, options);
        }
        
        // 継承・実装関係の定義
        for (const classInfo of data.classes) {
          if (classInfo.extends) {
            lines.push(`  ${this.sanitizeId(classInfo.name)} --|> ${this.sanitizeId(classInfo.extends)}: extends`);
          }
          
          if (classInfo.implements) {
            for (const implementedInterface of classInfo.implements) {
              lines.push(`  ${this.sanitizeId(classInfo.name)} ..|> ${this.sanitizeId(implementedInterface)}: implements`);
            }
          }
        }
        
        // インターフェースの継承関係
        for (const interfaceInfo of data.interfaces) {
          if (interfaceInfo.extends) {
            for (const extendedInterface of interfaceInfo.extends) {
              lines.push(`  ${this.sanitizeId(interfaceInfo.name)} --|> ${this.sanitizeId(extendedInterface)}: extends`);
            }
          }
        }
        
        lines.push('');
      }
    });
    
    return lines.join('\n');
  }
  
  /**
   * 依存関係図を生成
   */
  public generateDependencyDiagram(structure: ProjectStructure, options: DiagramOptions = { type: 'dependency', detailLevel: 'standard' }): string {
    const direction = options.direction || 'TB';
    const lines: string[] = [];
    
    // ダイアグラムヘッダー
    lines.push(`graph ${direction}`);
    
    if (options.title) {
      lines.push(`  %% ${options.title}`);
      lines.push('');
    }
    
    // パッケージの依存関係を収集
    const packageDependencies = new Map<string, Set<string>>();
    
    // パッケージ定義
    structure.packagePaths.forEach((packagePath, _packageName) => {
      const safePackageName = this.sanitizeId(_packageName);
      lines.push(`  ${safePackageName}["${_packageName}"]`);
      packageDependencies.set(_packageName, new Set<string>());
    });
    
    lines.push('');
    
    // パッケージの依存関係を解析
    structure.packagePaths.forEach((packagePath, _packageName) => {
      const packageJsonPath = path.join(packagePath, 'package.json');
      try {
        const packageJson = require(packageJsonPath);
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        for (const dep in dependencies) {
          // 同じプロジェクト内のパッケージへの依存関係のみ表示
          if (structure.packagePaths.has(dep)) {
            const deps = packageDependencies.get(_packageName);
            if (deps) {
              deps.add(dep);
            }
          }
        }
      } catch {
        // package.jsonが読めない場合は無視
      }
    });
    
    // 依存関係の矢印を追加
    packageDependencies.forEach((deps, _packageName) => {
      const safePackageName = this.sanitizeId(_packageName);
      
      deps.forEach(dep => {
        const safeDepName = this.sanitizeId(dep);
        lines.push(`  ${safePackageName} --> ${safeDepName}`);
      });
    });
    
    // スタイルを設定
    lines.push('');
    lines.push('  %% スタイル定義');
    lines.push('  classDef package fill:#f9f,stroke:#333,stroke-width:1px;');
    
    // クラス定義の適用
    lines.push('');
    lines.push('  %% クラス定義の適用');
    structure.packagePaths.forEach((packagePath, _packageName) => {
      const safePackageName = this.sanitizeId(_packageName);
      lines.push(`  class ${safePackageName} package;`);
    });
    
    return lines.join('\n');
  }
  
  /**
   * ディレクトリをmermaid用に処理
   */
  private processDirectoryForMermaid(dir: DirectoryStructure, lines: string[], parentId: string, options: DiagramOptions): string {
    const dirId = parentId ? `${parentId}_${this.sanitizeId(dir.name)}` : this.sanitizeId(dir.name);
    
    // ディレクトリノードの定義
    if (dir.isPackage) {
      const packageName = dir.packageInfo?.name || dir.name;
      lines.push(`  ${dirId}["📦 ${packageName}"]`);
    } else {
      lines.push(`  ${dirId}["📁 ${dir.name}"]`);
    }
    
    // サブディレクトリの処理
    if (dir.subdirectories && dir.subdirectories.length > 0) {
      for (const subdir of dir.subdirectories) {
        const subdirId = this.processDirectoryForMermaid(subdir, lines, dirId, options);
        lines.push(`  ${dirId} --> ${subdirId}`);
      }
    }
    
    // 詳細レベルが 'standard' または 'full' の場合はファイルも表示
    if (options.detailLevel === 'standard' || options.detailLevel === 'full') {
      for (const file of dir.files) {
        const fileId = `${dirId}_${this.sanitizeId(file.name)}`;
        lines.push(`  ${fileId}["📄 ${file.name}"]`);
        lines.push(`  ${dirId} --> ${fileId}`);
        
        // ファイルクラスを適用
        lines.push(`  class ${fileId} file;`);
      }
    }
    
    // ディレクトリクラスを適用
    if (dir.isPackage) {
      lines.push(`  class ${dirId} package;`);
    } else {
      lines.push(`  class ${dirId} directory;`);
    }
    
    return dirId;
  }
  
  /**
   * クラスとインターフェースを収集
   */
  private collectClassesAndInterfaces(
    dir: DirectoryStructure, 
    result: Map<string, { classes: ClassInfo[], interfaces: InterfaceInfo[] }>
  ): void {
    const packageName = dir.isPackage ? (dir.packageInfo?.name || dir.name) : '';
    
    if (dir.isPackage) {
      // 新しいパッケージを追加
      if (!result.has(packageName)) {
        result.set(packageName, { classes: [], interfaces: [] });
      }
    }
    
    // ファイル内のクラスとインターフェースを収集
    if (dir.files && dir.files.length > 0) {
      for (const file of dir.files) {
        if (file.classes && file.classes.length > 0) {
          for (const classInfo of file.classes) {
            if (classInfo.isExported && dir.isPackage) {
              const packageData = result.get(packageName);
              if (packageData) {
                packageData.classes.push(classInfo);
              }
            }
          }
        }
        
        if (file.interfaces && file.interfaces.length > 0) {
          for (const interfaceInfo of file.interfaces) {
            if (interfaceInfo.isExported && dir.isPackage) {
              const packageData = result.get(packageName);
              if (packageData) {
                packageData.interfaces.push(interfaceInfo);
              }
            }
          }
        }
      }
    }
    
    // サブディレクトリを再帰的に処理
    if (dir.subdirectories && dir.subdirectories.length > 0) {
      for (const subdir of dir.subdirectories) {
        this.collectClassesAndInterfaces(subdir, result);
      }
    }
  }
  
  /**
   * クラス定義を生成
   */
  private generateClassDefinition(classInfo: ClassInfo, lines: string[], options: DiagramOptions): void {
    lines.push(`  class ${this.sanitizeId(classInfo.name)} {`);
    
    // 詳細レベルに応じてメンバーを表示
    if (options.detailLevel === 'standard' || options.detailLevel === 'full') {
      // プロパティを表示
      for (const prop of classInfo.properties) {
        const visibilitySymbol = this.getVisibilitySymbol(prop.visibility);
        const staticPrefix = prop.isStatic ? '$' : '';
        lines.push(`    ${visibilitySymbol}${staticPrefix}${prop.name}: ${this.simplifyType(prop.type)}`);
      }
      
      // メソッドを表示
      for (const method of classInfo.methods) {
        const visibilitySymbol = this.getVisibilitySymbol(method.visibility);
        const staticPrefix = method.isStatic ? '$' : '';
        
        if (options.detailLevel === 'full') {
          // 詳細レベルが 'full' の場合はパラメータも表示
          const params = method.parameters.map(param => `${param.name}: ${this.simplifyType(param.type)}`).join(', ');
          lines.push(`    ${visibilitySymbol}${staticPrefix}${method.name}(${params}): ${this.simplifyType(method.returnType)}`);
        } else {
          // 詳細レベルが 'standard' の場合はメソッド名のみ表示
          lines.push(`    ${visibilitySymbol}${staticPrefix}${method.name}()`);
        }
      }
    }
    
    lines.push('  }');
  }
  
  /**
   * インターフェース定義を生成
   */
  private generateInterfaceDefinition(interfaceInfo: InterfaceInfo, lines: string[], options: DiagramOptions): void {
    lines.push(`  class ${this.sanitizeId(interfaceInfo.name)} {`);
    lines.push('    <<interface>>');
    
    // 詳細レベルに応じてメンバーを表示
    if (options.detailLevel === 'standard' || options.detailLevel === 'full') {
      // プロパティを表示
      for (const prop of interfaceInfo.properties) {
        lines.push(`    +${prop.name}: ${this.simplifyType(prop.type)}`);
      }
      
      // メソッドを表示
      for (const method of interfaceInfo.methods) {
        if (options.detailLevel === 'full') {
          // 詳細レベルが 'full' の場合はパラメータも表示
          const params = method.parameters.map(param => `${param.name}: ${this.simplifyType(param.type)}`).join(', ');
          lines.push(`    +${method.name}(${params}): ${this.simplifyType(method.returnType)}`);
        } else {
          // 詳細レベルが 'standard' の場合はメソッド名のみ表示
          lines.push(`    +${method.name}()`);
        }
      }
    }
    
    lines.push('  }');
  }
  
  /**
   * 可視性記号を取得
   */
  private getVisibilitySymbol(visibility: string): string {
    switch (visibility) {
      case 'public': return '+';
      case 'protected': return '#';
      case 'private': return '-';
      default: return '+';
    }
  }
  
  /**
   * 型名を簡略化
   */
  private simplifyType(type: string): string {
    // 長すぎる型は簡略化
    if (type.length > 30) {
      return type.substring(0, 27) + '...';
    }
    
    return type;
  }
  
  /**
   * IDを安全な形式に変換
   */
  private sanitizeId(id: string): string {
    // mermaidでIDとして使える形式に変換
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }
}