import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'listplug',
    alias: [],
 category: 'Herramientas',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
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
            
            // Verificar si el usuario es el owner (desde config.js)
            const isOwner = config.owner && config.owner.some(ownerNum => 
                ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, '')
            );
            
            if (!isOwner) {
                await sock.sendMessage(from, {
                    text: `๑ֵ݊🍀 ᥱᥣ ᥴ᥆mᥲᥒძ᥆ \`${config.prefix}listplug\` ᥒ᥆ ᥱ᥊іs𝗍ᥱ.\n> ೯۪🎑̶ֵ ᥙsᥲ ${config.prefix}help ⍴ᥲrᥲ ᥎ᥱr mіs ᥴ᥆mᥲᥒძ᥆s`,
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
                return;
            }
            
            // Mostrar que está procesando
            await sock.sendPresenceUpdate('composing', from);
            
            // Leer directorio de plugins
            const pluginsDir = path.join(__dirname, '..', 'plugins');
            const archivos = await fs.readdir(pluginsDir);
            
            // Filtrar solo archivos .js
            const listaArchivos = archivos
                .filter(archivo => archivo.endsWith('.js'))
                .map(archivo => `- ${archivo}`);
            
            // Crear mensaje con la lista
            const totalPlugins = listaArchivos.length;
            let responseText = `❀ *ʟɪsᴛᴀ ᴅᴇ ᴘʟᴜɢɪɴs* ❀\n\n`;
            responseText += `*Total:* ${totalPlugins} plugins\n`;
            responseText += `━━━━━━━━━━━━━━━━━━\n\n`;
            
            if (totalPlugins > 0) {
                responseText += listaArchivos.join('\n');
            } else {
                responseText += `*No hay plugins disponibles*`;
            }
            
            // Enviar mensaje
            await sock.sendMessage(from, {
                text: responseText,
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
            
            console.log(`✅ Listplug ejecutado por OWNER: ${pushName || senderNumber} - ${totalPlugins} plugins`);
            
        } catch (error) {
            console.error('❌ Error en listplug:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❀ *ᴇʀʀᴏʀ ᴀʟ ᴏʙᴛᴇɴᴇʀ ʟᴀ ʟɪsᴛᴀ ᴅᴇ ᴘʟᴜɢɪɴs*\n\n${error.message}`,
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
