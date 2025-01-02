console.log('bot.jsが読み込まれました');

// discordClient.on('messageCreate', async (msg) => {
function getCurrentDateString() {
    return (new Date()).toISOString() + ' ::';
};
let __originalLog = console.log;
console.log = function () {
    var args = [].slice.call(arguments);
    __originalLog.apply(console.log, [getCurrentDateString()].concat(args));
};

import fs from 'fs'; // requireをimportに変更
import util from 'util'; // requireをimportに変更
import { Readable } from 'stream'; // requireをimportに変更
// import { OpusEncoder } from '@discordjs/opus'; // requireをimportに変更
import opus from '@discordjs/opus'; // デフォルトエクスポートをインポート
const { OpusEncoder } = opus; // 必要なエクスポートを取得
import https from 'https'; // requireをimportに変更
import { Client, IntentsBitField } from 'discord.js'; // requireをimportに変更
import { joinVoiceChannel, EndBehaviorType } from '@discordjs/voice'; // requireをimportに変更
// import vosk from 'vosk'; // requireをimportに変更
import witClient from 'node-witai-speech'; // requireをimportに変更
// const witClientInstance = new witClient.Wit({ accessToken: WITAI_TOK });
import gspeech from '@google-cloud/speech'; // requireをimportに変更
// import { ipcMain } from 'electron';

function necessary_dirs() {
    if (!fs.existsSync('./data/')){
        fs.mkdirSync('./data/');
    }
}
necessary_dirs()

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 音声データをステレオからモノラルに変換しバッファを返す
async function convert_audio(input) {
    try {
        // stereo to mono channel
        const data = new Int16Array(input)
        const ndata = data.filter((el, idx) => idx % 2);
        return Buffer.from(ndata);
    } catch (e) {
        console.log(e)
        console.log('convert_audio: ' + e)
        throw e;
    }
}

const SETTINGS_FILE = 'settings.json';

let DISCORD_TOK = null;
let WITAI_TOK = null; 
let SPEECH_METHOD = 'vosk'; // witai, google, vosk

// 設定ファイルの読み込み（廃止予定）
function loadConfig() {
    if (fs.existsSync(SETTINGS_FILE)) {
        const CFG_DATA = JSON.parse( fs.readFileSync(SETTINGS_FILE, 'utf8') );
        DISCORD_TOK = CFG_DATA.DISCORD_TOK;
        WITAI_TOK = CFG_DATA.WITAI_TOK;
        SPEECH_METHOD = CFG_DATA.SPEECH_METHOD;
    }
    DISCORD_TOK = process.env.DISCORD_TOK || DISCORD_TOK;
    WITAI_TOK = process.env.WITAI_TOK || WITAI_TOK;
    SPEECH_METHOD = process.env.SPEECH_METHOD || SPEECH_METHOD;

    if (!['witai', 'google', 'vosk'].includes(SPEECH_METHOD))
        throw 'invalid or missing SPEECH_METHOD'
    if (!DISCORD_TOK)
        throw 'invalid or missing DISCORD_TOK'
    if (SPEECH_METHOD === 'witai' && !WITAI_TOK)
        throw 'invalid or missing WITAI_TOK'
    if (SPEECH_METHOD === 'google' && !fs.existsSync('./gspeech_key.json'))
        throw 'missing gspeech_key.json'
    
}
loadConfig() //オリジナルはここで設定読み込んで待機状態になる

function listWitAIApps(cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps?offset=0&limit=100',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+WITAI_TOK,
      },
    }

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      });
      res.on('end',function() {
        cb(JSON.parse(body))
      })
    })

    req.on('error', (error) => {
      console.error(error)
      cb(null)
    })
    req.end()
}

function updateWitAIAppLang(appID, lang, cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps/' + appID,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+WITAI_TOK,
      },
    }
    const data = JSON.stringify({
      lang
    })

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      });
      res.on('end',function() {
        cb(JSON.parse(body))
      })
    })
    req.on('error', (error) => {
      console.error(error)
      cb(null)
    })
    req.write(data)
    req.end()
}

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////

const myIntents = new IntentsBitField();
myIntents.add(
  IntentsBitField.Flags.GuildPresences,
  IntentsBitField.Flags.GuildVoiceStates,
  IntentsBitField.Flags.GuildMessages,
  IntentsBitField.Flags.MessageContent,
  IntentsBitField.Flags.Guilds,
  IntentsBitField.Flags.GuildMessageTyping);
const discordClient = new Client({intents: myIntents})
if (process.env.DEBUG)
    discordClient.on('debug', console.debug);
discordClient.on('ready', () => {
    console.log(`Discord client on ${discordClient.user.tag}!`)
})
// discordClient.login(DISCORD_TOK)

const PREFIX = '*';
const _CMD_HELP        = PREFIX + 'help';
const _CMD_JOIN        = PREFIX + 'join';
const _CMD_LEAVE       = PREFIX + 'leave';
const _CMD_DEBUG       = PREFIX + 'debug';
const _CMD_TEST        = PREFIX + 'hello';
const _CMD_LANG        = PREFIX + 'lang';

const guildMap = new Map();

discordClient.on('messageCreate', async (msg) => {
    try {
        if (!('guild' in msg) || !msg.guild) return; // prevent private messages to bot
        const mapKey = msg.guild.id;
        if (msg.content.trim().toLowerCase() === _CMD_JOIN) {
          console.log(`*joinが呼び出されました: ${!msg.member.voice.channel.id}`);
          if (!msg.member.voice.channel.id) {
                msg.reply('Error: please join a voice channel first.')
          } else {
                if (!guildMap.has(mapKey))
                    await connect(msg, mapKey)
                else
                    msg.reply('Already connected')
          }
        } else if (msg.content.trim().toLowerCase() == _CMD_LEAVE) {
            if (guildMap.has(mapKey)) {
                let val = guildMap.get(mapKey);
                if (val.voice_Channel) val.voice_Channel.leave()
                if (val.voice_Connection) val.voice_Connection.disconnect()
                guildMap.delete(mapKey)
                msg.reply("Disconnected.")
            } else {
                msg.reply("Cannot leave because not connected.")
            }
        } else if (msg.content.trim().toLowerCase() == _CMD_HELP) {
            msg.reply(getHelpString());
        }
        else if (msg.content.trim().toLowerCase() == _CMD_DEBUG) {
            console.log('toggling debug mode')
            let val = guildMap.get(mapKey);
            if (val.debug)
                val.debug = false;
            else
                val.debug = true;
        }
        else if (msg.content.trim().toLowerCase() == _CMD_TEST) {
            msg.reply('hello back =)')
        }
        else if (msg.content.split('\n')[0].split(' ')[0].trim().toLowerCase() == _CMD_LANG) {
            if (SPEECH_METHOD === 'witai') {
              const lang = msg.content.replace(_CMD_LANG, '').trim().toLowerCase()
              listWitAIApps(data => {
                if (!data.length)
                  return msg.reply('no apps found! :(')
                for (const x of data) {
                  updateWitAIAppLang(x.id, lang, data => {
                    if ('success' in data)
                      msg.reply('succes!')
                    else if ('error' in data && data.error !== 'Access token does not match')
                      msg.reply('Error: ' + data.error)
                  })
                }
              })
            } else if (SPEECH_METHOD === 'vosk') {
              let val = guildMap.get(mapKey);
              const lang = msg.content.replace(_CMD_LANG, '').trim().toLowerCase()
              val.selected_lang = lang;
            } else {
              msg.reply('Error: this feature is only for Google')
            }
        }
    } catch (e) {
        console.log('discordClient message: ' + e)
        msg.reply('Error#180: Something went wrong, try again or contact the developers if this keeps happening.');
    }
})

function getHelpString() {
    let out = '**COMMANDS:**\n'
        out += '```'
        out += PREFIX + 'join\n';
        out += PREFIX + 'leave\n';
        out += PREFIX + 'lang <code>\n';
        out += '```'
    return out;
}

async function connect(msg, mapKey) {
  try {
      let voice_Channel = await discordClient.channels.fetch(msg.member.voice.channel.id);
      if (!voice_Channel) return msg.reply("Error: The voice channel does not exist!");
      let text_Channel = await discordClient.channels.fetch(msg.channel.id);
      if (!text_Channel) return msg.reply("Error: The text channel does not exist!");
      const voice_Connection = joinVoiceChannel({
        channelId: voice_Channel.id,
        guildId: voice_Channel.guild.id,
        adapterCreator: voice_Channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true,
      });
      // voice_Connection.play(new Silence(), { type: 'opus' });
      guildMap.set(mapKey, {
          'text_Channel': text_Channel,
          'voice_Channel': voice_Channel,
          'voice_Connection': voice_Connection,
          'selected_lang': 'en',
          'debug': false,
      });
      console.log(`speak_implの実行`);
      speak_impl(voice_Connection, mapKey)
      console.log(`speak_implの実行完了`);
      voice_Connection.on('disconnect', async(e) => {
          if (e) console.log(e);
          guildMap.delete(mapKey);
      })
      msg.reply('connected!')
  } catch (e) {
      console.log('connect: ' + e)
      msg.reply('Error: unable to join your voice channel.');
      throw e;
  }
}

let recs = {}
// if (SPEECH_METHOD === 'vosk') {
//   vosk.setLogLevel(-1);
//   // MODELS: https://alphacephei.com/vosk/models
//   recs = {
//     'en': new vosk.Recognizer({model: new vosk.Model('vosk_models/en'), sampleRate: 48000}),
//     // 'fr': new vosk.Recognizer({model: new vosk.Model('vosk_models/fr'), sampleRate: 48000}),
//     // 'es': new vosk.Recognizer({model: new vosk.Model('vosk_models/es'), sampleRate: 48000}),
//   }
//   // download new models if you need
//   // dev reference: https://github.com/alphacep/vosk-api/blob/master/nodejs/index.js
// }

// 音声の切り出し
function speak_impl(voice_Connection, mapKey) {
  console.log('speak_implが呼び出されました');
  const receiver = voice_Connection.receiver;
  receiver.speaking.on('start', async (userId) => {
    console.log('userId: ', userId);
    
    // zagan
    // if (userId !== '487629687078780959') {
    // ksk
    // if (userId !== '266090864550346752') {
    //   console.log(`userId ${userId} 意外は処理対象外です。`)
    //   return;
    // }
      const user = discordClient.users.cache.get(userId)
      console.log('userId: ', userId, ', user: ', user);
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 1000,
        },
      });

      const encoder = new OpusEncoder(48000, 2);
      console.log(`エンコード`);
      let buffer  = []; 
      console.log(`バッファ準備`);
      audioStream.on("data", chunk => { buffer.push( encoder.decode( chunk ) ) }); 
      console.log(`オーディオストリームON`);
      audioStream.once("end", async () => { 
        console.log('音声ストリームが終了しました');
        
        buffer = Buffer.concat(buffer)
        const duration = buffer.length / 48000 / 4;
        console.log("duration: " + duration)
        
        if (SPEECH_METHOD === 'witai' || SPEECH_METHOD === 'google') {
          if (duration < 1.0 || duration > 19) { // 20 seconds max dur
              console.log("TOO SHORT / TOO LONG; SKPPING")
              return;
          }
        }

        try {
          let new_buffer = await convert_audio(buffer)
          let out = await transcribe(new_buffer, mapKey);
          if (out != null)
              process_commands_query(out, mapKey, user);
        } catch (e) {
            console.log('tmpraw rename: ' + e)
        }
      }); 
  }

  );
  console.log(`speak_impl準備完了`);
}

// 字幕の送信
function process_commands_query(txt, mapKey, user) {
    if (txt && txt.length) {
        let val = guildMap.get(mapKey);
        // val.text_Channel.send(user.username + ': ' + txt)
        // メインプロセスにテキストを送信
        process.send({ type: 'update-text', data: { inputName: 'ksk_subtitles', newText: txt } });
    }
}

// 各字幕AIに音声バッファを振り分け
async function transcribe(buffer, mapKey) {
  if (SPEECH_METHOD === 'witai') {
      return transcribe_witai(buffer)
  } else if (SPEECH_METHOD === 'google') {
      return transcribe_gspeech(buffer)
  } else if (SPEECH_METHOD === 'vosk') {
      let val = guildMap.get(mapKey);
      recs[val.selected_lang].acceptWaveform(buffer);
      let ret = recs[val.selected_lang].result().text;
      console.log('vosk:', ret)
      return ret;
  }
}

// WitAI
let witAI_lastcallTS = null;
async function transcribe_witai(buffer) {
    try {
        // ensure we do not send more than one request per second
        if (witAI_lastcallTS != null) {
            let now = Math.floor(new Date());    
            while (now - witAI_lastcallTS < 1000) {
                console.log('sleep')
                await sleep(100);
                now = Math.floor(new Date());
            }
        }
    } catch (e) {
        console.log('transcribe_witai 837:' + e)
    }

    try {
        console.log('transcribe_witai')
        const extractSpeechIntent = util.promisify(witClient.extractSpeechIntent);
        var stream = Readable.from(buffer);
        const contenttype = "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little"
        const output = await extractSpeechIntent(WITAI_TOK, stream, contenttype)
        witAI_lastcallTS = Math.floor(new Date());
        stream.destroy()
        if (output && typeof output === 'string') {
          const jsonArrayString = `[${output.replace(/}\s*{/g, '},{')}]`;
          // console.log(`DEAD BEEF jsonArrayString: ${jsonArrayString}`);
          const dataArray = JSON.parse([jsonArrayString]);
          // console.log(`DEAD BEEF dataArray: ${dataArray}`);
          const filteredData = dataArray.filter(item => item.type === "FINAL_UNDERSTANDING");
          const texts = filteredData.map(item => item.text);
          console.log(`DEAD BEEF texts: ${texts}`);
          return texts;
        }
        return output;
    } catch (e) {
      console.log('transcribe_witai 851:' + e); console.log(e)
    }
}

// Google Speech API
// https://cloud.google.com/docs/authentication/production
const gspeechclient = new gspeech.SpeechClient({
  projectId: 'discordbot',
  keyFilename: 'gspeech_key.json'
});

// 音声バッファを Google Cloud Speech-to-Text API で字幕に変換
async function transcribe_gspeech(buffer) {
  try {
      console.log('transcribe_gspeech')
      const bytes = buffer.toString('base64');
      const audio = {
        content: bytes,
      };
      const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 48000,
        languageCode: 'en-US',  // https://cloud.google.com/speech-to-text/docs/languages
      };
      const request = {
        audio: audio,
        config: config,
      };

      const [response] = await gspeechclient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      console.log(`gspeech: ${transcription}`);
      return transcription;

  } catch (e) { console.log('transcribe_gspeech 368:' + e) }
}

let targetUserId = null;
let users = [
]
let botSettings = {
  discordToken: null,
  serverChannelId: null,
  voiceChannelId: null
}
export function startBot(discordToken = null, serverChannelId = null, voiceChannelId = null, userId = null) {
  // loadConfig(); // 設定を読み込む
  console.log('startBot 実行 discordToken:', discordToken, ', serverChannelId: ', serverChannelId, ', voiceChannelId: ', voiceChannelId, ', userId: ', userId);

  botSettings.discordToken = discordToken;
  botSettings.serverChannelId = serverChannelId;
  botSettings.voiceChannelId = voiceChannelId;
  const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent] });

  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  if (discordToken && serverChannelId && voiceChannelId && userId) {
    targetUserId = userId;
    connectToVoiceChannel(discordToken, serverChannelId, voiceChannelId, userId);
  }
  // client.login(DISCORD_TOK); // 環境変数または設定ファイルからトークンを取得
}

// ボイスチャンネルに接続する関数
async function connectToVoiceChannel() {
  console.log('manual connect');
  const msg = {
    guild: { id: serverChannelId },
    member: {
        voice: {
            channel: { id: voiceChannelId }
        }
    },
    channel: { id: '1307282412048351293' }, //本当は字幕やログを出力するテキストチャンネルのIDを指定
    reply: (content) => {
        console.log(`Reply: ${content}`); // 返信をコンソールに出力
    },
    content: '', // 必要に応じてメッセージ内容を設定
  };

  // ここでボイスチャンネルへの接続処理を実装
  console.log(`Connecting to voiceChannelId: ${voiceChannelId} in server: ${serverChannelId} for user: ${userId}`);
  // client.login(discordToken);
  await discordClient.login(botSettings.discordToken)

  const mapKey = msg.guild.id;
  if (!guildMap.has(mapKey))
    await connect(msg, mapKey)
  else
    msg.reply('Already connected')

}

const args = process.argv.slice(2);
const [discordToken, serverChannelId, voiceChannelId, userId] = args;
startBot(discordToken, serverChannelId, voiceChannelId, userId);
// loadConfig()