export default {
    name: 'Personalidad',
    alias: ['stats'],
    category: 'Diversión',
    description: 'Mide la personalidad de alguien con porcentajes random',

    async execute(sock, msg, { config }) {
        try {
            const from = msg.key.remoteJid;

            // Detecta mención o usa al que envió el comando
            let user = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.key.participant || msg.key.remoteJid;
            let userTag = '@' + user.split('@')[0];

            // Función para sacar % random
            const getRandom = () => Math.floor(Math.random() * 101);

            const text = `╭─────────────────╮
│ *El usuario* ${userTag} *Es*
│😡 *enojón* » ${getRandom()}%
│😁 *alegre*» ${getRandom()}%
│😐 *serio* » ${getRandom()}%
│😓 *sensible* » ${getRandom()}%
│🤓 *inteligente*» ${getRandom()}%
│😝 *pendejo* » ${getRandom()}%
│😒 *celoso*» ${getRandom()}%
│🥰 *Tierno*» ${getRandom()}%
│🙂 *aburrido/a*» ${getRandom()}%
╰──────────────>`;

            await sock.sendMessage(from, {
                text,
                mentions: [user] // para que lo mencione azul
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en medidor:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};