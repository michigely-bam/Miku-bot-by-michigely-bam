import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'groups',
    alias: ['grupos', 'groupsofc'],
 category: 'admin',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
            // ===== OBTENER NÚMERO DEL BOT =====
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
            
            // Mostrar que está procesando
            await sock.sendPresenceUpdate('composing', from);
            
            // Verificar si los grupos están configurados
            if (!config.group1 || !config.group2 || !config.group3) {
                await sock.sendMessage(from, {
                    text: `♡ Los enlaces de grupos no están configurados aún`,
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
            
            // Construir mensaje
            const groupsMessage = `》》》 \`G R U P O S - O F C\`《《《

「✰」𝙈𝙪𝙡𝙩𝙞 𝘽𝙤𝙩𝙨
> ${config.group1}

「✰」𝙎𝙤𝙥𝙤𝙧𝙩𝙚 & 𝙀𝙧𝙧𝙤𝙧𝙚𝙨
> ${config.group2}

「✰」𝙈𝙤𝙤𝙣𝙡𝙞𝙜𝙝𝙩 𝙎𝙩𝙖𝙛𝙛
> ${config.group3}`;
            
            // ===== CARGAR ICONO DEL BOT (info/{número}/icon.jpg) =====
            let imageBuffer = null;
            
            // Buscar icono específico del bot
            if (botNumber) {
                const botIconPath = path.join(process.cwd(), 'info', botNumber, 'icon.jpg');
                console.log(`[GROUPS] Buscando icono en: ${botIconPath}`);
                
                if (fs.existsSync(botIconPath)) {
                    imageBuffer = fs.readFileSync(botIconPath);
                    console.log(`✅ Icono específico cargado para bot ${botNumber}`);
                }
            }
            
            // Si no hay icono específico, buscar icono general
            if (!imageBuffer) {
                const generalIconPath = path.join(__dirname, '..', 'img', 'icon.jpg');
                console.log(`[GROUPS] Buscando icono general en: ${generalIconPath}`);
                
                if (fs.existsSync(generalIconPath)) {
                    imageBuffer = fs.readFileSync(generalIconPath);
                    console.log(`✅ Icono general cargado`);
                }
            }
            
            // Enviar mensaje
            if (imageBuffer) {
                await sock.sendMessage(from, {
                    text: groupsMessage,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        externalAdReply: {
                            title: `🌠 ${config.name || 'BOT'} - GRUPOS OFICIALES`,
                            body: `𝙂𝙧𝙪𝙥𝙤𝙨 - ૮ ⸝⸝>  ̫ <⸝⸝ ა`,
                            mediaType: 1,
                            thumbnail: imageBuffer,
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
                
                console.log(`✅ Grupos enviados con icono a ${pushName || senderNumber}`);
                
            } else {
                // Si no hay imagen, enviar solo texto
                await sock.sendMessage(from, {
                    text: groupsMessage,
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
                
                console.log(`✅ Grupos enviados (sin icono) a ${pushName || senderNumber}`);
            }
            
        } catch (error) {
            console.error('❌ Error en comando groups:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `♡ Error al mostrar los grupos\n> Detalles: ${error.message.substring(0, 100)}`,
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
            } catch (e) {}
        }
    }
};