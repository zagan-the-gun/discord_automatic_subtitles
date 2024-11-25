import { app, BrowserWindow, ipcMain } from 'electron';
import OBSWebSocket from 'obs-websocket-js'; // デフォルトエクスポートとしてインポート
import path from 'path'; // pathモジュールをインポート
import { fileURLToPath } from 'url'; // fileURLToPathをインポート
// import { startBot } from './bot.js';

// __dirnameを定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
const obs = new OBSWebSocket(); // ここでインスタンスを作成

console.log('main.jsが読み込まれました'); // スクリプトが読み込まれたことを確認するためのログ

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false, // nodeIntegrationは無効にする
            contextIsolation: true, // contextIsolationを有効にする
            preload: path.join(__dirname, 'preload.js') // preloadスクリプトを指定
            // preload: path.join(__dirname, '../renderer/index.js') // preloadスクリプトを指定
        }
    });

    mainWindow.loadFile('src/renderer/index.html');
}

app.whenReady().then(() => {
    createWindow();
    // startBot();
});

ipcMain.on('connect-to-obs', async (event, { ipAddress, port, password }) => {
    try {
        await obs.connect(`ws://${ipAddress}:${port}`, password);
        console.log('接続成功');
        event.reply('connection-status', '接続成功'); // これを使う
        mainWindow.webContents.send('connection-status', '接続成功');
    } catch (error) {
        console.error('接続エラー:', error);
        event.reply('connection-status', '接続失敗');
        mainWindow.webContents.send('connection-status', '接続エラー: ' + error.message);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('update-text', async (event, { sourceName, newText }) => {
    try {
        await obs.call('SetInputSettings', {
            // source: sourceName,
            // text: newText
            inputName: sourceName,
            inputSettings: {
              text: newText,
            },
        });
        console.log('テキストを更新しました:', newText);
        event.reply('text-update-status', 'テキストを更新しました');
    } catch (error) {
        console.error('テキストの更新に失敗しました:', error);
        event.reply('text-update-status', 'テキストの更新に失敗しました: ' + error.message);
    }
});
