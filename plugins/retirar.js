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
    name: 'retirar',
    alias: ['withdraw', 'w', 'wdr'],
    category: 'Economy',
    description: 'Retirar coins del banco',

    async execute(sock, msg, { config, args, senderJid, pushName, replyWithContext }) {
        try {
            const number = senderJid.split('@')[0]; // <- IMPORTANTE

            let economy = loadEconomy();
            const user = initUserEconomy(economy, number, pushName);

            const amount = args[0]?.toLowerCase();

            if (!amount) {
                return await replyWithContext(
                    `🏦 Debes proporcionar una cantidad\n> ${config.prefix}retirar +cantidad\n> ${config.prefix}retirar all`,
                    [senderJid]
                );
            }

            let withdrawAmount = 0;

            if (amount === 'all') {
                if (user.bank === 0) {
                    return await replyWithContext(`❌ No tienes coins en el banco para retirar`, [senderJid]);
                }
                withdrawAmount = user.bank;
            } else {
                withdrawAmount = parseInt(amount);
                if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
                    return await replyWithContext(`❌ Cantidad inválida. Usa un número positivo o "all"`, [senderJid]);
                }
            }

            if (user.bank < withdrawAmount) {
                return await replyWithContext(
                    `❌ No tienes suficientes coins en el banco\n🏦 *Tienes en banco:* ${user.bank} coins\n📤 *Necesitas:* ${withdrawAmount} coins`,
                    [senderJid]
                );
            }

            user.bank -= withdrawAmount;
            user.coins += withdrawAmount;
            saveEconomy(economy);

            await replyWithContext(
                `💰 *Retiro completado*\n\n📤 *Cantidad:* ${withdrawAmount.toLocaleString()} coins\n💰 *Coins en mano:* ${user.coins} coins\n🏦 *Queda en banco:* ${user.bank.toLocaleString()} coins`,
                [senderJid]
            );

        } catch (error) {
            console.error('❌ Error en retirar:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};