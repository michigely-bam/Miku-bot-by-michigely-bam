import fs from 'fs';
import path from 'path';
const DB_FILE = path.join(process.cwd(), 'database.json');

function loadDB() {
    if (!fs.existsSync(DB_FILE)) return { chats: {} };
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
    catch { return { chats: {} }; }
}
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// FIX 1: Sin la g global para que test() no falle
const regexLink = /(https?:\/\/)?(www\.)?(chat\.whatsapp\.com|wa\.me\/c\/)[^\s]+/i;

export default {
    name: 'antilink',
    alias: ['antilink'],
    category: 'admin',

    async execute(sock, msg, options) {
        const { args } = options;
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const db = options.db || loadDB();

        const metadata = await sock.groupMetadata(from).catch(() => null);
        if (!metadata) return await sock.sendMessage(from, { text: '🌌 Error: No pude leer el grupo' }, { quoted: msg });

        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const senderData = metadata.participants.find(p => p.id === sender);
        const botData = metadata.participants.find(p => p.id === botJid);

        const esAdmin = senderData?.admin === 'admin' || senderData?.admin === 'superadmin';
        const botEsAdmin = botData?.admin === 'admin' || botData?.admin === 'superadmin';

        if (!esAdmin) return await sock.sendMessage(from, { text: '🌌 Solo admins 🫟' }, { quoted: msg });
        if (!botEsAdmin) return await sock.sendMessage(from, { text: '🌌 Dame admin primero' }, { quoted: msg });

        if (!db.chats[from]) db.chats[from] = {};

        if (!args[0]) return await sock.sendMessage(from, { text: `🌌 *ANTI-LINK WA*\nEstado: ${db.chats[from].antiLink? '✅ ON' : '❌ OFF'}\nUso:.antilink on/off` }, { quoted: msg });

        if (args[0] === 'on') {
            db.chats[from].antiLink = true;
            saveDB(db);
            return await sock.sendMessage(from, { text: '🌌 Anti-Link WA: ✅ ACTIVADO' }, { quoted: msg });
        }
        if (args[0] === 'off') {
            db.chats[from].antiLink = false;
            saveDB(db);
            return await sock.sendMessage(from, { text: '🌌 Anti-Link WA: ❌ DESACTIVADO' }, { quoted: msg });
        }
    },

    before: async function(m, { sock }) {
        if (!m.isGroup) return;
        const chat = m.key.remoteJid;
        const db = loadDB();
        if (!db.chats?.antiLink) return;
        if (m.isBaileys || m.fromMe) return;

        const metadata = await sock.groupMetadata(chat);
        const senderData = metadata.participants.find(p => p.id === m.sender);
        if (senderData?.admin) return;

        // FIX 2: Leer texto de todos lados: texto, caption, extendedText
        const texto = m.message?.conversation
            || m.message?.extendedTextMessage?.text
            || m.message?.imageMessage?.caption
            || m.message?.videoMessage?.caption
            || '';

        if (regexLink.test(texto)) {
            console.log('🌌 [ANTILINK] Link detectado:', texto); // Pa' debug

            // FIX 3: Borrar y expulsar con try/catch
            await sock.sendMessage(chat, { delete: m.key }).catch(e => console.log('Error delete:', e));
            await sock.groupParticipantsUpdate(chat, [m.sender], 'remove').catch(e => console.log('Error kick:', e));

            const num = m.sender.split('@')[0];
            await sock.sendMessage(chat, { text: `🚫 @${num} expulsado por mandar link de grupo/canal 🫟`, mentions: [m.sender] });
        }
    }
};