import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WARNS_FILE = path.join(__dirname, '../databases/warns.json');

// Función interna pa' leer warns
const getWarns = (userNumber, groupId) => {
    try {
        if (!fs.existsSync(WARNS_FILE)) return [];
        const db = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
        return db[groupId]?.[userNumber] || [];
    } catch (e) {
        console.log('Error leyendo warns:', e.message);
        return [];
    }
};

export default {
    name: 'warns',
    alias: ['verwarns', 'lista-warns'],
    description: 'Ver los warns de un usuario. 3/3 = ban',
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

            const groupMetadata = await sock.groupMetadata(from);

            const getRealPhoneNumber = (jid) => {
                if (!jid) return null;
                const identificador = jid.split('@')[0];
                for (const [num, data] of Object.entries(usersDB)) {
                    if (data.lid === jid || data.lid === identificador) return num;
                    if (data.jid === jid || data.jid === identificador) return num;
                }
                if (/^[\d]+$/.test(identificador) && identificador.length > 8) return identificador;
                return null;
            };

            let targetUserJid = null;
            let targetUserNumber = null;

            if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                targetUserJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
                targetUserNumber = getRealPhoneNumber(targetUserJid);
            }
            else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUserJid = msg.message.extendedTextMessage.contextInfo.participant;
                targetUserNumber = getRealPhoneNumber(targetUserJid);
            }
            else if (senderNumber) {
                targetUserNumber = senderNumber;
                const found = groupMetadata.participants?.find(p =>
                    p.id.includes(senderNumber) || p.id.split('@')[0] === senderNumber
                );
                if (found) targetUserJid = found.id;
            }

            if (!targetUserJid ||!targetUserNumber) {
                await sock.sendMessage(from, {
                    text: `🌌 Debes proporcionar a un usuario\n> Responde a un mensaje o menciona con @\n> Sin mencionar = ves tus propios warns`,
                    contextInfo: { forwardingScore: 9999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: config.canalId || '', serverMessageId: 0, newsletterName: config.canalNombre || '' } }
                }, { quoted: msg });
                return;
            }

            // YA NO IMPORTA NADA DEL HANDLER
            const userWarns = getWarns(targetUserNumber, from);

            if (userWarns.length === 0) {
                await sock.sendMessage(from, {
                    text: `🌠 El usuario @${targetUserNumber} no tiene advertencias`,
                    mentions: [targetUserJid],
                    contextInfo: { mentionedJid: [targetUserJid], forwardingScore: 9999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: config.canalId || '', serverMessageId: 0, newsletterName: config.canalNombre || '' } }
                }, { quoted: msg });
                return;
            }

            let warnsText = `🦋 *Warns de @${targetUserNumber}*\n\n`;
            userWarns.forEach(warn => {
                warnsText += `🌠 *Warn #${warn.id}*\n`;
                warnsText += `🌠 Razón » *${warn.reason}*\n`;
                warnsText += `🌠 Fecha » *${warn.date}*\n`;
                warnsText += `🌠 Admin » @${warn.warner}\n`;
                warnsText += `━━━━━━━━━━━━\n`;
            });
            warnsText += `\n🌌 *Total:* ${userWarns.length}/3 warns`;

            const warnersJids = userWarns
              .map(w => `${w.warner}@s.whatsapp.net`)
              .filter(jid => jid!== targetUserJid);

            await sock.sendMessage(from, {
                text: warnsText,
                mentions: [targetUserJid,...warnersJids],
                contextInfo: { mentionedJid: [targetUserJid,...warnersJids], forwardingScore: 9999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: config.canalId || '', serverMessageId: 0, newsletterName: config.canalNombre || '' } }
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