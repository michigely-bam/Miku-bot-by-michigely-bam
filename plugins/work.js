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
            bank: 0, // <- AGREGADO
            mana: 50, // <- AGREGADO
            minerals: { piedras: 0, diamantes: 0, esmeraldas: 0, oro: 0 },
            health: 100,
            lastMine: 0, lastWork: 0, lastCrime: 0,
            items: { agua: 0, vendas: 0, pastillas: 0 }
        };
        saveEconomy(economy);
    }
    return economy[userNumber];
}

function getRemainingTime(lastUsed, cooldownMs = 120000) {
    const now = Date.now();
    const timePassed = now - lastUsed;
    if (timePassed >= cooldownMs) return 0;
    const remaining = cooldownMs - timePassed;
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export default {
    name: 'trabajar',
    alias: ['work', 'w'],
    category: 'Economy',
    description: 'Trabajar para ganar coins',

    async execute(sock, msg, { config, pushName, replyWithContext, senderJid }) {
        try {
            const number = senderJid.split('@')[0]; // <- FIX PRINCIPAL
            const from = msg.key.remoteJid;

            let economy = loadEconomy();
            const user = initUserEconomy(economy, number, pushName);

            if (user.health <= 10) {
                return await replyWithContext('⚠️ *Tu salud es muy baja para seguir trabajando* ⚠️\n> Usa *heal* para recuperarte', [senderJid]);
            }

            const cooldownTime = 120000;
            const now = Date.now();

            if (user.lastWork && (now - user.lastWork) < cooldownTime) {
                const remaining = getRemainingTime(user.lastWork, cooldownTime);
                return await replyWithContext(`⏳ *Debes esperar ${remaining}* para volver a trabajar`, [senderJid]);
            }

            user.lastWork = now;

            const coinsGanados = Math.floor(Math.random() * 80) + 30; // 30-110
            const healthLoss = Math.floor(Math.random() * 8) + 3; // 3-10

            user.coins += coinsGanados;
            user.health = Math.max(0, user.health - healthLoss);

            saveEconomy(economy);

            const rewardText = `💼 *TRABAJO*\n🧭 Conseguiste un trabajo temporal\n🎑 *RECOMPENSA*\n\n💰 Coins » *+${coinsGanados}*\n❤️ Salud perdida » *-${healthLoss}*`;

            await replyWithContext(rewardText, [senderJid]);

        } catch (error) {
            console.error('❌ Error en comando trabajar:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};