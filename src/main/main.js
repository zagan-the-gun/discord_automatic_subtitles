import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import OBSWebSocket from 'obs-websocket-js'; // デフォルトエクスポートとしてインポート
import path from 'path'; // pathモジュールをインポート
import { fileURLToPath } from 'url'; // fileURLToPathをインポート
// import { startBot } from './bot.js';
import Store from 'electron-store';


// __dirnameを定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();
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
            label: 'Settings', // Settingsメニューを追加
            submenu: [
                {
                    label: 'OBS Settings',
                    click: () => {
                        showObsSettingsDialog(); // 設定ダイアログを表示する関数を呼び出す
                    }
                }
            ]
        },
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

// OBS設定ダイアログを表示する関数
function showObsSettingsDialog() {
    const settingsWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            // nodeIntegration: true, // nodeIntegrationは無効にする
            // contextIsolation: false, // contextIsolationを有効にする
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        frame: true // フレームを有効にする
    });

    settingsWindow.loadFile('src/renderer/obs_settings.html'); // settings.htmlを読み込む
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

// 設定を保存するためのIPCリスナー
ipcMain.on('save-settings', async (event, settings) => {
    console.log('OBS設定保存');
    store.set('obsSettings', settings); // 設定を保存
    console.log('設定が保存されました:', settings);
    event.reply('settings-saved', '設定が保存されました。'); // レンダラープロセスに通知
    mainWindow.webContents.send('settings-loaded', '設定が保存されました。');
});

// 設定を読み込むためのIPCリスナー
ipcMain.on('load-settings', async (event) => {
    console.log('OBS設定読込');
    const settings = store.get('obsSettings'); // 保存された設定を取得
    event.reply('settings-loaded', settings); // レンダラープロセスに送信
    mainWindow.webContents.send('settings-loaded', settings);
});

ipcMain.on('connect-to-obs', async (event, { ipAddress, port, password }) => {
    console.log(`接続試行: ws://${ipAddress}:${port} パスワード: ${password}`);
    try {
        await obs.connect(`ws://${ipAddress}:${port}`, password);
        console.log('接続成功');
        event.reply('connection-status', '接続成功'); // これを使う
        mainWindow.webContents.send('connection-status', '接続成功です');
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

