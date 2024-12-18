document.addEventListener('DOMContentLoaded', async () => {
    // const settingsForm = document.getElementById('settingsForm');
    const saveButton = document.getElementById('saveButton');

    saveButton.addEventListener('click', async function() {
        const voiceChannelId = document.getElementById('voiceChannelId').value;
        const userId = document.getElementById('userId').value;

        // メインプロセスに接続情報を送信
        window.electron.send('save-settings', { voiceChannelId, userId});
    });

    // 設定を読み込む
    window.electron.send('load-settings'); // 設定を読み込むリクエストを送信

    // 設定が読み込まれたときの処理
    window.electron.receive('settings-loaded', (settings) => {
        if (settings) {
            document.getElementById('voiceChannelId').value = settings.voiceChannelId || '';
            document.getElementById('userId').value = settings.userId || '';
        }
    });

    document.getElementById('cancelButton').addEventListener('click', () => {
        window.close(); // ウィンドウを閉じる
    });
});