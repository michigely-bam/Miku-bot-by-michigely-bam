export default {
    name: 'sorteo',
    alias: ['azar', 'elegido'],
    description: 'Elige 1 usuario random del grupo con premio',
    category: 'DIVERCION',

    async execute(sock, msg, options) {
        try {
            const { config } = options;
            const from = msg.key.remoteJid;

            if (!from.includes('@g.us')) {
                await sock.sendMessage(from, { text: '🌌 Este comando solo funciona en grupos bro' }, { quoted: msg });
                return;
            }

            const groupMetadata = await sock.groupMetadata(from);
            const miembros = groupMetadata.participants
            .filter(p => p.id!== sock.user.id)
            .map(p => p.id);

            if (miembros.length < 2) {
                await sock.sendMessage(from, { text: '🌌 Se ocupa mínimo 2 personas en el grupo 😅' }, { quoted: msg });
                return;
            }

            // FIX: Ahora sí lee.sorteo Nitro bien
            const body = msg.message?.conversation
                       || msg.message?.extendedTextMessage?.text
                       || '';
            const args = body.split(' ').slice(1);
            const premio = args.length > 0? args.join(' ') : 'Un premio misterioso 🎁';

            const hostJid = msg.key.participant || msg.key.remoteJid;
            const hostNumber = hostJid.split('@')[0];

            await sock.sendMessage(from, { text: `🌙 *Girando la ruleta...* 🌙` }, { quoted: msg });
            await new Promise(r => setTimeout(r, 2000));

            const elegidoJid = miembros[Math.floor(Math.random() * miembros.length)];
            const elegidoNumber = elegidoJid.split('@')[0];

            const cuadro = `╭─────────────────
│ 🌌 *GANADOR:* @${elegidoNumber}
│ 🌙 *PREMIO:* ${premio}
│ 🫟 *HOST:* @${hostNumber}
╰─────────────────`;

            await sock.sendMessage(from, {
                text: cuadro,
                mentions: [elegidoJid, hostJid],
                contextInfo: { mentionedJid: [elegidoJid, hostJid] }
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en sorteo:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `🌠 Error: ${error.message}` }, { quoted: msg });
        }
    }
};