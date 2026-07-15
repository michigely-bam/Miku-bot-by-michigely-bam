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
    name: 'pagar',
    alias: ['transfer', 'pay', 'enviar', 'dar'],
    category: 'Economy',
    description: 'Transferir coins a otro usuario',

    async execute(sock, msg, { config, args, senderJid, pushName, replyWithContext }) {
        try {
            const fromNumber = senderJid.split('@')[0];
            const fromName = pushName || 'Usuario';

            let economy = loadEconomy();
            const sender = initUserEconomy(economy, fromNumber, fromName);

            // Obtener al mencionado o al número del argumento
            let targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!targetJid && args[0]) {
                const num = args[0].replace(/[^0-9]/g, '');
                targetJid = num + '@s.whatsapp.net';
            }

            if (!targetJid) {
                return await replyWithContext(
                    `💸 *Uso:* ${config.prefix}pagar @usuario cantidad\n*Ejemplo:* ${config.prefix}pagar @5219992042946 100`,
                    [senderJid]
                );
            }

            const toNumber = targetJid.split('@')[0];

            if (toNumber === fromNumber) {
                return await replyWithContext(`❌ No puedes pagarte a ti mismo`, [senderJid]);
            }

            const amount = parseInt(args[args[0]? 1 : 0]);
            if (isNaN(amount) || amount <= 0) {
                return await replyWithContext(`❌ Ingresa una cantidad válida de coins`, [senderJid]);
            }

            if (amount < 10) {
                return await replyWithContext(`❌ El mínimo para transferir son 10 coins`, [senderJid]);
            }

            if (sender.coins < amount) {
                return await replyWithContext(
                    `❌ No tienes suficientes coins\n💰 *Tienes:* ${sender.coins} coins\n📤 *Necesitas:* ${amount} coins`,
                    [senderJid]
                );
            }

            const receiver = initUserEconomy(economy, toNumber, 'Usuario');

            // Hacer la transferencia
            sender.coins -= amount;
            receiver.coins += amount;
            saveEconomy(economy);

            // Obtener nombre del receptor
            let toName = receiver.name || toNumber;
            try {
                const contact = await sock.onWhatsApp(toNumber)[0];
                if (contact?.name) toName = contact.name;
            } catch {}

            await replyWithContext(
                `💸 *Transferencia exitosa*\n\n📤 *De:* ${fromName}\n📥 *Para:* ${toName}\n💰 *Cantidad:* ${amount.toLocaleString()} coins\n\n💼 *Tu saldo:* ${sender.coins} coins`,
                [senderJid, targetJid]
            );

        } catch (error) {
            console.error('❌ Error en pagar:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};