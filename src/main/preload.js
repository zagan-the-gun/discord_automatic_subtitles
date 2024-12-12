const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスに安全にAPIを提供
contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});
