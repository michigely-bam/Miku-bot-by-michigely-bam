import axios from 'axios';

const API_URL = 'https://api.yupra.my.id/api/ai/gpt5';

export default {
    name: 'chatgpt',
    alias: ['gpt'],
    description: 'Habla con GPT-5 via API', 
    category: 'ai', 

    async execute(sock, msg, options) {
        try {
            const { config, args, senderJid, pushName, replyWithContext } = options;
            const from = msg.key.remoteJid;

            const prompt = args.join(' ').trim();

            if (!prompt) {
                await replyWithContext(
                    `🌌 Debes proporcionar una pregunta para ChatGPT`,
                    []
                );
                return;
            }

            try {
                await sock.sendMessage(from, { react: { text: '🙀', key: msg.key } });
            } catch (e) {}

            await replyWithContext(`🌌 *Pensando...*\n> ${prompt.substring(0, 50)}${prompt.length > 50? '...' : ''}`, []);

            const response = await axios.get(`${API_URL}?text=${encodeURIComponent(prompt)}`, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            let answer = null;

            if (response.data?.result) {
                answer = response.data.result;
            } else if (response.data?.response) {
                answer = response.data.response;
            }

            if (!answer) {
                throw new Error('No se pudo obtener respuesta');
            }

            if (answer.length > 3000) {
                answer = answer.substring(0, 3000) + '\n\n... (respuesta truncada)';
            }

            await replyWithContext(
                `✰ *ᴄʜᴀᴛɢᴘᴛ :*\n${answer}`,
                []
            );

            try {
                await sock.sendMessage(from, { react: { text: '🌟', key: msg.key } });
            } catch (e) {}

        } catch (error) {
            console.error('❌ Error en chatgpt:', error);

            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}

            await replyWithContext(
                `❌ *Error:* No se pudo obtener respuesta. Intenta más tarde.`,
                []
            );
        }
    }
};