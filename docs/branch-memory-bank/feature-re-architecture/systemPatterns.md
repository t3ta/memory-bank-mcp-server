# システムパターン

## 技術的決定事項

### 既存マネージャークラスとmodelsディレクトリの削除

#### コンテキスト
新しいクリーンアーキテクチャへの移行が進み、旧マネージャークラス（BaseMemoryBank, BranchMemoryBank, GlobalMemoryBank, WorkspaceManager）と古い型定義ファイル（models/types.ts）が不要になりました。これらのファイルは既に新しいアーキテクチャの実装に置き換えられており、参照されていません。

#### 決定事項
不要になった旧マネージャークラスとmodels/types.tsを削除し、index.tsでの型定義インポートパスをshared/types/index.tsに修正します。これにより、コードベースがクリーンになり、メンテナンス性が向上します。

#### 影響
- コードベースがよりクリーンになり、混乱が減少する
- 不要なコードの削除により、理解しやすくなる
- 型定義の一元管理によりコードの一貫性が向上する
- 新しいアーキテクチャへの完全移行に近づいた

### リポジトリパターンの採用

#### コンテキスト
現在の実装はデータアクセスのロジックが各マネージャークラスに分散しています。

#### 決定事項
リポジトリパターンを採用し、データアクセスを抽象化します：

1. リポジトリインターフェースをドメイン層に定義
2. 具体的な実装はインフラストラクチャ層に配置
3. ドメインエンティティとデータモデルのマッピングを行う

#### 影響
- データアクセスロジックの一元化
- ストレージメカニズムの変更が容易になる
- テスト時にデータストアをモックに置き換えやすくなる

### 依存性注入の導入

#### コンテキスト
現在のコードはクラス間の依存関係が直接的で、テストや拡張が難しい状態です。

#### 決定事項
依存性注入パターンを採用し、以下を実装します：

1. インターフェースを介した依存関係の定義
2. 実装クラスの外部からの注入
3. テスト時にモックオブジェクトを注入可能な構造

#### 影響
- モジュール間の結合度が低くなる
- テストの際にモックオブジェクトを注入しやすくなる
- 依存関係が明示的になり、コードの理解が容易になる
- 新しい実装への置き換えが容易になる

### クリーンアーキテクチャの採用

#### コンテキスト
現在のコードベースは、責任の分離が不明確で、依存関係が複雑に絡み合っています。これにより、コードの変更やテストが難しくなっています。

#### 決定事項
クリーンアーキテクチャパターンを採用し、以下の層に分割します：

1. **ドメイン層（Entities, Use Cases）**
   - コアのビジネスロジックと規則
   - エンティティとバリューオブジェクト
   - ドメインサービス

2. **アプリケーション層（Use Cases）**
   - ユースケース実装
   - 入力検証とエラーハンドリング
   - ドメイン層の調整

3. **インターフェース適応層（Interface Adapters）**
   - リポジトリの実装
   - コントローラー
   - プレゼンター

4. **フレームワークと外部層（Frameworks & Drivers）**
   - データベース
   - フレームワーク
   - 外部APIとの統合

#### 影響
- 依存関係の方向が明確になり、内側のレイヤーは外側のレイヤーに依存しなくなる
- テスト容易性が向上する
- 変更の影響範囲が限定される
- コードの理解がしやすくなる

### CoreFiles関連のユースケース実装

#### コンテキスト
メモリバンクのコアファイル（activeContext, progress, systemPatterns）を一括して読み書きする機能が必要です。現状はコントローラー内にロジックが実装されており、フォーマットの変換やエラーハンドリングが分散しています。

#### 決定事項
ReadBranchCoreFilesUseCaseとCreateBranchCoreFilesUseCaseを実装し、コアファイルの一括読み書き機能を提供しました。コアファイルのデータ構造をCoreFilesDTOとして定義し、型安全な操作を可能にしました。BranchControllerを更新して読み書き周りのロジックをユースケースに移動しました。

#### 影響
- コアファイルの読み書きが統一されたインターフェースで行える
- 複数ファイルの一括処理が可能になる
- 構造化されたデータの検証と変換が一貫して行える
- クライアント側での処理が簡素化される
- テストの実装が容易になる
- 既存のインターフェースとの互換性を維持するための追加ロジックが必要

### グローバルメモリバンクのドキュメント充実化

#### コンテキスト
新しいアーキテクチャへの移行に伴い、グローバルメモリバンクのドキュメントを充実させる必要がある。特に技術スタックに関する情報が不足している。

#### 決定事項
tech-stack.mdを詳細な情報で更新し、プロジェクトで使用している技術、ライブラリ、ツールについての明確な情報を提供する。情報は分類ごとに整理し、バージョンや使用目的も含める。

#### 影響
- 開発者が使用している技術について明確な理解が得られる
- 新規参入者が技術スタックを素早く把握できる
- 依存関係の管理が容易になる
- アーキテクチャに関連する技術の全体像が明確になる

### タグ検索のユースケース実装

#### コンテキスト
タグを使ってドキュメントを検索する機能が必要です。これはグローバルとブランチの両方のメモリバンクで使用されます。

#### 決定事項
既存のリポジトリインターフェースに定義されているfindDocumentsByTagsメソッドを利用し、SearchDocumentsByTagsUseCaseを実装しました。このユースケースは、ブランチ名が指定されている場合はブランチリポジトリを、指定されていない場合はグローバルリポジトリを使用します。また、「すべてのタグに一致」または「いずれかのタグに一致」という検索モードをサポートしています。

#### 影響
- グローバルとブランチで同じロジックを再利用できる
- 染み分けされた実装で保守性が高まる
- タグ検索機能の柔軟性が向上する
- 未実装だった機能が実装された

### タグインデックスの管理ユースケース

#### コンテキスト
タグ検索を効率的に行うためにタグインデックスを管理する必要があります。

#### 決定事項
UpdateTagIndexUseCaseを実装し、すべてのドキュメントからタグを収集して一位置に集約する機能を提供しました。完全な再構築または差分更新が選択可能で、グローバルまたは特定のブランチに対して実行できます。現時点では実際のインデックスの永続化は行わず、収集したタグ情報だけを返します。

#### 影響
- タグ情報の収集と表示が可能になる
- 実際のインデックス永続化は将来の実装課題として残っている
- パフォーマンス改善の準備が整った

### リセントブランチを取得するユースケース

#### コンテキスト
開発者に最近のブランチ情報を提供し、続きやすいようにする機能が必要です。

#### 決定事項
GetRecentBranchesUseCaseを実装し、最近更新されたブランチの一覧とその要約情報を取得する機能を提供しました。返却件数を制限するオプションがあり、各ブランチの現在の作業状況や最近の変更点などの情報も含まれます。

#### 影響
- ユーザーが最近のブランチに素早くアクセスできるようになる
- ブランチの作業状況の可視化が向上する
- ワークフローの改善が期待できる
- 以前は未実装だった機能が実装された

### CoreFiles関連のユースケース実装

#### コンテキスト
メモリバンクのコアファイル（activeContext, progress, systemPatterns）を一括して読み書きする機能が必要です。現状はコントローラー内にロジックが実装されており、フォーマットの変換やエラーハンドリングが分散しています。

#### 決定事項
ReadBranchCoreFilesUseCaseとCreateBranchCoreFilesUseCaseを実装し、コアファイルの一括読み書き機能を提供しました。コアファイルのデータ構造をCoreFilesDTOとして定義し、型安全な操作を可能にしました。BranchControllerを更新して読み書き周りのロジックをユースケースに移動しました。

#### 影響
- コアファイルの読み書きが統一されたインターフェースで行える
- 複数ファイルの一括処理が可能になる
- 構造化されたデータの検証と変換が一貫して行える
- クライアント側での処理が簡素化される
- テストの実装が容易になる
- 既存のインターフェースとの互換性を維持するための追加ロジックが必要

### コアファイル関連のユースケース実装

#### コンテキスト
メモリバンクのコアファイル（activeContext, progress, systemPatterns）を一括して読み書きする機能が必要です。

#### 決定事項
ReadBranchCoreFilesUseCaseとCreateBranchCoreFilesUseCaseを実装し、コアファイルの一括読み書き機能を提供します。これらのユースケースは他のドキュメント読み書きユースケースと連携し、標準化されたインターフェースで操作できるようにします。

#### 影響
- コアファイルの読み書きが統一されたインターフェースで行える
- 複数ファイルの一括処理が可能になる
- 構造化されたデータの検証と変換が一貫して行える
- クライアント側での処理が簡素化される

### リセントブランチを取得するユースケース

#### コンテキスト
開発者に最近のブランチ情報を提供し、続きやすいようにする機能が必要です。

#### 決定事項
GetRecentBranchesUseCaseを実装し、最近更新されたブランチの一覧とその要約情報を取得する機能を提供しました。返却件数を制限するオプションがあり、各ブランチの現在の作業状況や最近の変更点などの情報も含まれます。

#### 影響
- ユーザーが最近のブランチに素早くアクセスできるようになる
- ブランチの作業状況の可視化が向上する
- ワークフローの改善が期待できる
- 以前は未実装だった機能が実装された

### タグインデックスの管理ユースケース

#### コンテキスト
タグ検索を効率的に行うためにタグインデックスを管理する必要があります。

#### 決定事項
UpdateTagIndexUseCaseを実装し、すべてのドキュメントからタグを収集して一位置に集約する機能を提供しました。完全な再構築または差分更新が選択可能で、グローバルまたは特定のブランチに対して実行できます。現時点では実際のインデックスの永続化は行わず、収集したタグ情報だけを返します。

#### 影響
- タグ情報の収集と表示が可能になる
- 実際のインデックス永続化は将来の実装課題として残っている
- パフォーマンス改善の準備が整った

### タグ検索のユースケース実装

#### コンテキスト
タグを使ってドキュメントを検索する機能が必要です。これはグローバルとブランチの両方のメモリバンクで使用されます。

#### 決定事項
既存のリポジトリインターフェースに定義されているfindDocumentsByTagsメソッドを利用し、SearchDocumentsByTagsUseCaseを実装しました。このユースケースは、ブランチ名が指定されている場合はブランチリポジトリを、指定されていない場合はグローバルリポジトリを使用します。また、「すべてのタグに一致」または「いずれかのタグに一致」という検索モードをサポートしています。

#### 影響
- グローバルとブランチで同じロジックを再利用できる
- 染み分けされた実装で保守性が高まる
- タグ検索機能の柔軟性が向上する
- 未実装だった機能が実装された

### タグインデックスの設計

#### コンテキスト
タグベースの検索を効率的に行うためのインデックス構造が必要です。

#### 決定事項
タグを文書へのマッピングを管理するインデックス構造を実装します。インデックスはメモリ上でハッシュマップとして保持し、永続化は定期的にファイルに保存することで行います。

#### 影響
- タグベースの検索パフォーマンスの向上
- メモリ使用量の増加
- 定期的な永続化が必要

### ユースケースの実装パターン

#### コンテキスト
ビジネスロジックをクリーンで一貫性のある方法で実装する必要があります。

#### 決定事項
各ユースケースは独立したクラスとして実装し、IUseCaseインターフェースを実装します。入力と出力は明示的なDTOとして定義し、エラーハンドリングは統一的なパターンで行います。

#### 影響
- ビジネスロジックの明確な分離
- テスト容易性の向上
- 使用方法の一貫性
- 依存関係の明示

### シンプルなDIコンテナの実装

#### コンテキスト
依存性注入を効率的に行うための仕組みが必要です。

#### 決定事項
シンプルなDIContainer実装を作成し、サービスの登録・解決・管理を行います。Factory関数による遅延初期化もサポートし、必要に応じてサービスを生成できるようにします。このアプローチにより、複雑な外部DIライブラリを使わずに依存性注入を実現します。

#### 影響
- 依存関係の明示的な管理が可能になる
- テスト時にサービスをモックに置き換えやすくなる
- アプリケーション初期化フローの制御が容易になる
- 循環参照の問題を検出しやすくなる

### シンプルなDIコンテナの実装

#### コンテキスト
依存性注入を効率的に行うための仕組みが必要です。

#### 決定事項
シンプルなDIContainer実装を作成し、サービスの登録・解決・管理を行います。Factory関数による遅延初期化もサポートし、必要に応じてサービスを生成できるようにします。このアプローチにより、複雑な外部DIライブラリを使わずに依存性注入を実現します。

#### 影響
- 依存関係の明示的な管理が可能になる
- テスト時にサービスをモックに置き換えやすくなる
- アプリケーション初期化フローの制御が容易になる
- 循環参照の問題を検出しやすくなる

### MCPレスポンス形式の標準化

#### コンテキスト
クライアントへのレスポンス形式が統一されておらず、エラー処理も一貫していません。

#### 決定事項
MCPResponseインターフェースを定義し、成功レスポンスとエラーレスポンスのフォーマットを標準化します。MCPResponsePresenterがアプリケーションの出力をこの標準形式に変換します。これにより、クライアントは一貫した形式でレスポンスを処理できるようになります。

#### 影響
- レスポンス形式の一貫性が確保される
- エラー情報が適切に構造化される
- クライアント側の処理が簡素化される
- APIの使いやすさが向上する

### コンフィグレーション管理の一元化

#### コンテキスト
設定値やパス解決の処理が複数のクラスに散在しています。

#### 決定事項
IConfigProviderインターフェースを定義し、ConfigProviderで一元的に設定値を管理します。環境変数、コマンドライン引数、デフォルト値の優先順位を明確にし、パス解決や言語設定なども統一的に提供します。

#### 影響
- 設定値の管理が一元化される
- テスト時に設定を差し替えやすくなる
- 設定値の取得方法が統一される
- 環境依存の問題を特定しやすくなる

### ファイルシステム抽象化

#### コンテキスト
現在のコードはファイルシステム操作を直接行っており、テストやモック化が難しい状態です。

#### 決定事項
ファイルシステム操作をIFileSystemServiceインターフェースにより抽象化し、具体的な実装はFileSystemServiceクラスに隠蔽します。この抽象化により、テスト時にモックファイルシステムに差し替えやすくなります。

#### 影響
- ファイルシステム操作の標準化
- テスト時にファイルシステムをモックに置き換え可能
- エラーハンドリングの一元化
- 将来的に異なるストレージ実装への切り替えが容易

### 統一的なエラーハンドリング

#### コンテキスト
現在のエラーハンドリングは一貫性がなく、クライアントへのフィードバックも限定的です。

#### 決定事項
以下の原則に基づいたエラーハンドリングメカニズムを導入します：1. 専用のエラークラス階層を作成、2. ドメイン固有のエラーとシステムエラーを分離、3. エラーコードとメッセージの標準化、4. ユーザーフレンドリーなエラーメッセージの提供

#### 影響
- エラーハンドリングが一貫性を持つ
- クライアントへより有用なフィードバックを提供できる
- デバッグが容易になる

### ドメインモデルの再設計

#### コンテキスト
現在のコードベースでは、データモデルとビジネスロジックが明確に分離されていません。

#### 決定事項
リッチなドメインモデルを採用し、ビジネスロジックをエンティティに封じ込めます：1. メモリバンク関連の核となるエンティティを識別（MemoryDocument、GlobalMemoryBank、BranchMemoryBank、Tag、ブランチ情報）、2. バリューオブジェクトとして扱うべき不変な概念を識別（DocumentPath、DocumentContent、DocumentMetadata）、3. ドメインサービスとして切り出すべき機能を識別（文書検証サービス、タグ管理サービス）

#### 影響
- ビジネスルールがドメインエンティティに封じ込められる
- ドメインの概念が明確になり、コードの意図が理解しやすくなる
- 変更に強いコードベースになる

### リポジトリパターンの採用

#### コンテキスト
現在の実装はデータアクセスのロジックが各マネージャークラスに分散しています。

#### 決定事項
リポジトリパターンを採用し、データアクセスを抽象化します：1. リポジトリインターフェースをドメイン層に定義、2. 具体的な実装はインフラストラクチャ層に配置、3. ドメインエンティティとデータモデルのマッピングを行う

#### 影響
- データアクセスロジックの一元化
- ストレージメカニズムの変更が容易になる
- テスト時にデータストアをモックに置き換えやすくなる

### 依存性注入の導入

#### コンテキスト
現在のコードはクラス間の依存関係が直接的で、テストや拡張が難しい状態です。

#### 決定事項
依存性注入パターンを採用し、以下を実装します：1. インターフェースを介した依存関係の定義、2. 実装クラスの外部からの注入、3. テスト時にモックオブジェクトを注入可能な構造

#### 影響
- モジュール間の結合度が低くなる
- テストの際にモックオブジェクトを注入しやすくなる
- 依存関係が明示的になり、コードの理解が容易になる
- 新しい実装への置き換えが容易になる

### クリーンアーキテクチャの採用

#### コンテキスト
現在のコードベースは、責任の分離が不明確で、依存関係が複雑に絡み合っています。これにより、コードの変更やテストが難しくなっています。

#### 決定事項
クリーンアーキテクチャパターンを採用し、以下の層に分割します：1. ドメイン層（Entities, Use Cases） - コアのビジネスロジックと規則、エンティティとバリューオブジェクト、ドメインサービス、2. アプリケーション層（Use Cases） - ユースケース実装、入力検証とエラーハンドリング、ドメイン層の調整、3. インターフェース適応層（Interface Adapters） - リポジトリの実装、コントローラー、プレゼンター、4. フレームワークと外部層（Frameworks & Drivers） - データベース、フレームワーク、外部APIとの統合

#### 影響
- 依存関係の方向が明確になり、内側のレイヤーは外側のレイヤーに依存しなくなる
- テスト容易性が向上する
- 変更の影響範囲が限定される
- コードの理解がしやすくなる

### コンフィグレーション管理の一元化

#### コンテキスト
設定値やパス解決の処理が複数のクラスに散在しています。

#### 決定事項
IConfigProviderインターフェースを定義し、ConfigProviderで一元的に設定値を管理します。環境変数、コマンドライン引数、デフォルト値の優先順位を明確にし、パス解決や言語設定なども統一的に提供します。

#### 影響
- 設定値の管理が一元化される
- テスト時に設定を差し替えやすくなる
- 設定値の取得方法が統一される
- 環境依存の問題を特定しやすくなる

### ファイルシステム抽象化

#### コンテキスト
現在のコードはファイルシステム操作を直接行っており、テストやモック化が難しい状態です。

#### 決定事項
ファイルシステム操作をIFileSystemServiceインターフェースにより抽象化し、具体的な実装はFileSystemServiceクラスに隠蔽します。この抽象化により、テスト時にモックファイルシステムに差し替えやすくなります。

#### 影響
- ファイルシステム操作の標準化
- テスト時にファイルシステムをモックに置き換え可能
- エラーハンドリングの一元化
- 将来的に異なるストレージ実装への切り替えが容易

### 統一的なエラーハンドリング

#### コンテキスト
現在のエラーハンドリングは一貫性がなく、クライアントへのフィードバックも限定的です。

#### 決定事項
以下の原則に基づいたエラーハンドリングメカニズムを導入します：1. 専用のエラークラス階層を作成、2. ドメイン固有のエラーとシステムエラーを分離、3. エラーコードとメッセージの標準化、4. ユーザーフレンドリーなエラーメッセージの提供

#### 影響
- エラーハンドリングが一貫性を持つ
- クライアントへより有用なフィードバックを提供できる
- デバッグが容易になる

### ドメインモデルの再設計

#### コンテキスト
現在のコードベースでは、データモデルとビジネスロジックが明確に分離されていません。

#### 決定事項
リッチなドメインモデルを採用し、ビジネスロジックをエンティティに封じ込めます：1. メモリバンク関連の核となるエンティティを識別（MemoryDocument、GlobalMemoryBank、BranchMemoryBank、Tag、ブランチ情報）、2. バリューオブジェクトとして扱うべき不変な概念を識別（DocumentPath、DocumentContent、DocumentMetadata）、3. ドメインサービスとして切り出すべき機能を識別（文書検証サービス、タグ管理サービス）

#### 影響
- ビジネスルールがドメインエンティティに封じ込められる
- ドメインの概念が明確になり、コードの意図が理解しやすくなる
- 変更に強いコードベースになる

### リポジトリパターンの採用

#### コンテキスト
現在の実装はデータアクセスのロジックが各マネージャークラスに分散しています。

#### 決定事項
リポジトリパターンを採用し、データアクセスを抽象化します：1. リポジトリインターフェースをドメイン層に定義、2. 具体的な実装はインフラストラクチャ層に配置、3. ドメインエンティティとデータモデルのマッピングを行う

#### 影響
- データアクセスロジックの一元化
- ストレージメカニズムの変更が容易になる
- テスト時にデータストアをモックに置き換えやすくなる

### 依存性注入の導入

#### コンテキスト
現在のコードはクラス間の依存関係が直接的で、テストや拡張が難しい状態です。

#### 決定事項
依存性注入パターンを採用し、以下を実装します：1. インターフェースを介した依存関係の定義、2. 実装クラスの外部からの注入、3. テスト時にモックオブジェクトを注入可能な構造

#### 影響
- モジュール間の結合度が低くなる
- テストの際にモックオブジェクトを注入しやすくなる
- 依存関係が明示的になり、コードの理解が容易になる
- 新しい実装への置き換えが容易になる

### クリーンアーキテクチャの採用

#### コンテキスト
現在のコードベースは、責任の分離が不明確で、依存関係が複雑に絡み合っています。これにより、コードの変更やテストが難しくなっています。

#### 決定事項
クリーンアーキテクチャパターンを採用し、以下の層に分割します：1. ドメイン層（Entities, Use Cases） - コアのビジネスロジックと規則、エンティティとバリューオブジェクト、ドメインサービス、2. アプリケーション層（Use Cases） - ユースケース実装、入力検証とエラーハンドリング、ドメイン層の調整、3. インターフェース適応層（Interface Adapters） - リポジトリの実装、コントローラー、プレゼンター、4. フレームワークと外部層（Frameworks & Drivers） - データベース、フレームワーク、外部APIとの統合

#### 影響
- 依存関係の方向が明確になり、内側のレイヤーは外側のレイヤーに依存しなくなる
- テスト容易性が向上する
- 変更の影響範囲が限定される
- コードの理解がしやすくなる

### クリーンアーキテクチャの採用

#### コンテキスト
現在のコードベースは、責任の分離が不明確で、依存関係が複雑に絡み合っています。これにより、コードの変更やテストが難しくなっています。

#### 決定事項
クリーンアーキテクチャパターンを採用し、以下の層に分割します：

1. **ドメイン層（Entities, Use Cases）**
   - コアのビジネスロジックと規則
   - エンティティとバリューオブジェクト
   - ドメインサービス

2. **アプリケーション層（Use Cases）**
   - ユースケース実装
   - 入力検証とエラーハンドリング
   - ドメイン層の調整

3. **インターフェース適応層（Interface Adapters）**
   - リポジトリの実装
   - コントローラー
   - プレゼンター

4. **フレームワークと外部層（Frameworks & Drivers）**
   - データベース
   - フレームワーク
   - 外部APIとの統合

#### 影響
- 依存関係の方向が明確になり、内側のレイヤーは外側のレイヤーに依存しなくなる
- テスト容易性が向上する
- 変更の影響範囲が限定される
- コードの理解がしやすくなる

### 依存性注入の導入

#### コンテキスト
現在のコードはクラス間の依存関係が直接的で、テストや拡張が難しい状態です。

#### 決定事項
依存性注入パターンを採用し、以下を実装します：

1. インターフェースを介した依存関係の定義
2. 実装クラスの外部からの注入
3. テスト時にモックオブジェクトを注入可能な構造

#### 影響
- モジュール間の結合度が低くなる
- テストの際にモックオブジェクトを注入しやすくなる
- 依存関係が明示的になり、コードの理解が容易になる
- 新しい実装への置き換えが容易になる

### リポジトリパターンの採用

#### コンテキスト
現在の実装はデータアクセスのロジックが各マネージャークラスに分散しています。

#### 決定事項
リポジトリパターンを採用し、データアクセスを抽象化します：

1. リポジトリインターフェースをドメイン層に定義
2. 具体的な実装はインフラストラクチャ層に配置
3. ドメインエンティティとデータモデルのマッピングを行う

#### 影響
- データアクセスロジックの一元化
- ストレージメカニズムの変更が容易になる
- テスト時にデータストアをモックに置き換えやすくなる

### ドメインモデルの再設計

#### コンテキスト
現在のコードベースでは、データモデルとビジネスロジックが明確に分離されていません。

#### 決定事項
リッチなドメインモデルを採用し、ビジネスロジックをエンティティに封じ込めます：

1. メモリバンク関連の核となるエンティティを識別
   - MemoryDocument
   - GlobalMemoryBank
   - BranchMemoryBank
   - Tag
   - ブランチ情報（BranchInfo）
2. バリューオブジェクトとして扱うべき不変な概念を識別
   - DocumentPath
   - DocumentContent
   - DocumentMetadata
3. ドメインサービスとして切り出すべき機能を識別
   - 文書検証サービス
   - タグ管理サービス

#### 影響
- ビジネスルールがドメインエンティティに封じ込められる
- ドメインの概念が明確になり、コードの意図が理解しやすくなる
- 変更に強いコードベースになる

### 統一的なエラーハンドリング

#### コンテキスト
現在のエラーハンドリングは一貫性がなく、クライアントへのフィードバックも限定的です。

#### 決定事項
以下の原則に基づいたエラーハンドリングメカニズムを導入します：

1. 専用のエラークラス階層を作成
2. ドメイン固有のエラーとシステムエラーを分離
3. エラーコードとメッセージの標準化
4. ユーザーフレンドリーなエラーメッセージの提供

#### 影響
- エラーハンドリングが一貫性を持つ
- クライアントへより有用なフィードバックを提供できる
- デバッグが容易になる

## 関連ファイルとディレクトリ構造

新しいディレクトリ構造を以下のように定義します：

```
src/
├── domain/                   # ドメイン層
│   ├── entities/             # エンティティとバリューオブジェクト
│   │   ├── MemoryDocument.ts
│   │   ├── GlobalMemoryBank.ts
│   │   ├── BranchMemoryBank.ts
│   │   ├── Tag.ts
│   │   ├── DocumentPath.ts
│   │   └── ...
│   ├── repositories/         # リポジトリインターフェース
│   │   ├── IMemoryDocumentRepository.ts
│   │   ├── IGlobalMemoryBankRepository.ts
│   │   ├── IBranchMemoryBankRepository.ts
│   │   └── ...
│   └── services/             # ドメインサービス
│       ├── DocumentValidationService.ts
│       ├── TagManagementService.ts
│       └── ...
│
├── application/              # アプリケーション層
│   ├── usecases/             # ユースケース実装
│   │   ├── global/
│   │   │   ├── ReadGlobalDocumentUseCase.ts
│   │   │   ├── WriteGlobalDocumentUseCase.ts
│   │   │   └── ...
│   │   ├── branch/
│   │   │   ├── ReadBranchDocumentUseCase.ts
│   │   │   ├── WriteBranchDocumentUseCase.ts
│   │   │   └── ...
│   │   └── common/
│   │       ├── ListDocumentsUseCase.ts
│   │       ├── SearchDocumentsByTagsUseCase.ts
│   │       └── ...
│   ├── dtos/                 # 入出力データ転送オブジェクト
│   │   ├── DocumentDTO.ts
│   │   ├── WriteDocumentDTO.ts
│   │   └── ...
│   └── interfaces/           # ユースケースインターフェース
│       └── IUseCase.ts
│
├── infrastructure/           # インフラストラクチャ層
│   ├── repositories/         # リポジトリ実装
│   │   ├── FileSystemMemoryDocumentRepository.ts
│   │   ├── FileSystemGlobalMemoryBankRepository.ts
│   │   ├── FileSystemBranchMemoryBankRepository.ts
│   │   └── ...
│   ├── storage/              # ストレージ実装
│   │   └── FileSystemStorage.ts
│   ├── config/               # 設定
│   │   ├── ConfigProvider.ts
│   │   └── ...
│   └── external/             # 外部サービス連携
│       └── mcpserver/
│           ├── MCPServer.ts
│           └── ...
│
├── interface/                # インターフェース層
│   ├── controllers/          # コントローラー
│   │   ├── MemoryBankController.ts
│   │   ├── BranchController.ts
│   │   ├── GlobalController.ts
│   │   └── ...
│   ├── presenters/           # プレゼンター
│   │   ├── MCPResponsePresenter.ts
│   │   └── ...
│   └── validators/           # 入力検証
│       ├── DocumentPathValidator.ts
│       ├── DocumentContentValidator.ts
│       └── ...
│
├── main/                     # アプリケーションのエントリーポイント
│   ├── di/                   # 依存性注入設定
│   │   ├── container.ts
│   │   └── providers.ts
│   ├── config/               # アプリケーション設定
│   │   ├── config.ts
│   │   └── ...
│   └── index.ts              # メインエントリーポイント
│
└── shared/                   # 共有コンポーネント
    ├── errors/               # エラー定義
    │   ├── ApplicationError.ts
    │   ├── DomainError.ts
    │   ├── InfrastructureError.ts
    │   └── ...
    ├── types/                # 共通型定義
    │   └── index.ts
    └── utils/                # ユーティリティ
        ├── logger.ts
        └── ...
```

### コアドメインエンティティの設計例

新しいアーキテクチャでのコアドメインエンティティの設計例：

```typescript
// domain/entities/MemoryDocument.ts

import { DocumentPath } from './DocumentPath';
import { Tag } from './Tag';

interface MemoryDocumentProps {
  path: DocumentPath;
  content: string;
  tags: Tag[];
  lastModified: Date;
}

export class MemoryDocument {
  private readonly props: MemoryDocumentProps;

  private constructor(props: MemoryDocumentProps) {
    this.props = props;
  }

  // ファクトリーメソッド
  public static create(props: MemoryDocumentProps): MemoryDocument {
    // バリデーションロジック
    return new MemoryDocument(props);
  }

  // ゲッター
  public get path(): DocumentPath {
    return this.props.path;
  }

  public get content(): string {
    return this.props.content;
  }

  public get tags(): Tag[] {
    return [...this.props.tags];
  }

  public get lastModified(): Date {
    return new Date(this.props.lastModified);
  }

  // ビジネスロジック
  public hasTag(tag: Tag): boolean {
    return this.props.tags.some(t => t.equals(tag));
  }

  public addTag(tag: Tag): MemoryDocument {
    if (this.hasTag(tag)) {
      return this;
    }
    
    return new MemoryDocument({
      ...this.props,
      tags: [...this.props.tags, tag],
      lastModified: new Date()
    });
  }

  public removeTag(tag: Tag): MemoryDocument {
    return new MemoryDocument({
      ...this.props,
      tags: this.props.tags.filter(t => !t.equals(tag)),
      lastModified: new Date()
    });
  }

  public updateContent(content: string): MemoryDocument {
    if (content === this.props.content) {
      return this;
    }
    
    return new MemoryDocument({
      ...this.props,
      content,
      lastModified: new Date()
    });
  }
}
```

### リポジトリインターフェース設計例

```typescript
// domain/repositories/IMemoryDocumentRepository.ts

import { MemoryDocument } from '../entities/MemoryDocument';
import { DocumentPath } from '../entities/DocumentPath';
import { Tag } from '../entities/Tag';

export interface IMemoryDocumentRepository {
  findByPath(path: DocumentPath): Promise<MemoryDocument | null>;
  findByTags(tags: Tag[]): Promise<MemoryDocument[]>;
  save(document: MemoryDocument): Promise<void>;
  delete(path: DocumentPath): Promise<boolean>;
  list(): Promise<DocumentPath[]>;
}
```

### ユースケース設計例

```typescript
// application/usecases/branch/ReadBranchDocumentUseCase.ts

import { IUseCase } from '../../interfaces/IUseCase';
import { DocumentDTO } from '../../dtos/DocumentDTO';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository';
import { DocumentPath } from '../../../domain/entities/DocumentPath';
import { DomainError } from '../../../shared/errors/DomainError';

export interface ReadBranchDocumentInput {
  branchName: string;
  path: string;
}

export interface ReadBranchDocumentOutput {
  document: DocumentDTO;
}

export class ReadBranchDocumentUseCase implements IUseCase<ReadBranchDocumentInput, ReadBranchDocumentOutput> {
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository
  ) {}

  async execute(input: ReadBranchDocumentInput): Promise<ReadBranchDocumentOutput> {
    // 入力検証
    if (!input.branchName) {
      throw new DomainError('INVALID_BRANCH_NAME', 'Branch name is required');
    }
    
    if (!input.path) {
      throw new DomainError('INVALID_PATH', 'Document path is required');
    }

    // ドメインオブジェクトへの変換
    const documentPath = DocumentPath.create(input.path);
    
    // リポジトリを使用してデータ取得
    const branch = await this.branchRepository.findByName(input.branchName);
    
    if (!branch) {
      throw new DomainError('BRANCH_NOT_FOUND', `Branch "${input.branchName}" not found`);
    }
    
    const document = await branch.getDocument(documentPath);
    
    if (!document) {
      throw new DomainError('DOCUMENT_NOT_FOUND', `Document "${input.path}" not found in branch "${input.branchName}"`);
    }
    
    // DTOへの変換
    return {
      document: {
        path: document.path.value,
        content: document.content,
        tags: document.tags.map(tag => tag.value),
        lastModified: document.lastModified.toISOString()
      }
    };
  }
}
```

### コントローラー設計例

```typescript
// interface/controllers/BranchController.ts

import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase';
import { MCPResponsePresenter } from '../presenters/MCPResponsePresenter';
import { DomainError } from '../../shared/errors/DomainError';
import { ApplicationError } from '../../shared/errors/ApplicationError';

export class BranchController {
  constructor(
    private readonly readBranchDocumentUseCase: ReadBranchDocumentUseCase,
    private readonly writeBranchDocumentUseCase: WriteBranchDocumentUseCase,
    private readonly presenter: MCPResponsePresenter
  ) {}

  async readDocument(branchName: string, path: string) {
    try {
      const result = await this.readBranchDocumentUseCase.execute({ branchName, path });
      return this.presenter.present(result);
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        return this.presenter.presentError(error);
      }
      
      // 未知のエラー
      return this.presenter.presentError(
        new ApplicationError('UNKNOWN_ERROR', 'An unexpected error occurred', { originalError: error })
      );
    }
  }

  async writeDocument(branchName: string, path: string, content: string, tags?: string[]) {
    try {
      const result = await this.writeBranchDocumentUseCase.execute({
        branchName,
        path,
        content,
        tags: tags || []
      });
      
      return this.presenter.present(result);
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        return this.presenter.presentError(error);
      }
      
      // 未知のエラー
      return this.presenter.presentError(
        new ApplicationError('UNKNOWN_ERROR', 'An unexpected error occurred', { originalError: error })
      );
    }
  }
}
```
