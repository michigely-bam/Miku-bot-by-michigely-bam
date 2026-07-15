import { jidNormalizedUser } from '@whiskeysockets/baileys';

export default {
    name: 'open',
    alias: ['abrir', 'abrirgrupo'],
 category: 'admin',

    async execute(sock, msg, options) {
        try {
            const { config = {}, usersDB = {}, senderNumber = '', senderJid = '' } = options || {};
            const from = msg.key.remoteJid;
            if (!from?.endsWith('@g.us')) return;

            const normalize = (jid) => jid? jidNormalizedUser(jid).replace(/\D/g, '') : '';
            const senderNum = normalize(senderNumber);

            const groupMetadata = await sock.groupMetadata(from).catch(() => null);
            if (!groupMetadata) return sock.sendMessage(from, {text: `❌ No pude obtener datos del grupo`}, {quoted: msg});

            const botId = jidNormalizedUser(sock.user?.id || '');
            if (!botId) return sock.sendMessage(from, {text: `❌ Error: Bot ID undefined`}, {quoted: msg});

            const findParticipant = (id) => groupMetadata.participants.find(p => normalize(p.id) === normalize(id));

            const participant = findParticipant(senderNum + '@s.whatsapp.net') || findParticipant(senderJid);
            const botParticipant = findParticipant(botId);

            const isGroupAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
            const botIsAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

            const owners = Array.isArray(config.owner)? config.owner : [];
            const isOwner = owners.some(ownerNum => normalize(ownerNum) === senderNum);

            const userRank = usersDB[senderNumber]?.rank;
            const hasBotRank = isOwner || ['owner', 'c-owner', 'srmod', 'mod'].includes(userRank);

            if (!isGroupAdmin &&!hasBotRank) {
                return sock.sendMessage(from, {text: `🍁 Solo admins del grupo pueden usar este comando`}, {quoted: msg});
            }

            if (!botIsAdmin) {
                return sock.sendMessage(from, {text: `🌠 *${config.name || 'Bot'}* debe ser administrador para abrir el grupo`}, {quoted: msg});
            }

            await sock.groupSettingUpdate(from, 'not_announcement'); // <- SOLO CAMBIÓ ESTO
            await sock.sendMessage(from, {text: `🔓 Grupo abierto. Todos pueden escribir.`}, {quoted: msg});
            console.log(`\x1b[1;32m🔓 Grupo abierto por ${senderNum}\x1b[0m`);

        } catch (error) {
            console.error('❌ Error en open:', error);
            await sock.sendMessage(msg.key.remoteJid, {text: `❌ Error: ${error.message}`}, {quoted: msg});
        }
    }
};