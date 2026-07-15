import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '../databases/economy.json');
const FEE = 5000; // Multa por divorcio

const load = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE)) : {};
const save = (d) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(d, null, 2));
const money = (n) => Number(n).toLocaleString('es-AR');

const createUser = (num, name) => ({
    number: num, name: name||'Usuario', coins: 0, bank: 0,
    genero: 'No definido', edad: 0, casado: null, vip: false,
    lastWork: 0, lastMine: 0, lastHustle: 0, lastCrime: 0, lastRob: 0, lastDaily: 0
});

export default {
    name: 'divorcio',
    alias: ['divorce', 'separar'],
 category: 'economy',

    async execute(sock, msg, { senderNumber, pushName, replyWithContext, senderJid }) {
        const db = load();
        if (!db[senderNumber]) db[senderNumber] = createUser(senderNumber, pushName);
        const u = db[senderNumber];

        if (!u.casado) return replyWithContext(`❌ No estas casad@ we`, [senderJid]);
        if (!db[u.casado]) db[u.casado] = createUser(u.casado, 'Usuario');
        const ex = db[u.casado];

        if (u.coins < FEE) 
            return replyWithContext(`❌ Necesitas ${money(FEE)} Coins para la multa de divorcio`, [senderJid]);

        const exNum = u.casado;
        u.coins -= FEE;
        u.casado = null;
        ex.casado = null;
        save(db);

        replyWithContext(`💔 @${senderNumber} se divorcio de @${exNum}\nPago una multa de ${money(FEE)} Coins\nAhora son Solter@`, [senderJid, senderJid, exNum + '@s.whatsapp.net']);
    }
};