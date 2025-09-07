# Location Tracker

30秒間隔で位置情報を自動保存するWebアプリケーションです。IndexedDB + SQLiteを使用してブラウザ内でデータを永続化します。

## 機能

- **自動位置追跡**: 30秒間隔で位置情報を自動取得・保存
- **データ永続化**: IndexedDB + SQLiteでブラウザ内にデータを保存
- **リアルタイム表示**: 現在位置の実時間更新
- **履歴管理**: 過去の位置情報履歴をページネーション付きで表示
- **データエクスポート**: JSON形式でデータをダウンロード
- **統計情報**: 総記録数、最初/最新記録の表示
- **レスポンシブUI**: モバイル対応のTailwind CSSデザイン

## 開発環境での実行

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動（http://localhost:3000）
npm run dev
```

## 使用方法

1. **追跡開始**: 「追跡開始」ボタンをクリック
2. **位置情報許可**: ブラウザの位置情報アクセス許可を与える
3. **自動保存**: 30秒ごとに位置情報が自動で保存される
4. **追跡停止**: 「追跡停止」ボタンでいつでも停止可能

## 技術仕様

- **フロントエンド**: Vanilla JavaScript (ES6 Modules)
- **スタイリング**: Tailwind CSS
- **データベース**: SQL.js (SQLite) + IndexedDB
- **位置情報**: Geolocation API
- **デプロイ**: GitHub Pages対応

## ブラウザ対応

- Chrome 51+
- Firefox 47+
- Safari 10+
- Edge 79+

## GitHub Pagesデプロイ方法

1. このコードをGitHubリポジトリにプッシュ
2. リポジトリの Settings → Pages
3. Source: "Deploy from a branch"
4. Branch: main / root
5. Save

デプロイ後、`https://username.github.io/repository-name/` でアクセス可能です。

## プライバシー

- 位置情報はすべてブラウザ内（IndexedDB）に保存
- 外部サーバーには一切データを送信しません
- ユーザーが完全にコントロール可能

## ライセンス

MIT License