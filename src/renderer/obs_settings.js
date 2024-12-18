document.addEventListener('DOMContentLoaded', async () => {
    // const settingsForm = document.getElementById('settingsForm');
    const saveButton = document.getElementById('saveButton');

    saveButton.addEventListener('click', async function() {
        const ipAddress = document.getElementById('ipAddress').value;
        const port = document.getElementById('port').value;
        const password = document.getElementById('password').value;

        // メインプロセスに接続情報を送信
        window.electron.send('save-settings', { ipAddress, port, password });
    });

    // 設定を読み込む
    window.electron.send('load-settings'); // 設定を読み込むリクエストを送信

    // 設定が読み込まれたときの処理
    window.electron.receive('settings-loaded', (settings) => {
        if (settings) {
            document.getElementById('ipAddress').value = settings.ipAddress || '';
            document.getElementById('port').value = settings.port || '';
            document.getElementById('password').value = settings.password || '';
        }
    });

    // settingsForm.addEventListener('submit', (event) => {
    //     event.preventDefault(); // フォームのデフォルト動作を防ぐ
    //     const ipAddress = document.getElementById('ipAddress').value;
    //     const port = document.getElementById('port').value;
    //     const password = document.getElementById('password').value;

    //     // メインプロセスに設定情報を送信
    //     console.log('設定を保存します:', { ipAddress, port, password });
    //     window.electron.send('connect-to-obs', { ipAddress, port, password });
    //     window.electron.send('save-settings', { ipAddress, port, password });
    //     alert('設定が保存されました！');
    // });


    // connectButton.addEventListener('click', async function() {
    //     console.log('接続ボタンがクリックされました'); // デバッグ用ログ
    //     const ipAddress = document.getElementById('ipAddress').value;
    //     const port = document.getElementById('port').value;
    //     const password = document.getElementById('password').value;

    //     // メインプロセスに接続情報を送信
    //     window.electron.send('connect-to-obs', { ipAddress, port, password });
    // });

    document.getElementById('cancelButton').addEventListener('click', () => {
        window.close(); // ウィンドウを閉じる
    });
});