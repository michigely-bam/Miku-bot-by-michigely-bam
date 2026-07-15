import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const metadataFile = path.join(__dirname, '../databases/user_metadata.json');

function loadMetadata() {
    try {
        if (fs.existsSync(metadataFile)) {
            const data = fs.readFileSync(metadataFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error cargando metadatos:', error);
    }
    return {};
}

function saveMetadata(metadata) {
    try {
        const dir = path.dirname(metadataFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
        return true;
    } catch (error) {
        console.log('Error guardando metadatos:', error);
        return false;
    }
}

export default {
    name: 'setmeta',
    alias: [],
 category: 'herramientas',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
            const from = msg.key.remoteJid;
            
            // Verificar registro (usando senderNumber)
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

            if (!args || args.length === 0) {
                await sock.sendMessage(from, { 
                    text: `🌠 Uso: ${config.prefix}setmeta <packname> | <autor>\nEjemplo: ${config.prefix}setmeta Dano | Nino`,
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

            const fullArgs = args.join(' ');

            try {
                let customPackname = '';
                let customAuthor = '';

                if (fullArgs.includes('|')) {
                    const parts = fullArgs.split('|').map(part => part.trim());
                    customPackname = parts[0] || '';
                    customAuthor = parts[1] || '';
                    
                    if (fullArgs.startsWith('|')) {
                        customPackname = '';
                        customAuthor = parts[1] || '';
                    }
                } else {
                    customPackname = fullArgs;
                    customAuthor = '';
                }

                const metadata = loadMetadata();
                const hasExistingMeta = metadata[senderNumber];
                
                if (!customPackname && hasExistingMeta) {
                    customPackname = hasExistingMeta.packname;
                }
                
                metadata[senderNumber] = {
                    packname: customPackname,
                    author: customAuthor,
                    setAt: new Date().toISOString(),
                    setBy: pushName || senderNumber,
                    userJid: senderJid
                };

                const saved = saveMetadata(metadata);
                
                if (saved) {
                    await sock.sendMessage(from, { 
                        text: `🌟 ${hasExistingMeta ? 'Actualizado' : 'Establecido'} pack de stickers:\n> Pack: ${customPackname || '(vacío)'}\n> Autor: ${customAuthor || '(vacío)'}`,
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
                    
                    console.log(`✅ Metadata ${hasExistingMeta ? 'actualizada' : 'establecida'} para ${pushName || senderNumber}: ${customPackname} | ${customAuthor}`);
                } else {
                    await sock.sendMessage(from, { 
                        text: '🍓 Error al guardar configuración',
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
                console.log('Error en setmeta:', error);
                await sock.sendMessage(from, { 
                    text: '🍓 Error al establecer metadata',
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
            console.error('❌ Error en setmeta:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Error: ${error.message}`,
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