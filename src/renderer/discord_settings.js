document.addEventListener('DOMContentLoaded', async () => {
    const saveButton = document.getElementById('saveButton');

    saveButton.addEventListener('click', async function() {
        const serverChannelId = document.getElementById('serverChannelId').value;
        const voiceChannelId = document.getElementById('voiceChannelId').value;
        const userId = document.getElementById('userId').value;
        const discordToken = document.getElementById('discordToken').value;

        // メインプロセスに接続情報を送信
        window.electron.send('save-settings', { serverChannelId, voiceChannelId, userId, discordToken});

        // 設定が保存された後に設定を再読み込むリクエストを送信
        window.electron.send('load-settings');

        // 設定が保存された後にウィンドウを閉じる
        window.close();
    });

    // 設定を読み込む
    window.electron.send('load-settings'); // 設定を読み込むリクエストを送信

    // 設定が読み込まれたときの処理
    window.electron.receive('settings-loaded', (settings) => {
        if (settings) {
            document.getElementById('serverChannelId').value = settings.serverChannelId || '';
            document.getElementById('voiceChannelId').value = settings.voiceChannelId || '';
            document.getElementById('userId').value = settings.userId || '';
            document.getElementById('discordToken').value = settings.discordToken || '';
        }
    });

    document.getElementById('cancelButton').addEventListener('click', () => {
        window.close(); // ウィンドウを閉じる
    });
});
