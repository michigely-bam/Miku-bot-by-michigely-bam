export default {
    name: '8ball',
    alias: ['8b', 'pregunta'],
    description: 'Hazle una pregunta a la bola mágica',
    category: 'DIVERCION',

    async execute(sock, msg, options) {
        try {
            const from = msg.key.remoteJid;

            const body = msg.message?.conversation
                       || msg.message?.extendedTextMessage?.text
                       || '';
            const pregunta = body.split(' ').slice(1).join(' ');

            if (!pregunta) {
                await sock.sendMessage(from, { 
                    text: `⚡ Usa: ${options.config.prefix}8ball ¿Llueve hoy?` 
                }, { quoted: msg });
                return;
            }

            // Solo las 3 que pediste
            const respuestas = ['Sí', 'No', 'Tal vez'];
            const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];

            const cuadro = `╭─────────────────
│ 🎱 *8BALL*
│ 🌌 *Pregunta:* ${pregunta}
│ 🌙 *Respuesta:* ${respuesta}
╰─────────────────`;

            await sock.sendMessage(from, { text: cuadro }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en 8ball:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `🌠 Error: ${error.message}` }, { quoted: msg });
        }
    }
};