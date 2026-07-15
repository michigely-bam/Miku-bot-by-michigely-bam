import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

const loadEconomy = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8')) : {};
const saveEconomy = (economy) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2), 'utf8');

function initUserEconomy(economy, userNumber, pushName) {
    if (!economy[userNumber]) {
        economy[userNumber] = {
            number: userNumber,
            name: pushName || 'Usuario',
            coins: 0,
            bank: 0,
            mana: 50,
            minerals: { piedras: 0, diamantes: 0, esmeraldas: 0, oro: 0 },
            health: 100,
            lastMine: 0, lastWork: 0, lastCrime: 0, lastAdventure: 0, lastClaim: 0, lastChest: 0,
            items: { agua: 0, vendas: 0, pastillas: 0 }
        };
        saveEconomy(economy);
    }
    return economy[userNumber];
}

function formatRemainingTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default {
    name: 'daily',
    alias: ['claim', 'recompensa', 'd'],
    category: 'Economy',
    description: 'Reclama tu recompensa diaria',

    async execute(sock, msg, { config, pushName }) {
        try {
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const senderJid = isGroup? msg.key.participant : msg.key.remoteJid;
            const senderNumber = senderJid.split('@')[0];

            let economy = loadEconomy();
            const user = initUserEconomy(economy, senderNumber, pushName);

            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000; // 24 horas

            // Verificar cooldown
            if (user.lastClaim && (now - user.lastClaim) < cooldown) {
                const timeLeft = cooldown - (now - user.lastClaim);
                const formattedTime = formatRemainingTime(timeLeft);

                return await sock.sendMessage(from, {
                    text: `⏳ *Ya reclamaste tu daily*\n\n> Vuelve en: *${formattedTime}*`
                }, { quoted: msg });
            }

            // Generar recompensa
            const coinsBase = 200;
            const randomBonus = Math.floor(Math.random() * 150); // 0-150
            const totalCoins = coinsBase + randomBonus;

            user.coins += totalCoins;
            user.minerals.diamantes += 5;
            user.minerals.esmeraldas += 8;
            user.minerals.oro += 10;
            user.items.agua += 2;
            user.items.vendas += 1;
            user.lastClaim = now;

            saveEconomy(economy);

            const claimText = `🎁 *RECOMPENSA DIARIA*\n\n` +
                `💰 Coins » *+${totalCoins}* (${coinsBase} base + ${randomBonus} bonus)\n` +
                `💎 Diamantes » *+5*\n` +
                `💚 Esmeraldas » *+8*\n` +
                `🪙 Oro » *+10*\n` +
                `🍶 Agua » *+2*\n` +
                `🩹 Vendas » *+1*\n\n` +
                `> Vuelve en 24 horas`;

            await sock.sendMessage(from, { text: claimText }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en comando daily:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`
            }, { quoted: msg });
        }
    }
};