document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connectButton');
    const updateTextButton = document.getElementById('updateTextButton');

    connectButton.addEventListener('click', function() {
        const ipAddress = document.getElementById('ipAddress').value;
        const port = document.getElementById('port').value;
        const password = document.getElementById('password').value;

        // メインプロセスに接続情報を送信
        window.electron.send('connect-to-obs', { ipAddress, port, password });
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
});
// メインプロセスからの応答を受け取る
// window.electron.receive('connection-status', (message) => {
//     console.log('メインプロセスからの応答を受け取りました'); // デバッグ用ログ
//     document.getElementById('status').innerText = message; // ステータスを表示
// });

// テキスト更新の応答を受け取る
window.electron.receive('text-update-status', (message) => {
    console.log('テキスト更新の応答を受け取りました'); // デバッグ用ログ
    document.getElementById('status').innerText = message; // ステータスを表示
});