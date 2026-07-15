import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usar la misma variable que en allmenu.js
let botStartTime = Date.now();

// Función para formatear el tiempo (igual que en allmenu pero con más detalle)
function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const timeParts = [];
    
    if (days > 0) {
        timeParts.push(`${days} d${days > 1 ? 's' : ''}`);
    }
    if (hours % 24 > 0) {
        timeParts.push(`${hours % 24} h${hours % 24 > 1 ? 's' : ''}`);
    }
    if (minutes % 60 > 0) {
        timeParts.push(`${minutes % 60} m${minutes % 60 > 1 ? 's' : ''}`);
    }
    if (seconds % 60 > 0) {
        // Mostrar segundos solo si no hay días o si es menos de 1 hora
        if (days === 0 && hours === 0) {
            timeParts.push(`${seconds % 60} s${seconds % 60 > 1 ? 's' : ''}`);
        }
    }
    
    // Si no hay tiempo (imposible, pero por si acaso)
    if (timeParts.length === 0) {
        return "menos de 1 segundo";
    }
    
    return timeParts.join(', ');
}

export default {
    name: 'uptime',
    alias: ['activo', 'tiempo'],
 category: 'Owner',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
            // ==========================================
            // OBTENER NÚMERO DEL BOT
            // ==========================================
            let botNumber = '';
            if (sock.phoneNumber) {
                botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
            } else if (sock.user?.id) {
                botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
            }
            
            // Verificar registro
            if (usersDB && senderNumber && !usersDB[senderNumber]) {
                await sock.sendMessage(from, { 
                    text: `🍒 Para usar mis comandos tienes que estar registrado.\n> Uso : ${config.prefix}reg Misa.16`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }
            
            // Calcular el tiempo activo usando la misma variable que allmenu
            const uptime = Date.now() - botStartTime;
            const uptimeString = formatUptime(uptime);
            
            // Mensaje con el formato exacto que solicitas
            const uptimeMessage = `｡ﾟﾟ･｡･ﾟﾟ｡
 ﾟ。 *ᴛɪᴇᴍᴘᴏ ᴀᴄᴛɪᴠᴏ* » ${uptimeString}
      ﾟ･｡･ﾟ`;
            
            // ==========================================
            // CARGAR ICONO DESDE INFO/{NÚMERO}/ICON.JPG
            // ==========================================
            let iconBuffer = null;
            
            if (botNumber) {
                const iconPath = path.join(process.cwd(), 'info', botNumber, 'icon.jpg');
                if (fs.existsSync(iconPath)) {
                    try {
                        iconBuffer = fs.readFileSync(iconPath);
                        console.log(`✅ Icono cargado desde info/${botNumber}/icon.jpg para uptime`);
                    } catch (iconError) {
                        console.log(`⚠️ Error cargando icono específico:`, iconError.message);
                    }
                }
            }
            
            // Si no hay icono específico, buscar icono general
            if (!iconBuffer) {
                const generalIconPath = path.join(__dirname, '../img/icon.jpg');
                if (fs.existsSync(generalIconPath)) {
                    iconBuffer = fs.readFileSync(generalIconPath);
                    console.log('✅ Icono general cargado para uptime');
                }
            }
            
            try {
                if (iconBuffer) {
                    await sock.sendMessage(from, {
                        text: uptimeMessage,
                        contextInfo: {
                            mentionedJid: [senderJid],
                            externalAdReply: {
                                title: `🌠 ${config.name || 'BOT'}`,
                                body: `𝙐𝙥𝙩𝙞𝙢𝙚 - ૮ ⸝⸝>  ̫ <⸝⸝ ა`,
                                mediaType: 1,
                                thumbnail: iconBuffer,
                                sourceUrl: config.canalUrl || 'https://whatsapp.com/channel/0029Vb6qIht5q08ZMPggVrA1y',
                                showAdAttribution: false,
                                renderLargerThumbnail: false
                            },
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            },
                            forwardingScore: 9999999,
                            isForwarded: true
                        }
                    }, { quoted: msg });
                    
                } else {
                    // Si no existe la imagen, enviar solo el texto
                    await sock.sendMessage(from, {
                        text: uptimeMessage,
                        contextInfo: {
                            mentionedJid: [senderJid],
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            },
                            forwardingScore: 9999999,
                            isForwarded: true
                        }
                    }, { quoted: msg });
                }
                
                console.log(`✅ Uptime consultado por ${pushName || senderNumber}: ${uptimeString} - Bot: ${botNumber || 'desconocido'}`);
                
            } catch (error) {
                console.error('Error en comando uptime:', error);
                
                // Fallback: enviar solo texto
                await sock.sendMessage(from, {
                    text: uptimeMessage,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
            }
            
        } catch (error) {
            console.error('❌ Error en uptime:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `｡ﾟﾟ･｡･ﾟﾟ｡\n ﾟ。 *Error* » ${error.message}\n      ﾟ･｡･ﾟ`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: options.config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: options.config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
            } catch (e) {
                console.error('Error enviando mensaje de error:', e);
            }
        }
    }
};
