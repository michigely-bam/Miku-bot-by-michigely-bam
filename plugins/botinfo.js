import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { prepareWAMessageMedia } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanNumber(number) {
    if (!number) return '';
    let cleaned = number.split('@')[0];
    cleaned = cleaned.split(':')[0];
    return cleaned.replace(/\D/g, '');
}

export default {
    name: 'botinfo',
    alias: ['infobot'],
    description: 'Muestra información del bot',
    category: 'main',
    
    async execute(sock, msg, options) {
        try {
            const { config, pushName, userNumber, replyWithContext, isOwner, isSubBot, plugins, usersDb } = options;
            const from = msg.key.remoteJid;
            
            let currentBotNumber = '';
            if (sock.phoneNumber) {
                currentBotNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
            } else if (sock.user?.id) {
                currentBotNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
            }
            
            const totalRegistros = usersDb ? usersDb.length : 0;
            
            const platform = os.platform();
            const plataformas = {
                'linux': '🐧 Linux',
                'win32': '🪟 Windows',
                'darwin': '🍎 macOS',
                'android': '🤖 Android',
                'freebsd': '🔵 FreeBSD'
            };
            const plataforma = plataformas[platform] || platform;
            
            let duenoInfo = '';
            if (isOwner) {
                const duenoNumber = config.botowner || config.owner?.[0] || 'No definido';
                duenoInfo = `@${duenoNumber}`;
            } else {
                duenoInfo = '*Oculto por seguridad*';
            }
            
            const bannerUrl = config.banner || '';
            const link = 'https://moonstaff.onrender.com/';
            
            let infoText = `⁞⁞〭 ׂ🪴 *Nombre* › *${config.nombre || 'No definido'}*\n`;
            infoText += `⁞⁞〭 ׂ🍄 *Nombre2* › *${config.nombre2 || 'No definido'}*\n⁞⁞〭 ׂ🌷 *Prefijo* › 【 *${config.prefix}* 】\n\n`;
            infoText += `⁞⁞〭 ׂ🍃 *Tipo* › *${config.tipo || 'principal'}*\n`;
            infoText += `⁞⁞〭 ׂ🪷 *Dueño* › ${duenoInfo}\n\n`;
            infoText += `⁞⁞〭 ׂ🌸 *Plataforma* › *${plataforma}*\n`;
            infoText += `⁞⁞〭 ׂ🌻 *Registros* › *${totalRegistros}*\n\n\n`;
            infoText += `> *Moon:* ${link}`;
            
            if (bannerUrl) {
                try {
                    const uploadMethod = sock.waUploadToServer || sock.updateMediaMessage;
                    
                    if (!uploadMethod) {
                        throw new Error('No hay método de upload disponible');
                    }
                    
                    const { imageMessage } = await prepareWAMessageMedia(
                        { image: { url: bannerUrl } },
                        { 
                            upload: uploadMethod, 
                            mediaTypeOverride: 'thumbnail-link' 
                        }
                    );
                    
                    const linkPreview = {
                        'canonical-url': link,
                        'matched-text': link,
                        title: config.nombre || config.name || "Sirius",
                        description: `🐝 Información del bot ${config.nombre2}`,
                        jpegThumbnail: imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined,
                        highQualityThumbnail: imageMessage || undefined
                    };
                    
                    await sock.sendMessage(from, {
                        text: infoText,
                        linkPreview: linkPreview,
                        contextInfo: {
                            mentionedJid: isOwner && config.botowner ? [`${config.botowner}@s.whatsapp.net`] : [],
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: '0',
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    }, { quoted: msg });
                } catch (error) {
                    console.error('Error con banner en botinfo:', error);
                    await sock.sendMessage(from, {
                        text: infoText,
                        contextInfo: {
                            mentionedJid: isOwner && config.botowner ? [`${config.botowner}@s.whatsapp.net`] : [],
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: '0',
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(from, {
                    text: infoText,
                    contextInfo: {
                        mentionedJid: isOwner && config.botowner ? [`${config.botowner}@s.whatsapp.net`] : [],
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: '0',
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            }
            
        } catch (error) {
            console.error('Error en botinfo:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};