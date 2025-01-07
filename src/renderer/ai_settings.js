document.addEventListener('DOMContentLoaded', async () => {
    const saveButton = document.getElementById('saveButton');

    saveButton.addEventListener('click', async function() {
        const subtitleMethod = document.getElementById('subtitleMethod').value;
        const witaiToken = document.getElementById('witaiToken').value;

        // メインプロセスに接続情報を送信
        window.electron.send('save-settings', { subtitleMethod, witaiToken});

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
            document.getElementById('subtitleMethod').value = settings.subtitleMethod || '';
            document.getElementById('witaiToken').value = settings.witaiToken || '';
        }
    });

    document.getElementById('cancelButton').addEventListener('click', () => {
        window.close(); // ウィンドウを閉じる
    });
});
