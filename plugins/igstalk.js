import axios from 'axios';

export default {
    name: 'igstalk',
    alias: ['instagramstalk'],
    description: 'Obtiene información de un usuario de Instagram',
    category: 'search',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, replyWithContext, pushName, userNumber } = options;
            const from = msg.key.remoteJid;
            
            // Verificar si es sub-bot usando el config
            const esSubBot = config.subBot === true;
            
            // Solo permitir en Main y Premium (no en Sub)
            if (esSubBot) {
                return await replyWithContext(`❀ *Este comando solo está disponible en prem-bots*`);
            }
            
            const username = args.join(' ').trim();
            
            if (!username) {
                return await replyWithContext(`「✰」 Debes proporcionar un nombre de usuario\n> Ejemplo: ${config.prefix}igstalk kob.danonino`);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
            } catch (e) {}
            
            const apiUrl = `https://v2.api-varhad.my.id/stalker/instagram?username=${encodeURIComponent(username)}`;
            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.data?.status || !response.data?.result) {
                throw new Error('No se encontró el usuario');
            }
            
            const result = response.data.result;
            const profilePicUrl = result.profile_pic;
            const fullName = result.full_name || 'Sin nombre';
            const bio = result.biography || 'Sin biografía';
            const followers = result.followers?.toLocaleString() || 0;
            const following = result.following?.toLocaleString() || 0;
            const posts = result.posts?.toLocaleString() || 0;
            const verified = result.verified ? '✔' : '✘';
            const isPrivate = result.private ? '✔' : '✘';
            
            let profilePicBuffer = null;
            if (profilePicUrl) {
                try {
                    const imgResponse = await axios.get(profilePicUrl, { responseType: 'arraybuffer', timeout: 15000 });
                    profilePicBuffer = Buffer.from(imgResponse.data);
                } catch (e) {
                    console.log('Error descargando foto de perfil:', e.message);
                }
            }
            
            const caption = `𑁯⃘ׂ⭐ᩚ̲੭ *Usuario:* ${result.username}\n` +
                          `𑁯⃘ׂ⭐ᩚ̲੭ *Nombre:* ${fullName}\n` +
                          `𑁯⃘ׂ⭐ᩚ̲੭ *Biografía:* ${bio}\n` +
                          `𑁯⃘ׂ⭐ᩚ̲੭ *Seguidores:* ${followers}\n` +
                          `𑁯⃘ׂ⭐ᩚ̲੭ *Siguiendo:* ${following}\n` +
                          `𑁯⃘ׂ⭐ᩚ̲੭ *Publicaciones:* ${posts}\n` +
                          `𑁯⃘ׂ⭐ᩚ̲੭ *Verificado:* ${verified}\n` +
                          `𑁯⃘ׂ⭐ᩚ̲੭ *Privado:* ${isPrivate}`;
            
            if (profilePicBuffer) {
                await sock.sendMessage(from, {
                    image: profilePicBuffer,
                    caption: caption,
                    contextInfo: {
                        forwardingScore: 9999999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            } else {
                await replyWithContext(caption);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ Instagram stalk: @${result.username} por ${pushName || userNumber}`);
            
        } catch (error) {
            console.error('❌ Error en igstalk:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ *Error:* No se encontró el usuario o la API falló`);
            } catch (e) {}
        }
    }
};