const prefijosArabes = ['20','212','213','216','218','222','249','252','253','269','961','962','963','964','965','966','967','968','970','971','973','974'];

// Ruta local por si el handler no pasa db
import fs from 'fs';
import path from 'path';
const DB_FILE = path.join(process.cwd(), 'database.json');

function loadDB() {
    if (!fs.existsSync(DB_FILE)) return { chats: {} };
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch {
        return { chats: {} };
    }
}
function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export default {
    name: 'anti-arabe',
    alias: ['antiarabe', 'noarabe'],
    category: 'Grupo',

    async execute(sock, msg, options) {
        const { args } = options;
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        // USAMOS NUESTRA DB SI EL HANDLER NO MANDO NADA
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

        if (!args[0]) {
            return await sock.sendMessage(from, { text: `🌌 *ANTI-ÁRABE*\nEstado: ${db.chats[from].antiArabe? '✅ ON' : '❌ OFF'}\n\nUso:.anti-arabe on/off` }, { quoted: msg });
        }

        if (args[0] === 'on') {
            db.chats[from].antiArabe = true;
            saveDB(db); // Guardamos
            await sock.sendMessage(from, { text: '🌌 Anti-Árabe: ✅ ACTIVADO\nLimpiando...' }, { quoted: msg });

            const expulsar = [];
            for (const p of metadata.participants) {
                const num = p.id.split('@')[0];
                if (prefijosArabes.some(pref => num.startsWith(pref)) && p.id!== botJid &&!p.admin) {
                    expulsar.push(p.id);
                }
            }

            if (expulsar.length === 0) return await sock.sendMessage(from, { text: '✅ Grupo limpio.' });

            let ok = 0, fail = 0;
            for(const jid of expulsar) {
                const res = await sock.groupParticipantsUpdate(from, [jid], 'remove');
                if (res[0]?.status === 200) ok++;
                else fail++;
                await new Promise(r => setTimeout(r, 2000));
            }
            return await sock.sendMessage(from, { text: `✅ Expulsados: ${ok}\n❌ Fallidos: ${fail}` });
        }

        if (args[0] === 'off') {
            db.chats[from].antiArabe = false;
            saveDB(db); // Guardamos
            return await sock.sendMessage(from, { text: '🌌 Anti-Árabe: ❌ DESACTIVADO' }, { quoted: msg });
        }
    },

    before: async function(m, { sock }) {
        if (!m.isGroup) return;
        const chat = m.key.remoteJid;
        const db = loadDB(); // Cargamos nosotros
        if (!db.chats?.antiArabe) return;
        if (m.isBaileys || m.fromMe) return;

        const metadata = await sock.groupMetadata(chat);
        const isSenderAdmin = metadata.participants.find(p => p.id === m.sender)?.admin;
        if (isSenderAdmin) return;

        const num = m.sender.split('@')[0];
        if (prefijosArabes.some(pref => num.startsWith(pref))) {
            await sock.groupParticipantsUpdate(chat, [m.sender], 'remove').catch(() => {});
            const prefijo = num.match(/^\d{2,3}/)?.[0] || '??';
            await sock.sendMessage(chat, { text: `🚫 @${num} expulsado por +${prefijo} 🫟`, mentions: [m.sender] });
        }
    }
};