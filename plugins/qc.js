export default {
    name: 'qc',
    alias: ['quote', 'quotly'],
    description: 'Crea una cita falsa estilo quote',
    category: 'Herramientas',

    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
            const from = msg.key.remoteJid;

            if (usersDB && senderNumber &&!usersDB[senderNumber]) {
                return sock.sendMessage(from, { text: `🌌 Regístrate: ${config.prefix}reg Sumi.18` }, { quoted: msg });
            }

            let text = args?.join(" ") || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

            if (!text) return sock.sendMessage(from, { text: `📌 Ejemplo: *${config.prefix}qc* Hola mundo` }, { quoted: msg });
            if (text.length > 40) return sock.sendMessage(from, { text: `📌 Máximo 40 caracteres. Tienes: *${text.length}*` }, { quoted: msg });

            await sock.sendMessage(from, { react: { text: "🕒", key: msg.key } });

            let userName = pushName || senderNumber;

            // Fake quote sin API ni canvas
            const fakeQuote = {
                key: {
                    fromMe: false,
                    participant: senderJid,
                    remoteJid: from
                },
                message: {
                    conversation: text
                },
                pushName: userName
            }

            // Mandamos un punto citado por el fake
            await sock.sendMessage(from, { text: '.' }, { quoted: fakeQuote });

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('❌ Error en qc:', error);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(msg.key.remoteJid, { text: `⚠︎ Error: ${error.message}` }, { quoted: msg });
        }
    }
};