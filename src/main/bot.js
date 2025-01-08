console.log('bot.jsが読み込まれました');
process.send({ type: 'log-message', data: 'bot.jsが読み込まれました' });

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
import opus from '@discordjs/opus'; // デフォルトエクスポートをインポート
const { OpusEncoder } = opus; // 必要なエクスポートを取得
import https from 'https'; // requireをimportに変更
import { Client, IntentsBitField } from 'discord.js'; // requireをimportに変更
import { joinVoiceChannel, EndBehaviorType } from '@discordjs/voice'; // requireをimportに変更
import witClient from 'node-witai-speech'; // requireをimportに変更
import gspeech from '@google-cloud/speech'; // requireをimportに変更

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
        console.log('convert_audio: ' + e)
        process.send({ type: 'log-message', data: 'convert_audio: ' + e });
        throw e;
    }
}

const SETTINGS_FILE = 'settings.json';

function listWitAIApps(cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps?offset=0&limit=100',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+botSettings.witaiToken,
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
        'Authorization': 'Bearer '+botSettings.witaiToken,
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
    process.send({ type: 'log-message', data: `Discord client on ${discordClient.user.tag}!` });
})

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
          process.send({ type: 'log-message', data: `*joinが呼び出されました: ${!msg.member.voice.channel.id}` });
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
            if (botSettings.subtitleMethod === 'witai') {
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
            } else if (botSettings.subtitleMethod === 'vosk') {
              let val = guildMap.get(mapKey);
              const lang = msg.content.replace(_CMD_LANG, '').trim().toLowerCase()
              val.selected_lang = lang;
            } else {
              msg.reply('Error: this feature is only for Google')
            }
        }
    } catch (e) {
        console.log('discordClient message: ' + e)
        process.send({ type: 'log-message', data: `discordClient message: ${e}` });
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
  process.send({ type: 'log-message', data: `connect msg: ${JSON.stringify(msg, null, 2)}, mapKey: ${mapKey}` });
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
      speak_impl(voice_Connection, mapKey)
      voice_Connection.on('disconnect', async(e) => {
          if (e) console.log(e);
          guildMap.delete(mapKey);
      })
      msg.reply('voice channel connected!!')
      process.send({ type: 'log-message', data: `voice channel connected!` });
  } catch (e) {
      console.log('connect: ' + e)
      process.send({ type: 'log-message', data: `connect: ${e}` });
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
  const receiver = voice_Connection.receiver;
  receiver.speaking.on('start', async (userId) => {    
    // zagan
    // if (userId !== '487629687078780959') {
    // ksk
    // if (userId !== '266090864550346752') {
    // userId
    if (userId !== users[0].userId) {
      // console.log(`userId ${userId} 意外は処理対象外です。`)
      return;
    }

      const user = discordClient.users.cache.get(userId)
      console.log('userId: ', userId, ', user: ', user);
      process.send({ type: 'log-message', data: `userId: ${userId}, user: ${JSON.stringify(user, null, 2)}` });
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 1000,
        },
      });

      const encoder = new OpusEncoder(48000, 2);
      let buffer  = []; 
      audioStream.on("data", chunk => { buffer.push( encoder.decode( chunk ) ) }); 
      audioStream.once("end", async () => { 
        
        buffer = Buffer.concat(buffer)
        const duration = buffer.length / 48000 / 4;
        console.log("duration: " + duration)
        process.send({ type: 'log-message', data: `duration: ${duration}` });
        
        if (botSettings.subtitleMethod === 'witai' || botSettings.subtitleMethod === 'google') {
          if (duration < 1.0 || duration > 19) { // 20 seconds max dur
              console.log("TOO SHORT / TOO LONG; SKPPING")
              process.send({ type: 'log-message', data: `TOO SHORT / TOO LONG; SKPPING` });
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
}

// 字幕の送信
function process_commands_query(txt, mapKey, user) {
    if (txt && txt.length) {
        let val = guildMap.get(mapKey);
        // val.text_Channel.send(user.username + ': ' + txt)
        // メインプロセスにテキストを送信
        process.send({ type: 'update-text', data: { inputName: users[0].inputName, newText: txt } });
    }
}

// 各字幕AIに音声バッファを振り分け
async function transcribe(buffer, mapKey) {
  if (botSettings.subtitleMethod === 'witai') {
      return transcribe_witai(buffer)
  } else if (botSettings.subtitleMethod === 'google') {
      return transcribe_gspeech(buffer)
  } else if (botSettings.subtitleMethod === 'vosk') {
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
        process.send({ type: 'log-message', data: `transcribe_witai 837: ${e}` });
    }

    try {
        console.log('transcribe_witai')
        process.send({ type: 'log-message', data: `transcribe_witai` });
        const extractSpeechIntent = util.promisify(witClient.extractSpeechIntent);
        var stream = Readable.from(buffer);
        const contenttype = "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little"
        const output = await extractSpeechIntent(botSettings.witaiToken, stream, contenttype)
        witAI_lastcallTS = Math.floor(new Date());
        stream.destroy()
        if (output && typeof output === 'string') {
          const jsonArrayString = `[${output.replace(/}\s*{/g, '},{')}]`;
          const dataArray = JSON.parse([jsonArrayString]);
          const filteredData = dataArray.filter(item => item.type === "FINAL_UNDERSTANDING");
          const texts = filteredData.map(item => item.text);
          return texts;
        }
        return output;
    } catch (e) {
      console.log('transcribe_witai 851:' + e); console.log(e)
      process.send({ type: 'log-message', data: `transcribe_witai 851: ${e}` });
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
  {userId: null, inputName: null}
]

let botSettings = {
  discordToken: null,
  serverChannelId: null,
  voiceChannelId: null,
  subtitleMethod: null,
  witaiToken: null
}

export function startBot(discordToken = null, serverChannelId = null, voiceChannelId = null, userId = null, inputName = null, subtitleMethod = null, witaiToken = null) {
  console.log('startBot running discordToken:', discordToken, ', serverChannelId: ', serverChannelId, ', voiceChannelId: ', voiceChannelId, ', userId: ', userId);
  process.send({ type: 'log-message', data: `startBot running discordToken: ${discordToken}, serverChannelId: ${serverChannelId}, voiceChannelId: ${voiceChannelId}, userId: ${userId}` });

  botSettings.discordToken = discordToken;
  botSettings.serverChannelId = serverChannelId;
  botSettings.voiceChannelId = voiceChannelId;
  botSettings.inputName = inputName;
  botSettings.subtitleMethod = subtitleMethod;
  botSettings.witaiToken = witaiToken;
  users[0].userId = userId;
  users[0].inputName = inputName;

  const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent] });

  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  if (discordToken && serverChannelId && voiceChannelId && userId) {
    targetUserId = userId;
    connectToVoiceChannel();
  }
}

// ボイスチャンネルに接続する関数
async function connectToVoiceChannel() {
  const msg = {
    guild: { id: botSettings.serverChannelId },
    member: {
        voice: {
            channel: { id: botSettings.voiceChannelId }
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
  process.send({ type: 'log-message', data: `Connecting to voiceChannelId: ${voiceChannelId} in server: ${serverChannelId} for user: ${userId}` });
  await discordClient.login(botSettings.discordToken)

  const mapKey = msg.guild.id;
  if (!guildMap.has(mapKey))
    await connect(msg, mapKey)
  else
    process.send({ type: 'log-message', data: `Already connected` });
    msg.reply('Already connected')
}

const args = process.argv.slice(2);
const [discordToken, serverChannelId, voiceChannelId, userId, inputName, subtitleMethod, witaiToken] = args;
startBot(discordToken, serverChannelId, voiceChannelId, userId, inputName, subtitleMethod, witaiToken);

process.on('message', (msg) => {
  if (msg === 'shutdown') {
      shutdown(); // 特定の関数を実行
  }
});

function shutdown() {
  process.send({ type: 'log-message', data: `The BOT process will terminate. Cleanup process in progress...` });
  console.log('The BOT process will terminate. Cleanup process in progress...');

  const msg = {
    guild: { id: botSettings.serverChannelId },
    member: {
        voice: {
            channel: { id: botSettings.voiceChannelId }
        }
    },
    channel: { id: '1307282412048351293' }, //本当は字幕やログを出力するテキストチャンネルのIDを指定
    reply: (content) => {
        console.log(`Reply: ${content}`); // 返信をコンソールに出力
    },
    content: '', // 必要に応じてメッセージ内容を設定
  };
  const mapKey = msg.guild.id;

  // クリーンアップ処理をここに追加
  if (guildMap.has(mapKey)) {
    let val = guildMap.get(mapKey);
    if (val.voice_Channel) val.voice_Channel.leave()
    if (val.voice_Connection) val.voice_Connection.disconnect()
    guildMap.delete(mapKey)
    msg.reply("Disconnected.")
    process.send({ type: 'log-message', data: `Disconnected.` });
    } else {
      msg.reply("Cannot leave because not connected.")
      process.send({ type: 'log-message', data: `Cannot leave because not connected.` });
    }
  process.exit(0); // プロセスを終了
}