import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_PACKS_FILE = path.join(__dirname, '..', 'databases', 'public_packs.json');

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

const DEFAULT_IMAGE_URL = 'https://files.catbox.moe/hq8tng.jpg';

export default {
    name: 'packsearch',
    alias: ['buscarpack', 'searchpack'],
 category: 'search',
    
    async execute(sock, msg, options) {
        try {
            const { config, args, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
            const query = args.join(' ').trim().toLowerCase();
            
            if (!query) {
                return await sock.sendMessage(from, {
                    text: `⭐ debes proporcionar el nombre de un pack\n> Ejemplo: ${config.prefix}packsearch memes`,
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
            
            await sock.sendPresenceUpdate('composing', from);
            
            try {
                await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
            } catch (e) {}
            
            const publicPacks = loadPublicPacksDB();
            
            const results = [];
            
            for (const [id, pack] of Object.entries(publicPacks)) {
                if (pack.name.toLowerCase().includes(query)) {
                    results.push({
                        id: id,
                        name: pack.name,
                        stickers: pack.stickers,
                        ownerName: pack.ownerName,
                        owner: pack.owner
                    });
                }
            }
            
            if (results.length === 0) {
                return await sock.sendMessage(from, {
                    text: `🌽 No se encontraron packs públicos con *${query}*`,
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
            
            const topResults = results.slice(0, 5);
            
            let defaultImageBuffer = null;
            try {
                const imgResponse = await axios.get(DEFAULT_IMAGE_URL, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                defaultImageBuffer = Buffer.from(imgResponse.data);
            } catch (e) {
                console.log('Error descargando imagen por defecto:', e.message);
            }
            
            const cards = [];
            
            for (let i = 0; i < topResults.length; i++) {
                const pack = topResults[i];
                
                cards.push({
                    image: defaultImageBuffer,
                    title: `⭐ ${pack.name}`,
                    body: `🍭 *Nombre* » ${pack.name}\n` +
                          `🍭 *Stickers* » ${pack.stickers}\n` +
                          `🍭 *Creado por* » ${pack.ownerName}\n` +
                          `🍭 *ID* » ${pack.id}`,
                    footer: `🍬 Resultado ${i + 1}/${topResults.length}`,
                    interactiveButtons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Copy",
                                copy_code: pack.id
                            })
                        }
                    ]
                });
            }
            
            await sock.sendMessage(from, {
                text: `🔍 *Pack Search* 🔍\n\n` +
                      `݂〫𝆬⭐֮᷼𑣲᮫ׅׄ *Búsqueda:* ${query}\n` +
                      `݂〫𝆬⭐֮᷼𑣲᮫ׅׄ *Resultados:* ${topResults.length} packs\n\n` +
                      `*Resultados encontrados*`,
                title: '🍬 Public Packs',
                subtile: `Resultados para: ${query}`,
                footer: '⭐ Moonlight Staff ⭐',
                cards: cards
            }, { quoted: msg });
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ Pack Search: "${query}" - ${topResults.length} packs encontrados por ${pushName || 'Usuario'}`);
            
        } catch (error) {
            console.error('❌ Error en packsearch:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error al realizar la búsqueda: ${error.message}`,
                contextInfo: {
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: options.config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: options.config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
        }
    }
};