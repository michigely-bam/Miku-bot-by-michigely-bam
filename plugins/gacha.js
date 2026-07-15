import fs from 'fs';
import fetch from 'node-fetch';

const DB_PATH = './src/database/gacha.json';
const ROLL_LOCKS = new Map();
const COOLDOWN = 15 * 60 * 1000; // 15 min igual que tu código

// 1x1px transparente pa evitar errores de imagen
const DEFAULT_IMG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

function cleanOldLocks() {
  const now = Date.now();
  for (const [userId, lockTime] of ROLL_LOCKS.entries()) {
    if (now - lockTime > 30000) ROLL_LOCKS.delete(userId);
  }
}

function loadDB() {
  if (!fs.existsSync('./src/database')) fs.mkdirSync('./src/database', { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ chars: {}, users: {}, rolls: {}, cd: {} }));
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data));
}

function flattenCharacters(chars) {
  return Object.values(chars).flatMap(s => Array.isArray(s.characters)? s.characters : []);
}

function getSeriesNameByCharacter(chars, id) {
  return Object.entries(chars).find(([, serie]) => Array.isArray(serie.characters) && serie.characters.some(c => String(c.id) === String(id)))?.[1]?.name || 'Desconocido';
}

function formatTag(tag) {
  return String(tag).trim().toLowerCase().replace(/\s+/g, '_');
}

function getRefererForUrl(url) {
  if (url.includes('safebooru.org')) return 'https://safebooru.org/';
  if (url.includes('danbooru.donmai.us')) return 'https://danbooru.donmai.us/';
  if (url.includes('gelbooru.com')) return 'https://gelbooru.com/';
  return '';
}

async function buscarImagenDelirius(tag) {
  const query = formatTag(tag);
  const urls = [
    `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${query}`,
    `https://danbooru.donmai.us/posts.json?tags=${query}`,
    `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${query}&api_key=98f554258c88c44f4dd28ccde0c28f36682b2a992490ab35ebcc7baf7e196a86d7550b174bce577b8cc3f544e9b3ad0f6aeb09ad63bf89a9141cc3eddb6fbfd2&user_id=1917269`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
      const type = res.headers.get('content-type') || '';
      if (!res.ok ||!type.includes('json')) continue;
      const json = await res.json();
      const data = Array.isArray(json)? json : json?.post || json?.data || [];
      const valid = data.map(i => i?.file_url || i?.large_file_url || i?.image || i?.media_asset?.variants?.[0]?.url).filter(u => typeof u === 'string' && /\.(jpe?g|png)$/.test(u));
      if (valid.length) return valid;
    } catch {}
  }
  return [];
}

export default {
    name: 'gacha',
    alias: ['rollwaifu', 'rw', 'roll', 'tirar'],
    categoría: 'DIVERSION',
    descripción: 'Waifu o husbando aleatorio cada 15min. Usa.claim para reclamar',

    async execute(sock, msg, options) {
        const from = msg.key.remoteJid;
        cleanOldLocks();
        const data = loadDB();

        try {
            const { config, usersDB, senderNumber, senderJid, pushName } = options;
            const prefix = config.prefix;
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const command = body.slice(prefix.length).trim().split(' ')[0].toLowerCase();
            const userId = senderJid;
            const chatId = from;
            const now = Date.now();

            if (usersDB && senderNumber &&!usersDB[senderNumber]) {
                return await sock.sendMessage(from, { text: `[ ★ ] Regístrate: ${prefix}reg Misa.16` }, { quoted: msg });
            }

            if (ROLL_LOCKS.has(userId)) {
              const lockTime = ROLL_LOCKS.get(userId);
              if (now - lockTime < 15000) return;
              ROLL_LOCKS.delete(userId);
            }

            // Cooldown 15min por usuario
            const lastRoll = data.cd[userId] || 0;
            if (now < lastRoll) {
              const r = Math.ceil((lastRoll - now) / 1000);
              const min = Math.floor(r / 60);
              const sec = r % 60;
              let timeText = '';
              if (min > 0) timeText += `${min} minuto${min!== 1? 's' : ''} `;
              if (sec > 0 || timeText === '') timeText += `${sec} segundo${sec!== 1? 's' : ''}`;
              return await sock.sendMessage(from, { text: `ꕥ Espera *${timeText.trim()}* para usar *${prefix}rw* de nuevo.` }, { quoted: msg });
            }

            ROLL_LOCKS.set(userId, now);

            // Cargar personajes desde characters.json
            const FILE_PATH = './core/characters.json';
            let chars = {};
            try {
              if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, '{}');
              chars = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
            } catch { chars = {}; }

            const all = flattenCharacters(chars);
            if (!all.length) {
              ROLL_LOCKS.delete(userId);
              return await sock.sendMessage(from, { text: 'ꕥ No hay personajes en `./core/characters.json`' }, { quoted: msg });
            }

            const selected = all[Math.floor(Math.random() * all.length)];
            const id = String(selected.id);
            const source = getSeriesNameByCharacter(chars, selected.id);
            const baseTag = formatTag(selected.tags?.[0] || selected.name || '');

            // Buscar imagen. Si falla usa buffer
            const mediaList = await buscarImagenDelirius(baseTag);
            let buffer = DEFAULT_IMG;
            if (mediaList.length) {
              try {
                const media = mediaList[Math.floor(Math.random() * mediaList.length)];
                const imgRes = await fetch(media, {
                  timeout: 15000,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': getRefererForUrl(media)
                  }
                });
                buffer = Buffer.from(await imgRes.arrayBuffer());
              } catch {}
            }

            const charKey = chatId + '__' + id;
            if (!data.chars[charKey]) {
              data.chars[charKey] = { name: String(selected.name || 'Sin nombre') };
            }
            data.chars[charKey].name = String(selected.name || 'Sin nombre');
            data.chars[charKey].value = Number(selected.value) || 100;
            data.chars[charKey].reservedBy = userId;
            data.chars[charKey].reservedUntil = now + 20000;
            data.chars[charKey].expiresAt = now + 60000;

            const claimedBy = data.chars[charKey]?.user || null;
            const owner = claimedBy? claimedBy.split('@')[0] : 'desconocido';
            const caption = `❀ Nombre » *${data.chars[charKey].name}*\n⚥ Género » *${selected.gender || 'Desconocido'}*\n✰ Valor » *${data.chars[charKey].value.toLocaleString()}*\n♡ Estado » *${claimedBy? `Reclamado por ${owner}` : 'Libre'}*\n❖ Fuente » *${source}*`;

            const sent = await sock.sendMessage(chatId, { image: buffer, caption: caption }, { quoted: msg });

            data.rolls[sent.key.id] = { id, charKey, name: data.chars[charKey].name, expiresAt: data.chars[charKey].expiresAt, reservedBy: userId, reservedUntil: data.chars[charKey].reservedUntil };
            data.cd[userId] = now + COOLDOWN;
            saveDB(data);

        } catch (e) {
            await sock.sendMessage(from, { text: `> Error al ejecutar *${command}*\n> [Error: *${e.message}*]` }, { quoted: msg });
        } finally {
            ROLL_LOCKS.delete(userId);
        }
    }
};