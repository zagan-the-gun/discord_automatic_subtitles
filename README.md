# WindowsまたはIntelMacでしか動作しません
MacのM1系(ARM64)では@discordjs/opusが動かないようなので諦めましょう

# ファイル構成
discord_automatic_subtitles/
├── node_modules/          # npmでインストールしたパッケージ
├── src/                   # ソースコード
│   ├── main/              # メインプロセスのコード
│   │   ├── main.js        # アプリのエントリーポイント
│   │   └── preload.js     # プレロード用のファイル
│   │   └── bot.js         # Botプロセスのファイル
│   ├── renderer/          # レンダラープロセスのコード
│   │   ├── index.html     # HTMLファイル
│   │   ├── renderer.js    # レンダラープロセスのJavaScript
│   │   └── styles.css     # CSSファイル
│   └── assets/            # 画像やフォントなどのアセット
│       └── logo.png       # アプリのロゴ
├── settings-sample.json   # APIキーとか大事なもの
├── package.json           # プロジェクトの設定ファイル
├── package-lock.json      # npmの依存関係のロックファイル
└── README.md              # プロジェクトの説明
