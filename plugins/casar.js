import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '../databases/economy.json');
const PRICE = 10000; // Precio del anillo

const load = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE)) : {};
const save = (d) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(d, null, 2));
const money = (n) => Number(n).toLocaleString('es-AR');

const createUser = (num, name) => ({
    number: num, name: name||'Usuario', coins: 0, bank: 0,
    genero: 'No definido', edad: 0, casado: null, vip: false,
    lastWork: 0, lastMine: 0, lastHustle: 0, lastCrime: 0, lastRob: 0, lastDaily: 0
});

export default {
    name: 'casar',
    alias: ['marry'],
 category: 'economy',

    async execute(sock, msg, { senderNumber, pushName, mentionedJid, replyWithContext, senderJid }) {
        const db = load();
        if (!db[senderNumber]) db[senderNumber] = createUser(senderNumber, pushName);
        const u = db[senderNumber];

        const targetJid = mentionedJid?.[0];
        if (!targetJid) return replyWithContext(`❌ Menciona a alguien:.casar @user`, [senderJid]);
        
        const targetNum = targetJid.split('@')[0];
        if (targetNum === senderNumber) return replyWithContext(`❌ No te podes casar solo we`, [senderJid]);
        if (!db[targetNum]) db[targetNum] = createUser(targetNum, 'Usuario');
        const t = db[targetNum];

        if (u.casado) return replyWithContext(`❌ Ya estas casad@ con @${u.casado}`, [senderJid, senderJid]);
        if (t.casado) return replyWithContext(`❌ @${targetNum} ya esta casad@`, [senderJid, targetJid]);
        if (u.coins < PRICE) return replyWithContext(`❌ Necesitas ${money(PRICE)} Coins para el anillo`, [senderJid]);

        u.coins -= PRICE;
        u.casado = targetNum;
        t.casado = senderNumber;
        save(db);

        replyWithContext(`💍 @${senderNumber} se caso con @${targetNum} por ${money(PRICE)} Coins\nAhora aparecen en el.perfil 👑`, [senderJid, senderJid, targetJid]);
    }
};