document.addEventListener('DOMContentLoaded', async () => {
    const connectButton = document.getElementById('connectButton');
    const updateTextButton = document.getElementById('updateTextButton');

    let currentSettings = {}; // 設定を格納する変数

    // 設定を読み込む
    window.electron.send('load-settings'); // 設定を読み込むリクエストを送信

    // 設定が読み込まれたときの処理
    window.electron.receive('settings-loaded', (settings) => {
        if (settings) {
            currentSettings = settings;
        }
    });

    connectButton.addEventListener('click', async function() {
        window.electron.send('load-settings');

        // メインプロセスに接続情報を送信
        window.electron.send('connect-to-obs', {
            ipAddress: currentSettings.ipAddress || '',
            port: currentSettings.port || '',
            password: currentSettings.password || '',
            voiceChannelId: currentSettings.voiceChannelId || '',
            userId: currentSettings.userId || ''
        });
    });

    // メインプロセスからの応答を受け取る
    window.electron.receive('connection-status', (message) => {
        document.getElementById('status').innerText = message; // ステータスを表示
    });

    // テキスト更新ボタンのクリックイベント
    updateTextButton.addEventListener('click', async () => {
        const newText = document.getElementById('newText').value;
        const sourceName = document.getElementById('sourceName').value;

        // メインプロセスにテキスト更新のリクエストを送信
        window.electron.send('update-text', { sourceName, newText });
    });

    // ボット起動ボタンのクリックイベント
    startBotButton.addEventListener('click', () => {
        console.log('ボット起動ボタンがクリックされました'); // デバッグ用ログ
        // メインプロセスにボット起動のリクエストを送信
        window.electron.send('start-discord-bot', { message: 'ボットを起動します' });
        document.getElementById('status').innerText = 'ボットを起動中...'; // ステータスを表示
    });

});

// テキスト更新の応答を受け取る
window.electron.receive('text-update-status', (message) => {
    console.log('テキスト更新の応答を受け取りました'); // デバッグ用ログ
    document.getElementById('status').innerText = message; // ステータスを表示
});

