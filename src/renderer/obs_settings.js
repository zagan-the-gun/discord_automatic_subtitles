document.addEventListener('DOMContentLoaded', async () => {
    // const settingsForm = document.getElementById('settingsForm');
    const saveButton = document.getElementById('saveButton');

    saveButton.addEventListener('click', async function() {
        const ipAddress = document.getElementById('ipAddress').value;
        const port = document.getElementById('port').value;
        const password = document.getElementById('password').value;
        const inputName = document.getElementById('inputName').value;

        // メインプロセスに設定情報を送信
        window.electron.send('save-settings', { ipAddress, port, password, inputName });

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
            document.getElementById('ipAddress').value = settings.ipAddress || '';
            document.getElementById('port').value = settings.port || '';
            document.getElementById('password').value = settings.password || '';
            document.getElementById('inputName').value = settings.inputName || '';
        }
    });
    document.getElementById('cancelButton').addEventListener('click', () => {
        window.close(); // ウィンドウを閉じる
    });
});