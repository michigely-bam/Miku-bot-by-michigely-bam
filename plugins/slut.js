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
            mana: 50,
            minerals: { piedras: 0, diamantes: 0, esmeraldas: 0, oro: 0 },
            health: 100,
            lastMine: 0, lastWork: 0, lastCrime: 0, lastSlut: 0, // <- AGREGADO
            items: { agua: 0, vendas: 0, pastillas: 0 }
        };
        saveEconomy(economy);
    }
    return economy[userNumber];
}

function getRemainingTime(lastUsed, cooldownMs = 180000) {
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
    name: 'slut',
    alias: ['prosti'],
    category: 'Economy',
    description: 'Gana coins de forma... dudosa',

    async execute(sock, msg, { pushName }) {
        try {
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const senderJid = isGroup? msg.key.participant : msg.key.remoteJid;
            const number = senderJid.split('@')[0];

            let economy = loadEconomy();
            const user = initUserEconomy(economy, number, pushName);

            // Cooldown 3 minutos
            const cooldownTime = 180000;
            const now = Date.now();

            if (user.lastSlut && (now - user.lastSlut) < cooldownTime) {
                const remaining = getRemainingTime(user.lastSlut, cooldownTime);
                return await sock.sendMessage(from, {
                    text: `⏳ *Debes esperar ${remaining}* para volver a hacer esto`
                }, { quoted: msg });
            }

            if (user.health <= 15) {
                return await sock.sendMessage(from, {
                    text: `⚠️ *Estás muy débil para esto*\n> Usa *heal* para recuperarte`
                }, { quoted: msg });
            }

            user.lastSlut = now;

            const coinsGanados = Math.floor(Math.random() * 150) + 50; // 50-200
            const healthLoss = Math.floor(Math.random() * 12) + 5; // 5-16

            user.coins += coinsGanados;
            user.health = Math.max(0, user.health - healthLoss);

            const trabajos = [
                'vendiste fotos',
                'hiciste un show privado',
                'limpiaste una casa... y algo más',
                'fuiste modelo por 1 hora',
                'entretuviste a un millonario aburrido'
            ];
            const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];

            saveEconomy(economy);

            const rewardText = `💋 *TRABAJO NOCTURNO*\n🧭 ${trabajo}\n\n🎑 *RECOMPENSA*\n💰 Coins » *+${coinsGanados}*\n❤️ Salud perdida » *-${healthLoss}*\n\n> Cooldown: 3 minutos`;

            await sock.sendMessage(from, { text: rewardText }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en comando slut:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};