import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
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
        width: 400,
        height: 800,
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
    createMenu(); // カスタムメニューを作成
    startBot();
});

// カスタムメニューの作成
function createMenu() {
    const menuTemplate = [
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        // Aboutダイアログを表示する処理をここに追加
                        showAboutDialog();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu); // カスタムメニューを設定
}

// Aboutダイアログを表示する関数
function showAboutDialog() {
    const aboutWindow = new BrowserWindow({
        width: 300,
        height: 200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        frame: false, // メニューバーやタイトルバーを非表示にする
        resizable: false // ウィンドウのサイズ変更を無効にする
    });

    aboutWindow.loadFile('src/renderer/about.html'); // about.htmlを読み込む
}

import { fork } from 'child_process';

let botEvent;

function startBot() {
    const botPath = path.join(__dirname, 'bot.js'); // bot.jsのパスを指定
    const botProcess = fork(botPath); // bot.jsを子プロセスとして起動

    botProcess.on('message', (message) => {
        console.log('メッセージを受信:', message);
         // メッセージが 'update-text' の場合、メインプロセスに送信
         if (message.type === 'update-text') {
            // ipcMain.emit('update-text', message.data); // メインプロセスにメッセージを送信
            ipcMain.emit('update-text', botEvent, { sourceName: message.data.sourceName, newText: message.data.newText[0]}); // メインプロセスにメッセージを送信
        }
   });
}


ipcMain.on('connect-to-obs', async (event, { ipAddress, port, password }) => {
    console.log(`接続試行: ws://${ipAddress}:${port} パスワード: ${password}`);
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
    console.log('DEAD BEEF typeof sourceName',typeof sourceName);
    console.log('DEAD BEEF typeof newText',typeof newText);
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
        if (event) {
            event.reply('text-update-status', 'テキストを更新しました');
        }
    } catch (error) {
        console.error('テキストの更新に失敗しました:', error);
        event.reply('text-update-status', 'テキストの更新に失敗しました: ' + error.message);
    }
});

