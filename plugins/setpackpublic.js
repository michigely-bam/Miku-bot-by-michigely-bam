import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_FILE = path.join(__dirname, '..', 'databases', 'packs.json');
const PUBLIC_PACKS_FILE = path.join(__dirname, '..', 'databases', 'public_packs.json');

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

const loadPublicPacksDB = () => {
    try {
        if (fs.existsSync(PUBLIC_PACKS_FILE)) {
            const data = fs.readFileSync(PUBLIC_PACKS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error cargando public_packs.json:', error);
    }
    return {};
};

const savePublicPacksDB = (publicPacks) => {
    try {
        const dbDir = path.join(__dirname, '..', 'databases');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        fs.writeFileSync(PUBLIC_PACKS_FILE, JSON.stringify(publicPacks, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error guardando public_packs.json:', error);
        return false;
    }
};

export default {
    name: 'setpackpublic',
    alias: ['packpublic', 'publicpack'],
 category: 'Main',
    
    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, senderJid, args, pushName } = options;
            const from = msg.key.remoteJid;
            
            const packName = args.join(' ').trim();
            
            if (!packName) {
                return await sock.sendMessage(from, {
                    text: `🌸 *Debes proporcionar el nombre del pack*\n\n> Ejemplo: ${config.prefix}setpackpublic Mis Stickers`,
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
                    text: `🌸 *No tienes ningún pack creado*`,
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
                return await sock.sendMessage(from, {
                    text: `🌸 *No tienes un pack llamado "${packName}"*\n\n> Usa ${config.prefix}packlist para ver tus packs`,
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
            
            // Cambiar estado público (0 = privado, 1 = público)
            const nuevoEstado = pack.spackpublic === 1 ? 0 : 1;
            pack.spackpublic = nuevoEstado;
            
            savePacksDB(packsDB);
            
            // Sincronizar con public_packs.json (guardar el pack completo)
            const publicPacks = loadPublicPacksDB();
            const packId = pack.id;
            
            if (nuevoEstado === 1) {
                // Guardar el pack completo en públicos
                publicPacks[packId] = {
                    id: pack.id,
                    name: pack.name,
                    owner: pack.owner,
                    ownerName: pack.ownerName,
                    stickers: pack.stickers,
                    createdAt: pack.createdAt,
                    timestamp: pack.timestamp,
                    desc: pack.desc,
                    author: pack.author
                };
                console.log(`📦 Pack "${pack.name}" agregado a públicos con ID: ${packId}`);
            } else {
                // Eliminar de públicos
                if (publicPacks[packId]) {
                    delete publicPacks[packId];
                    console.log(`📦 Pack "${pack.name}" eliminado de públicos`);
                }
            }
            
            savePublicPacksDB(publicPacks);
            
            const estado = nuevoEstado === 1 ? 'público' : 'privado';
            
            await sock.sendMessage(from, {
                text: `⭐ *Pack "${pack.name}" ahora es ${estado}*\n> ID: ${pack.id}`,
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
            
        } catch (error) {
            console.error('❌ Error en setpackpublic:', error);
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