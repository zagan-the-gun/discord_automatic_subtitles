document.addEventListener('DOMContentLoaded', async () => {
    const connectButton = document.getElementById('connectButton');
    const updateTextButton = document.getElementById('updateTextButton');
    const botStartButton = document.getElementById('botStartButton');
    const botStopButton = document.getElementById('botStopButton');

    let currentSettings = {}; // 設定を格納する変数

    // 設定を読み込む
    window.electron.send('load-settings'); // 設定を読み込むリクエストを送信

    // 設定が読み込まれたときの処理
    window.electron.receive('settings-loaded', (settings) => {
        if (settings) {
            currentSettings = settings;
            document.getElementById('inputName').innerText = settings.inputName || '';
            document.getElementById('serverChannelId').innerText = settings.serverChannelId || '';
            document.getElementById('voiceChannelId').innerText = settings.voiceChannelId || '';
            document.getElementById('userId').innerText = settings.userId || '';
            document.getElementById('subtitleMethod').innerText = settings.subtitleMethod || '';
        }
    });

    // OBS接続
    connectButton.addEventListener('click', async function() {
        window.electron.send('load-settings');

        // メインプロセスに接続情報を送信
        window.electron.send('connect-to-obs', {
            ipAddress: currentSettings.ipAddress || '',
            port: currentSettings.port || '',
            password: currentSettings.password || '',
            serverChannelId: currentSettings.serverChannelId || '',
            voiceChannelId: currentSettings.voiceChannelId || '',
            userId: currentSettings.userId || '',
            subtitleMethod: currentSettings.subtitleMethod || '',
            witaiToken: currentSettings.witaiToken || ''
        });
    });

    // OBS接続状態の表示
    window.electron.receive('connection-status', (message) => {
        document.getElementById('status').innerText = message; // ステータスを表示
    });

    // OBSテキスト更新ボタンのクリックイベント
    updateTextButton.addEventListener('click', async () => {
        window.electron.send('load-settings');

        // メインプロセスにテキスト更新のリクエストを送信
        window.electron.send('update-text', { 
            inputName: currentSettings.inputName || '',
            newText: document.getElementById('newText').value
        });
    });

    // BOT起動/停止
    botStartButton.addEventListener('click', async () => {
        window.electron.send('load-settings');

        // メインプロセスに接続情報を送信
        window.electron.send('stop-bot');
        window.electron.send('start-bot', {
            discordToken: currentSettings.discordToken || '',
            serverChannelId: currentSettings.serverChannelId || '',
            voiceChannelId: currentSettings.voiceChannelId || '',
            userId: currentSettings.userId || '',
            inputName: currentSettings.inputName || '',
            subtitleMethod: currentSettings.subtitleMethod || '',
            witaiToken: currentSettings.witaiToken || ''
        });

        // document.getElementById('botStatus').innerText = 'ボットを起動中...'; // ステータスを表示
    });

    botStopButton.addEventListener('click', async () => {
        window.electron.send('stop-bot');
        // document.getElementById('botStatus').innerText = 'ボットを起動中...'; // ステータスを表示
    });

});

// テキスト更新の応答を受け取る
window.electron.receive('text-update-status', (message) => {
    console.log('テキスト更新の応答を受け取りました'); // デバッグ用ログ
    document.getElementById('status').innerText = message; // ステータスを表示
});

