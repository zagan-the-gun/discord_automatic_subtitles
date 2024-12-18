document.addEventListener('DOMContentLoaded', async () => {
    const connectButton = document.getElementById('connectButton');
    const updateTextButton = document.getElementById('updateTextButton');

    // 設定を読み込む
    window.electron.send('load-settings'); // 設定を読み込むリクエストを送信

    // 設定が読み込まれたときの処理
    window.electron.receive('settings-loaded', (settings) => {
        if (settings) {
            document.getElementById('ipAddress').innerText = settings.ipAddress || '';
            document.getElementById('port').innerText = settings.port || '';
            document.getElementById('password').value = settings.password || '';
            document.getElementById('voiceChannelId').innerText = settings.voiceChannelId || '';
            document.getElementById('userId').innerText = settings.userId || '';
        }
    });
    
    connectButton.addEventListener('click', async function() {
        console.log('接続ボタンがクリックされました'); // デバッグ用ログ
        const ipAddress = document.getElementById('ipAddress').innerText;
        const port = document.getElementById('port').innerText;
        const password = document.getElementById('password').value;
        const voiceChannelId = document.getElementById('voiceChannelId').innerText;
        const userId = document.getElementById('userId').innerText;

        // メインプロセスに接続情報を送信
        window.electron.send('connect-to-obs', { ipAddress, port, password, voiceChannelId, userId});
    });

    // メインプロセスからの応答を受け取る
    window.electron.receive('connection-status', (message) => {
        console.log('メインプロセスからの応答を受け取りました'); // デバッグ用ログ
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

