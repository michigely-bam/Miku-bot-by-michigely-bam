import { jidNormalizedUser } from '@whiskeysockets/baileys';

export default {
    name: 'close',
    alias: ['cerrar', 'cerrargrupo'],
 category: 'admin',

    async execute(sock, msg, options) {
        try {
            const { config = {}, usersDB = {}, senderNumber = '', senderJid = '' } = options || {}; // <- FIX: defaults vacíos
            const from = msg.key.remoteJid;
            if (!from?.endsWith('@g.us')) return;

            const normalize = (jid) => jid? jidNormalizedUser(jid).replace(/\D/g, '') : '';

            const senderNum = normalize(senderNumber);
            console.log('1. senderNum:', senderNum); // <- LOG

            const groupMetadata = await sock.groupMetadata(from).catch(() => null);
            if (!groupMetadata) return sock.sendMessage(from, {text: `❌ No pude obtener datos del grupo`}, {quoted: msg});

            // FIX: Sacar botId sin depender de sock.user.id
            const botId = jidNormalizedUser(sock.user?.id || sock.decodeJid(sock.user?.id) || '');
            console.log('2. botId:', botId); // <- LOG
            if (!botId) return sock.sendMessage(from, {text: `❌ Error: Bot ID undefined`}, {quoted: msg});

            const findParticipant = (id) => groupMetadata.participants.find(p => normalize(p.id) === normalize(id));

            const participant = findParticipant(senderNum + '@s.whatsapp.net') || findParticipant(senderJid);
            const botParticipant = findParticipant(botId);

            console.log('3. participant:',!!participant, 'bot:',!!botParticipant); // <- LOG

            const isGroupAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
            const botIsAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

            // FIX: owner puede ser undefined
            const owners = Array.isArray(config.owner)? config.owner : [];
            const isOwner = owners.some(ownerNum => normalize(ownerNum) === senderNum);

            // FIX: usersDB puede ser undefined
            const userRank = usersDB[senderNumber]?.rank;
            const hasBotRank = isOwner || ['owner', 'c-owner', 'srmod', 'mod'].includes(userRank);

            if (!isGroupAdmin &&!hasBotRank) {
                return sock.sendMessage(from, {text: `🍁 Solo admins del grupo pueden usar este comando`}, {quoted: msg});
            }

            if (!botIsAdmin) {
                return sock.sendMessage(from, {text: `🌠 *${config.name || 'Bot'}* debe ser administrador del grupo`}, {quoted: msg});
            }

            await sock.groupSettingUpdate(from, 'announcement');
            await sock.sendMessage(from, {text: `🔒 Grupo cerrado. Solo admins pueden escribir.`}, {quoted: msg});

        } catch (error) {
            console.error('❌ Error real en close:', error); // <- Mira aquí el stack completo
            await sock.sendMessage(msg.key.remoteJid, {text: `❌ Error: ${error.message}`}, {quoted: msg});
        }
    }
};