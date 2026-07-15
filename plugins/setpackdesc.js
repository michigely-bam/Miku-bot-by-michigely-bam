import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_FILE = path.join(__dirname, '..', 'databases', 'packs.json');

const loadPacksDB = () => {
    try {
        if (fs.existsSync(PACKS_FILE)) {
            const data = fs.readFileSync(PACKS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error cargando packs.json:', error);
    }
    return {};
};

const savePacksDB = (packsDB) => {
    try {
        const dbDir = path.join(__dirname, '..', 'databases');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        fs.writeFileSync(PACKS_FILE, JSON.stringify(packsDB, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error guardando packs.json:', error);
        return false;
    }
};

export default {
    name: 'setpackdesc',
    alias: ['packdesc'],
 category: 'Main',
    
    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, senderJid, args, pushName } = options;
            const from = msg.key.remoteJid;
            
            if (args.length < 3) {
                return await sock.sendMessage(from, {
                    text: `「✰」Debes proporcionar un pack y una descripción\n> Ejemplo: ${config.prefix}setpackdesc nombre del pack / descripción`,
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
            
            // Unir todos los argumentos para buscar el separador /
            const fullText = args.join(' ');
            const separatorIndex = fullText.indexOf(' / ');
            
            if (separatorIndex === -1) {
                return await sock.sendMessage(from, {
                    text: `「✰」Formato incorrecto\n> Ejemplo: ${config.prefix}setpackdesc Mis Stickers / Hola mundo`,
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
            
            // Extraer nombre del pack y descripción
            const packName = fullText.substring(0, separatorIndex).trim();
            const description = fullText.substring(separatorIndex + 3).trim(); // +3 para saltar " / "
            
            if (!packName) {
                return await sock.sendMessage(from, {
                    text: `「✰」Debes proporcionar el nombre del pack`,
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
            
            if (!description) {
                return await sock.sendMessage(from, {
                    text: `「✰」Debes proporcionar una descripción`,
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
            
            const packsDB = loadPacksDB();
            
            if (!packsDB[senderNumber] || !packsDB[senderNumber].packs) {
                return await sock.sendMessage(from, {
                    text: `「✰」No tienes ningún pack creado\n> Crea uno con ${config.prefix}newpack <nombre>`,
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
            
            const pack = packsDB[senderNumber].packs.find(p => p.name.toLowerCase() === packName.toLowerCase());
            
            if (!pack) {
                // Buscar packs similares
                const similarPacks = packsDB[senderNumber].packs.filter(p => 
                    p.name.toLowerCase().includes(packName.toLowerCase())
                );
                
                if (similarPacks.length > 0) {
                    const similarList = similarPacks.map(p => `• ${p.name}`).join('\n');
                    return await sock.sendMessage(from, {
                        text: `「✰」No tienes un pack llamado "${packName}"`,
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
                
                return await sock.sendMessage(from, {
                    text: `「✰」No tienes un pack llamado "${packName}"\n> Usa ${config.prefix}packlist para ver tus packs`,
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
            
            // Guardar descripción anterior
            const oldDesc = pack.desc || 'Sin descripción';
            
            // Actualizar descripción
            pack.desc = description;
            pack.lastModified = Date.now().toString();
            
            savePacksDB(packsDB);
            
            await sock.sendMessage(from, {
                text: `《✧》Descripción del pack actualizada`,
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
            
            console.log(`✅ Descripción del pack "${pack.name}" actualizada por ${pushName || senderNumber}`);
            
        } catch (error) {
            console.error('❌ Error en setpackdesc:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`,
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