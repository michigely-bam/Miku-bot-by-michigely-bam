import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WARNS_FILE = path.join(__dirname, '../databases/warns.json');

// Leer todos los warns del grupo
const getAllWarnsFromGroup = (groupId) => {
    try {
        if (!fs.existsSync(WARNS_FILE)) return {};
        const db = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
        return db[groupId] || {};
    } catch (e) {
        console.log('Error leyendo warns:', e.message);
        return {};
    }
};

export default {
    name: 'warns',
    alias: ['verwarns', 'lista-warns'],
    description: 'Lista todos los usuarios con advertencias del grupo',
    category: 'Grupo',

    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber } = options;
            const from = msg.key.remoteJid;

            if (!from.includes('@g.us')) return;

            if (usersDB && senderNumber &&!usersDB[senderNumber]) {
                await sock.sendMessage(from, {
                    text: `🌌 Para usar mis comandos tienes que estar registrado.\n> Uso : ${config.prefix}reg Misa.16`,
                    contextInfo: { forwardingScore: 9999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: config.canalId || '', serverMessageId: 0, newsletterName: config.canalNombre || '' } }
                }, { quoted: msg });
                return;
            }

            // YA NO PIDE MENCION. Lee todo el grupo de una
            const allWarns = getAllWarnsFromGroup(from);
            const usersWithWarns = Object.keys(allWarns);

            if (usersWithWarns.length === 0) {
                await sock.sendMessage(from, {
                    text: `🦋 *Lista de Warns*\n\n🌠 Nadie tiene advertencias en este grupo. Todo limpio ✨`,
                    contextInfo: { forwardingScore: 9999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: config.canalId || '', serverMessageId: 0, newsletterName: config.canalNombre || '' } }
                }, { quoted: msg });
                return;
            }

            // Ordenar por más warns
            usersWithWarns.sort((a, b) => allWarns[b].length - allWarns[a].length);

            let warnsText = `🦋 *Usuarios con Warns - ${usersWithWarns.length}*\n\n`;
            const mentions = [];

            usersWithWarns.forEach((userNumber, i) => {
                const warns = allWarns[userNumber];
                const jid = `${userNumber}@s.whatsapp.net`;
                mentions.push(jid);

                const emoji = warns.length >= 3? '⛔' : warns.length === 2? '⚠️' : '🟡';
                warnsText += `${emoji} *${i+1}. @${userNumber}* » ${warns.length}/3 warns\n`;

                // Muestra la última razón
                warnsText += ` └ Razón: ${warns[warns.length - 1].reason}\n\n`;
            });

            warnsText += `🌌 *Nota:* 3/3 = Kick/Ban automático`;

            await sock.sendMessage(from, {
                text: warnsText,
                mentions: mentions,
                contextInfo: { mentionedJid: mentions, forwardingScore: 9999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: config.canalId || '', serverMessageId: 0, newsletterName: config.canalNombre || '' } }
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en warns:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🌠 Error al consultar warns: ${error.message}`,
                contextInfo: { forwardedNewsletterMessageInfo: { newsletterJid: options.config.canalId || '', serverMessageId: 0, newsletterName: options.config.canalNombre || '' }, forwardingScore: 9999, isForwarded: true }
            }, { quoted: msg });
        }
    }
};