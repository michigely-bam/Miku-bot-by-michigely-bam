import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '../databases/economy.json');

const load = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE)) : {};
const save = (d) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(d, null, 2));
const money = (n) => Number(n).toLocaleString('es-AR');

const createUser = (num, name) => ({
    number: num, name: name||'Usuario', coins: 0, bank: 0,
    genero: 'No definido', edad: 0, casado: null, vip: false,
    lastWork: 0, lastMine: 0, lastHustle: 0, lastCrime: 0, lastRob: 0, lastDaily: 0
});

const SHOP = {
    vip: { price: 50000, name: 'VIP' }
};

export default {
    name: 'buy',
 category: 'economy',

    async execute(sock, msg, { senderNumber, pushName, args, replyWithContext, senderJid }) {
        const db = load();
        if (!db[senderNumber]) db[senderNumber] = createUser(senderNumber, pushName);
        const u = db[senderNumber];

        const item = args[0]?.toLowerCase();
        if (!item ||!SHOP[item])
            return replyWithContext(`❌ Usa:.buy vip\nUsa.tienda para ver precios`, [senderJid]);

        const product = SHOP[item];

        if (item === 'vip') {
            if (u.vip) return replyWithContext(`❌ Ya sos VIP 💎`, [senderJid]);
            if (u.coins < product.price)
                return replyWithContext(`❌ Te faltan ${money(product.price - u.coins)} Coins`, [senderJid]);

            u.coins -= product.price;
            u.vip = true;
            save(db);
            return replyWithContext(`✅ Compraste VIP 💎 por ${money(product.price)} Coins\nAhora tenes +50% en.daily`, [senderJid]);
        }
    }
};