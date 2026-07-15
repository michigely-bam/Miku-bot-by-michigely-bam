import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

const loadEconomy = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8')) : {};
const saveEconomy = (economy) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2));

function initUserEconomy(economy, userNumber, pushName) {
    if (!economy[userNumber]) {
        economy[userNumber] = {
            number: userNumber,
            name: pushName || 'Usuario',
            coins: 0,
            bank: 0,
            health: 100,
            mana: 50,
            minerals: { piedras: 0, diamantes: 0, esmeraldas: 0, oro: 0 }
        };
        saveEconomy(economy);
    }
    return economy[userNumber];
}

export default {
    name: 'deposit',
    alias: ['d', 'depositar'],
    category: 'Economy',
    description: 'Depositar coins al banco',

    async execute(sock, msg, { config, args, senderJid, pushName, replyWithContext }) {
        try {
            const number = senderJid.split('@')[0]; // <- FIX

            let economy = loadEconomy();
            const user = initUserEconomy(economy, number, pushName);

            const amount = args[0]?.toLowerCase();

            if (!amount) {
                return await replyWithContext(
                    `🍭 Debes proporcionar una cantidad\n> ${config.prefix}depositar +cantidad\n> ${config.prefix}depositar all`,
                    [senderJid]
                );
            }

            let depositAmount = 0;

            if (amount === 'all') {
                if (user.coins === 0) {
                    return await replyWithContext(`❌ No tienes coins para depositar`, [senderJid]);
                }
                depositAmount = user.coins;
            } else {
                depositAmount = parseInt(amount);
                if (isNaN(depositAmount) || depositAmount <= 0) {
                    return await replyWithContext(`❌ Cantidad inválida. Usa un número positivo o "all"`, [senderJid]);
                }
            }

            if (user.coins < depositAmount) {
                return await replyWithContext(
                    `❌ No tienes suficientes coins\n💰 *Tienes:* ${user.coins} coins\n🏦 *Necesitas:* ${depositAmount} coins`,
                    [senderJid]
                );
            }

            user.coins -= depositAmount;
            user.bank += depositAmount;
            saveEconomy(economy);

            await replyWithContext(
                `🏦 *Depósito completado*\n\n📥 *Cantidad:* ${depositAmount.toLocaleString()} coins\n💰 *Coins restantes:* ${user.coins} coins\n🏦 *Total en banco:* ${user.bank.toLocaleString()} coins`,
                [senderJid]
            );

        } catch (error) {
            console.error('❌ Error en deposit:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};