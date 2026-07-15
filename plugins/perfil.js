import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '../../databases/economy.json');

const saveEconomy = (d) => {
    fs.mkdirSync(path.dirname(ECONOMY_FILE), { recursive: true });
    fs.writeFileSync(ECONOMY_FILE, JSON.stringify(d, null, 2));
};
const loadEconomy = () => {
    if (!fs.existsSync(ECONOMY_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf-8')); }
    catch { return {}; }
};
const money = (n) => Number(n || 0).toLocaleString('es-AR');

export default {
    name: 'perfil',
    alias: ['profile', 'p'],
 category: 'economy',

    async execute(sock, msg, options) {
        const from = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderJid?.split('@')[0] || '0';

        if (senderNumber === '0') return sock.sendMessage(from, {text: `❌ No se pudo leer tu número`}, {quoted: msg});

        const db = loadEconomy();

        if (!db[senderNumber]) {
            return sock.sendMessage(from, {text: `❌ Usa .bank primero para crear tu cuenta`}, {quoted: msg});
        }
        const user = db[senderNumber];

        const total = (user.coins || 0) + (user.bank || 0);

        let ppUrl;
        try { ppUrl = await sock.profilePictureUrl(senderJid, 'image'); }
        catch { ppUrl = 'https://i.imgur.com/2WZAg.jpg'; }

        let estado = 'Solter@';
        const menciones = [senderJid];
        if (user.casado && db[user.casado]) {
            estado = `Casad@ con @${user.casado}`;
            menciones.push(user.casado + '@s.whatsapp.net');
        }

        const caption = `╭─「 💳 PERFIL ECONOMY 」─╮
│🌌 *User*: ${user.name || 'Usuario'}
│🌃 *Género*: ${user.genero || 'No definido'}
│📂 *Edad* : ${user.edad > 0? user.edad + ' años' : 'No definida'}
│👑 *Estado:* ${estado}
│💎 *Vip*: ${user.vip? '✅ Si' : '❌ No'}
├───────────────────
│👛 Billetera: ${money(user.coins)}
│🏦 Banco: ${money(user.bank)}
│💰 Total: ${money(total)}
╰───────────────────╯`;

        await sock.sendMessage(from, {
            image: { url: ppUrl },
            caption,
            mentions: menciones
        }, { quoted: msg });
    }
};