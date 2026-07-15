
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'tiktokstats',
    alias: ['ttstats', 'tiktokstalk', 'ttstalk', 'tiktokuser'],
 category: 'search',
    
    async execute(sock, msg, options) {
        const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
        const from = msg.key.remoteJid;
        
        try {
            // Verificar registro (usando senderNumber)
            if (usersDB && senderNumber && !usersDB[senderNumber]) {
                const reply = 'ৎ꯭᪲୨֟ Para usar mis comandos tienes que estar registrado.\n> Uso : ' + config.prefix + 'reg Misa.16';
                return await sock.sendMessage(from, { 
                    text: reply,
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
            }

            // Verificar si se proporcionó usuario
            if (!args || args.length === 0) {
                const reply = "🎑 Debes proporcionar un usuario de TikTok\n> Ejemplo: " + config.prefix + "tiktokstats @usuario\n> Ejemplo: " + config.prefix + "tiktokstats usuario";
                return await sock.sendMessage(from, { 
                    text: reply,
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
            }

            // Limpiar el username (quitar @ si existe)
            let username = args[0].replace('@', '');
            
            // Mostrar que está procesando
            await sock.sendPresenceUpdate('composing', from);
            
            await sock.sendMessage(from, { 
                text: `🎑 *Buscando estadísticas de* @${username}...\n> Esto puede tomar unos momentos`,
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

            // Opción 1: API de TikWM
            try {
                const response = await axios({
                    method: 'GET',
                    url: `https://www.tikwm.com/api/user/info?unique_id=${username}`,
                    timeout: 15000
                });

                const data = response.data?.data;
                
                if (!data || !data.user) {
                    throw new Error('Usuario no encontrado');
                }

                const user = data.user;
                const stats = data.stats || {};

                // Formatear números grandes
                const formatNumber = (num) => {
                    if (!num) return '0';
                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                    return num.toString();
                };

                // Construir mensaje de estadísticas
                let statsText = `🌹 *Estadísticas de TikTok*\n\n`;
                statsText += `🎑 *Usuario:* @${username}\n`;
                statsText += `🎑 *Nickname:* ${user.nickname || 'No disponible'}\n`;
                
                if (user.signature) {
                    statsText += `🎑 *Bio:* ${user.signature.substring(0, 100)}${user.signature.length > 100 ? '...' : ''}\n`;
                }
                
                statsText += `\n🌹 *Estadísticas:*\n`;
                statsText += `🎑 *Seguidores:* ${formatNumber(stats.followerCount)} (${stats.followerCount?.toLocaleString() || '0'})\n`;
                statsText += `🎑 *Seguidos:* ${formatNumber(stats.followingCount)} (${stats.followingCount?.toLocaleString() || '0'})\n`;
                statsText += `🎑 *Likes totales:* ${formatNumber(stats.heartCount)} (${stats.heartCount?.toLocaleString() || '0'})\n`;
                statsText += `🎑 *Videos:* ${stats.videoCount?.toLocaleString() || '0'}\n`;
                
                if (user.verified) {
                    statsText += `🎑 *Verificado:* Sí\n`;
                }
                
                if (user.privateAccount) {
                    statsText += `🎑 *Cuenta privada:* Sí\n`;
                }
                
                statsText += `\n🎑 *Perfil:* https://www.tiktok.com/@${username}`;

                // Descargar avatar
                let avatarBuffer = null;
                if (user.avatarLarger || user.avatarMedium || user.avatarThumb) {
                    try {
                        const avatarUrl = user.avatarLarger || user.avatarMedium || user.avatarThumb;
                        const avatarResponse = await axios({
                            method: 'GET',
                            url: avatarUrl,
                            responseType: 'arraybuffer',
                            timeout: 10000
                        });
                        avatarBuffer = avatarResponse.data;
                    } catch (avatarError) {
                        console.error('Error descargando avatar:', avatarError);
                    }
                }

                // Preparar mensaje con imagen si tenemos avatar
                if (avatarBuffer) {
                    const tempDir = path.join(__dirname, '..', 'temp');
                    const tempPath = path.join(tempDir, `tt_avatar_${Date.now()}.jpg`);
                    
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    
                    fs.writeFileSync(tempPath, avatarBuffer);

                    await sock.sendMessage(from, {
                        image: fs.readFileSync(tempPath),
                        caption: statsText,
                        contextInfo: {
                            mentionedJid: [senderJid],
                            forwardingScore: 9999999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    }, { quoted: msg });

                    fs.unlinkSync(tempPath);
                } else {
                    await sock.sendMessage(from, { 
                        text: statsText,
                        contextInfo: {
                            mentionedJid: [senderJid],
                            forwardingScore: 9999999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    }, { quoted: msg });
                }

                console.log(`✅ TikTok stats de @${username} consultado por ${pushName || senderNumber || 'usuario'}`);

            } catch (apiError) {
                console.error('Error con API principal:', apiError);
                
                // Opción 2: API alternativa
                try {
                    const altResponse = await axios({
                        method: 'GET',
                        url: `https://api.nikkoserver.xyz/api/tiktokstalk?user=${username}`,
                        timeout: 15000
                    });

                    const result = altResponse.data;
                    
                    if (!result || !result.username) {
                        throw new Error('Usuario no encontrado');
                    }

                    const formatNumber = (num) => {
                        if (!num) return '0';
                        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                        return num.toString();
                    };

                    let statsText = `🌹 *Estadísticas de TikTok*\n\n`;
                    statsText += `🎑 *Usuario:* @${result.username}\n`;
                    statsText += `🎑 *Nickname:* ${result.nickname || 'No disponible'}\n`;
                    
                    if (result.bio) {
                        statsText += `🎑 *Bio:* ${result.bio.substring(0, 100)}${result.bio.length > 100 ? '...' : ''}\n`;
                    }
                    
                    statsText += `\n🌹 *Estadísticas:*\n`;
                    statsText += `🎑 *Seguidores:* ${formatNumber(result.followers)} (${result.followers?.toLocaleString() || '0'})\n`;
                    statsText += `🎑 *Seguidos:* ${formatNumber(result.following)} (${result.following?.toLocaleString() || '0'})\n`;
                    statsText += `🎑 *Likes totales:* ${formatNumber(result.likes)} (${result.likes?.toLocaleString() || '0'})\n`;
                    statsText += `🎑 *Videos:* ${result.video_count?.toLocaleString() || '0'}\n`;
                    
                    if (result.verified) {
                        statsText += `🎑 *Verificado:* Sí\n`;
                    }
                    
                    if (result.private) {
                        statsText += `🎑 *Cuenta privada:* Sí\n`;
                    }
                    
                    statsText += `\n🎑 *Perfil:* https://www.tiktok.com/@${result.username}`;

                    // Intentar descargar avatar
                    let avatarBuffer = null;
                    if (result.avatar) {
                        try {
                            const avatarResponse = await axios({
                                method: 'GET',
                                url: result.avatar,
                                responseType: 'arraybuffer',
                                timeout: 10000
                            });
                            avatarBuffer = avatarResponse.data;
                        } catch (avatarError) {
                            console.error('Error descargando avatar:', avatarError);
                        }
                    }

                    if (avatarBuffer) {
                        const tempDir = path.join(__dirname, '..', 'temp');
                        const tempPath = path.join(tempDir, `tt_avatar_${Date.now()}.jpg`);
                        
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                        }
                        
                        fs.writeFileSync(tempPath, avatarBuffer);

                        await sock.sendMessage(from, {
                            image: fs.readFileSync(tempPath),
                            caption: statsText,
                            contextInfo: {
                                mentionedJid: [senderJid],
                                forwardingScore: 9999999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: config.canalId || '',
                                    serverMessageId: 0,
                                    newsletterName: config.canalNombre || ''
                                }
                            }
                        }, { quoted: msg });

                        fs.unlinkSync(tempPath);
                    } else {
                        await sock.sendMessage(from, { 
                            text: statsText,
                            contextInfo: {
                                mentionedJid: [senderJid],
                                forwardingScore: 9999999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: config.canalId || '',
                                    serverMessageId: 0,
                                    newsletterName: config.canalNombre || ''
                                }
                            }
                        }, { quoted: msg });
                    }

                    console.log(`✅ TikTok stats de @${username} consultado por ${pushName || senderNumber || 'usuario'}`);

                } catch (secondError) {
                    throw new Error('No se pudo obtener información del usuario');
                }
            }

        } catch (error) {
            console.error("❌ Error en tiktokstats:", error);
            
            try {
                const reply = "🥕 Ocurrió un error obteniendo las estadísticas.\n> Error: " + error.message;
                await sock.sendMessage(from, { 
                    text: reply,
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
            } catch (e) {
                console.error('Error enviando mensaje de error:', e);
            }
        }
    }
};