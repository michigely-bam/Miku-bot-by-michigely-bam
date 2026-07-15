export default {
    name: 'delwarn',
    alias: ['unwarn', 'quitarwarn'],
    description: 'Quita 1 warn a un usuario',
    category: 'Grupo',

    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, args } = options;
            const from = msg.key.remoteJid;

            if (!from.includes('@g.us')) return;

            if (usersDB && senderNumber &&!usersDB[senderNumber]) {
                return sock.sendMessage(from, {
                    text: `🌌 Regístrate primero: ${config.prefix}reg Misa.16`,
                    contextInfo: { forwardingScore: 9999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: config.canalId || '', serverMessageId: 0, newsletterName: config.canalNombre || '' } }
                }, { quoted: msg });
            }

            const groupMetadata = await sock.groupMetadata(from);

            const isGroupAdmin = groupMetadata.participants.find(p => p.id === senderJid || p.id.includes(senderNumber || ''))?.admin;
            const isOwner = config.owner?.some(ownerNum => ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, ''));
            const userRank = usersDB[senderNumber]?.rank;
            const hasBotRank = isOwner || ['owner', 'c-owner', 'srmod', 'mod'].includes(userRank);

            if (!isGroupAdmin &&!hasBotRank) {
                return sock.sendMessage(from, { text: `🌌 Solo admins`, contextInfo: { forwardingScore: 9999, isForwarded: true } }, { quoted: msg });
            }

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
            } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUserJid = msg.message.extendedTextMessage.contextInfo.participant;
                targetUserNumber = getRealPhoneNumber(targetUserJid);
            } else if (args[0]) {
                const possibleNumber = args[0].replace(/[^0-9]/g, '');
                if (possibleNumber.length > 8) {
                    targetUserNumber = possibleNumber;
                    const found = groupMetadata.participants.find(p => p.id.includes(possibleNumber));
                    if (found) targetUserJid = found.id;
                }
            }

            if (!targetUserJid ||!targetUserNumber) {
                return sock.sendMessage(from, {
                    text: `🌠 Menciona, responde o pon número\n> Ej: ${config.prefix}delwarn @usuario`,
                    contextInfo: { forwardingScore: 9999, isForwarded: true }
                }, { quoted: msg });
            }

            const { getWarns, delWarn } = await import('../handler.js');
            const userWarns = getWarns(targetUserNumber, from);

            if (userWarns.length === 0) {
                return sock.sendMessage(from, {
                    text: `🌠 @${targetUserNumber} no tiene warns`,
                    mentions: [targetUserJid]
                }, { quoted: msg });
            }

            const lastWarn = delWarn(targetUserNumber, from); // Quita el último

            await sock.sendMessage(from, {
                text: `✅ Warn eliminado a @${targetUserNumber}\n🌠 Quedan: *${userWarns.length - 1}/3*\n🌠 Razón quitada: *${lastWarn.reason}*`,
                mentions: [targetUserJid]
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en delwarn:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `🌠 Error: ${error.message}` }, { quoted: msg });
        }
    }
};