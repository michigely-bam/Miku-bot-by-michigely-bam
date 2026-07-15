export default {
    name: 'emoji',
    alias: ['emoji', 'adivinacomida'],
    category: 'Juegos',
    description: 'Adivina la comida por emojis',

    async execute(sock, msg, { config }) {
        try {
            const from = msg.key.remoteJid;
            const args = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const respuesta = args.split(' ').slice(1).join(' ').toLowerCase();

            const comidas = [
                { emoji: '🍕+🧀+🍅', respuesta: 'pizza' },
                { emoji: '🍔+🍟+🥤', respuesta: 'hamburguesa con papas' },
                { emoji: '🌮+🥑+🌶️', respuesta: 'tacos' },
                { emoji: '🍜+🥚+🍖', respuesta: 'ramen' },
                { emoji: '🍣+🥢+🫑', respuesta: 'sushi' },
                { emoji: '🍦+🍓+🍫', respuesta: 'helado' },
                { emoji: '🥞+🍯+🍓', respuesta: 'hot cakes' },
                { emoji: '🍗+🍯+🧄', respuesta: 'pollo frito' },
                { emoji: '🌯+🧀+🥩', respuesta: 'burrito' },
                { emoji: '🍝+🧀+🍅', respuesta: 'pasta' }
            ];

            // Si puso respuesta:.emoji pizza
            if (respuesta) {
                if (!global.emojiGame ||!global.emojiGame[from]) {
                    return await sock.sendMessage(from, {
                        text: `❌ No hay juego activo. Usa.emoji para empezar`
                    }, { quoted: msg });
                }

                const correcta = global.emojiGame[from].toLowerCase();

                if (respuesta === correcta) {
                    delete global.emojiGame[from];
                    return await sock.sendMessage(from, {
                        text: `✅ CORRECTO! Era: ${correcta} 🎉\n\nUsa.emoji para otra ronda`
                    }, { quoted: msg });
                } else {
                    return await sock.sendMessage(from, {
                        text: `❌ Nope... Intenta otra vez!`
                    }, { quoted: msg });
                }
            }

            // Si NO puso respuesta:.emoji
            const random = comidas[Math.floor(Math.random() * comidas.length)];
            global.emojiGame = global.emojiGame || {};
            global.emojiGame[from] = random.respuesta;

            const text = `╭─────────────────╮
│ *🤔 ADIVINA LA COMIDA*
│
│ ${random.emoji}
│
│ *Responde con:*.emoji tu_respuesta
│ *Ejemplo:*.emoji pizza
╰─────────────────>`;

            await sock.sendMessage(from, { text }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en emoji:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};