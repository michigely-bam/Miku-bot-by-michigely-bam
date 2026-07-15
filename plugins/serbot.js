import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'serbot',
    alias: ['serbotlight'],
 category: 'Owner',
    
    async execute(sock, msg, options) {
        try {
            const { config, sender } = options;
            const from = msg.key.remoteJid;
            
            // Ruta del banner (usa el mismo del allmenu)
            const bannerPath = path.join(__dirname, '../img/banner.jpg');
            
            // Verificar si el banner existe
            const bannerExists = fs.existsSync(bannerPath);
            
            // Texto del mensaje
            let menuText = `╭ִ ࠭아ּ◌ ۪ ᮫ ࠭皕 ִ ࠭ ├ִ ࠭ ꒰ ࠭🌾〪ໍִ݀ ꒱ ۪ ۟┤ ٜ ֗皕ׅ ּ ִ𞄳◌𖭧ٜ۟ ࠭╮۟\n`;
            menuText += `𐂯  ִ  👒ᩙ *𝙎𝙀𝙍 - 𝘽𝙊𝙏 - 𝙇𝙄𝙂𝙃𝙏*\n`;
            menuText += `> *↓ Infórmate aquí ↓*\n`;
            menuText += ` ⚊᜔֗━〭࣫╼۪ ݁ 𞋔ֵ໋𝆬🌾〪ໍ〭ํ۠𐑼݂۫𞄳  ֵ╾݂ໍ─໋〭╼᜔࣫  ݂۫𞋔ֵ໋𝆬🍃〪ໍ〭ํ۠𐑼𞄳 ݁ ۪╾〭࣫━֗͜⚊᜔᮫  \n\n`;
            
            menuText += `♡ *Forma de ser Sub-Bot*\n`;
            menuText += `> ✪ ${config.prefix}code\n\n`;
            
            menuText += `♡ *Vincular el código*\n`;
            menuText += `> ✪ Más ajustes » Dispositivos vinculados » Vincular un dispositivo » Vincular usando número de teléfono » Pega el código\n`;
            menuText += `> ⚠︎ No es recomendable vincular un bot en cuentas principales\n\n`;
            
            menuText += `♡ *Apoyar al bot*\n`;
            menuText += `> https://github.com/kobDanonino\n> https://www.tiktok.com/@kob.danonino\n`;
            if (config.group3) {
                menuText += `> ${config.group3}\n\n`;
            }
            
            menuText += `╰ִ ࠭아ּ◌ ۪ ᮫ ࠭皕 ִ ࠭ ├ִ ࠭ ꒰ ࠭🌾〪ໍִ݀ ꒱ ۪ ۟┤ ٜ ֗皕ׅ ּ ִ𞄳◌𖭧ٜ۟ ࠭╯۟`;
            
            if (bannerExists) {
                const bannerBuffer = fs.readFileSync(bannerPath);
                
                await sock.sendMessage(from, {
                    text: menuText,
                    mentions: [sender],
                    contextInfo: {
                        mentionedJid: [sender],
                        externalAdReply: {
                            title: `🌠 MOONLIGHT - LIGHT 🌠`,
                            body: `Crea tu propio sub-bot`,
                            thumbnail: bannerBuffer,
                            mediaType: 1,
                            showAdAttribution: false,
                            renderLargerThumbnail: true
                        },
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
                // Si no existe el banner, enviar solo texto
                await sock.sendMessage(from, {
                    text: menuText,
                    mentions: [sender],
                    contextInfo: {
                        mentionedJid: [sender],
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
            
        } catch (error) {
            console.error('Error en comando serbot:', error);
            
            // Fallback simple
            await sock.sendMessage(msg.key.remoteJid, {
                text: `*𝙎𝙀𝙍 - 𝘽𝙊𝙏 - 𝙇𝙄𝙂𝙃𝙏*\n\nUsa *${options.config?.prefix || '.'}code +número* para crear tu sub-bot\n\n🌿 *Información sobre cómo ser sub-bot*`,
                contextInfo: {
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: options.config?.canalId || '',
                        serverMessageId: 0,
                        newsletterName: options.config?.canalNombre || ''
                    }
                }
            }, { quoted: msg });
        }
    }
};