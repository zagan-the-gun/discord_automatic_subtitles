import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import OBSWebSocket from 'obs-websocket-js'; // デフォルトエクスポートとしてインポート
import path from 'path'; // pathモジュールをインポート
import { fileURLToPath } from 'url'; // fileURLToPathをインポート
import Store from 'electron-store';
import { fork } from 'child_process';



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
        height: 870,
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
    // startBot();
    mainWindow.webContents.send('log-message', 'main.jsが読み込まれました'); // ログメッセージを送信
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
                },
                {
                    label: 'Discord Settings',
                    click: () => {
                        showDiscordSettingsDialog(); // 設定ダイアログを表示する関数を呼び出す
                    }
                },
                {
                    label: 'AI Settings',
                    click: () => {
                        showAiSettingsDialog(); // 設定ダイアログを表示する関数を呼び出す
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
        height: 320,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        frame: true // フレームを有効にする
    });

    settingsWindow.loadFile('src/renderer/obs_settings.html'); // settings.htmlを読み込む
}

// Discord設定ダイアログを表示する関数
function showDiscordSettingsDialog() {
    const settingsWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        frame: true // フレームを有効にする
    });

    settingsWindow.loadFile('src/renderer/discord_settings.html'); // settings.htmlを読み込む
}

// AI設定ダイアログを表示する関数
function showAiSettingsDialog() {
    const settingsWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        frame: true // フレームを有効にする
    });

    settingsWindow.loadFile('src/renderer/ai_settings.html'); // settings.htmlを読み込む
}

// Aboutダイアログを表示する関数
function showAboutDialog() {
    const aboutWindow = new BrowserWindow({
        width: 300,
        height: 350,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        frame: false, // メニューバーやタイトルバーを非表示にする
        resizable: false // ウィンドウのサイズ変更を無効にする
    });

    aboutWindow.loadFile('src/renderer/about.html'); // about.htmlを読み込む
}

let botEvent;
let botProcess;

function startBot(discordToken, serverChannelId, voiceChannelId, userId, inputName, subtitleMethod, witaiToken) {
    const botPath = path.join(__dirname, 'bot.js'); // bot.jsのパスを指定
    botProcess = fork(botPath, [discordToken, serverChannelId, voiceChannelId, userId, inputName, subtitleMethod, witaiToken]); // bot.jsを子プロセスとして起動

    botProcess.on('message', (message) => {
            // メッセージが 'update-text' の場合、メインプロセスに送信
            if (message.type === 'update-text') {
                // ipcMain.emit('update-text', message.data);
                ipcMain.emit('update-text', botEvent, { inputName: message.data.inputName, newText: message.data.newText[0]});
            } else if (message.type === 'log-message') {
                mainWindow.webContents.send('log-message', message.data);
            }
    });
}

ipcMain.on('start-bot', async (event, { discordToken, serverChannelId, voiceChannelId, userId, inputName, subtitleMethod, witaiToken}) => {
    console.log('BOT起動: discordToken: ', discordToken);
    mainWindow.webContents.send('log-message', 'BOT起動: discordToken: ' + discordToken);
    startBot(discordToken, serverChannelId, voiceChannelId, userId, inputName, subtitleMethod, witaiToken); // BOTを起動する関数を呼び出す
});

ipcMain.on('stop-bot', async (event) => {
    console.log('BOT停止');
    mainWindow.webContents.send('log-message', 'BOT停止');
    if (botProcess) {
        botProcess.kill(); // BOTを停止
        console.log('BOTが停止しました');
        mainWindow.webContents.send('log-message', 'BOTが停止しました');
        botProcess = null;
    } else {
        console.log('BOTは起動していません');
        mainWindow.webContents.send('log-message', 'BOTは起動していません');
    }
});

// 設定を保存するためのIPCリスナー
ipcMain.on('save-settings', async (event, settings) => {
    console.log('設定保存');
    mainWindow.webContents.send('log-message', '設定保存');
    // store.set('obsSettings', settings); // 設定を保存
    store.set(settings); // 設定を保存
    console.log('設定が保存されました:', settings);
    mainWindow.webContents.send('log-message', '設定が保存されました:' + JSON.stringify(settings, null, 2));
    event.reply('settings-saved', '設定が保存されました。'); // レンダラープロセスに通知
    mainWindow.webContents.send('settings-loaded', '設定が保存されました。');
});

// 設定を読み込むためのIPCリスナー
ipcMain.on('load-settings', async (event) => {
    console.log('設定読込');
    mainWindow.webContents.send('log-message', '設定読込');
    // const settings = store.get('obsSettings'); // 保存された設定を取得
    const settings = store.get(); // 保存された設定を取得
    event.reply('settings-loaded', settings); // レンダラープロセスに送信
    mainWindow.webContents.send('settings-loaded', settings);
});

ipcMain.on('connect-to-obs', async (event, { ipAddress, port, password }) => {
    console.log(`接続試行: ws://${ipAddress}:${port}, パスワード: ${password}`);
    mainWindow.webContents.send('log-message', `接続試行: ws://${ipAddress}:${port}, パスワード: ${password}`);
    try {
        await obs.connect(`ws://${ipAddress}:${port}`, password);
        console.log('接続成功');
        mainWindow.webContents.send('log-message', '接続成功');
        event.reply('connection-status', '接続成功'); // これを使う
        mainWindow.webContents.send('connection-status', 'CONNECTED!');
    } catch (error) {
        console.error('接続エラー:', error);
        mainWindow.webContents.send('log-message', `接続エラー: ${error}`);
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

ipcMain.on('update-text', async (event, { inputName, newText }) => {
    try {
        await obs.call('SetInputSettings', {
            // source: sourceName,
            // text: newText
            inputName: inputName,
            inputSettings: {
              text: newText,
            },
        });
        console.log('updated text:', newText);
        mainWindow.webContents.send('log-message', `updated text: ${newText}`);
        if (event) {
            event.reply('text-update-status', 'Update text');
        }
    } catch (error) {
        console.error('テキストの更新に失敗しました:', error);
        mainWindow.webContents.send('log-message', `テキストの更新に失敗しました: ${error}`);
        event.reply('text-update-status', 'テキストの更新に失敗しました: ' + error.message);
    }
});
