import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { prepareWAMessageMedia } from '@whiskeysockets/baileys';
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toBold = (str = '') => {
    const map = { 'A':'𝘼','B':'𝘽','C':'𝘾','D':'𝘿','E':'𝙀','F':'𝙁','G':'𝙂','H':'𝙃','I':'𝙄','J':'𝙅','K':'𝙆','L':'𝙇','M':'𝙈','N':'𝙉','O':'𝙊','P':'𝙋','Q':'𝙌','R':'𝙍','S':'𝙎','T':'𝙏','U':'𝙐','V':'𝙑','W':'𝙒','X':'𝙓','Y':'𝙔','Z':'𝙕',
    'a':'𝙖','b':'𝙗','c':'𝙘','d':'𝙙','e':'𝙚','f':'𝙛','g':'𝙜','h':'𝙝','i':'𝙞','j':'𝙟','k':'𝙠','l':'𝙡','m':'𝙢','n':'𝙣','o':'𝙤','p':'𝙥','q':'𝙦','r':'𝙧','s':'𝙨','t':'𝙩','u':'𝙪','v':'𝙫','w':'𝙬','x':'𝙭','y':'𝙮','z':'𝙯',
    '0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵' };
    return String(str).split('').map(c => map[c] || c).join('');
}

// DICCIONARIO DE SINONIMOS DE CATEGORIAS
const sinonimosCategorias = {
    'grupo': 'Grupo',
    'group': 'Grupo',
    'descargas': 'Descargas',
    'download': 'Descargas',
    'downloader': 'Descargas',
    'herramientas': 'Herramientas',
    'tools': 'Herramientas',
    'diversión': 'Diversion',
    'diversion': 'Diversion',
    'divercion': 'Diversion',
    'economia': 'Economy',
    'economy': 'Economy',
    'ai': 'AI',
    'owner': 'Owner',
    'main': 'Main',
    'admin': 'Admin',
    'gacha': 'Gacha',
    'search': 'Search',
    'sub-bot': 'Sub-Bot',
    'subbot': 'Sub-Bot',
    'utilidad': 'Utilidad',
    'varios': 'Varios'
};

// FUNCION PARA NORMALIZAR CATEGORIA
const normalizarCategoria = (cat) => {
    if (!cat) return 'Sin Categoria';
    let normalizada = cat.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .trim();
    return sinonimosCategorias[normalizada] || capitalize(normalizada);
}

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// FUNCION PARA AGRUPAR POR CATEGORIA SIN DUPLICADOS
function generarListaComandos(plugins, prefix, config) { // <- RECIBE CONFIG
    if (!plugins) return '';

    const categorias = {};
    const comandosVistos = new Set();
    const categoriaDefault = config.scategoria || 'Sin Categoria'; // <- CATEGORIA PERSONALIZADA

    for (const [, plugin] of plugins) {
        if (!plugin?.name) continue;
        if (comandosVistos.has(plugin.name)) continue;
        comandosVistos.add(plugin.name);

        // Si no tiene categoria, usa la de config.scategoria
        const catRaw = plugin.category || categoriaDefault;
        const cat = normalizarCategoria(catRaw);

        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(plugin);
    }

    let lista = '';
    const catsOrdenadas = Object.keys(categorias).sort();

    for (const cat of catsOrdenadas) {
        const cmds = categorias[cat];
        lista += `\n» /⁠ᐠ⁠｡⁠ꞈ⁠｡⁠ᐟ⁠\\ ⊹ \`${cat}\` ⊹\n`;
        lista += `> ✐ Comandos de *${cat}*\n\n`;

        cmds.sort((a,b) => a.name.localeCompare(b.name));

        for (const cmd of cmds) {
            const names = [cmd.name,...(cmd.alias || [])];
            const aliases = names.map(n => `*${prefix}${n}*`).join(' ');
            const desc = cmd.description || 'Sin descripción';
            const usage = cmd.usage? ` _${cmd.usage}_` : '';

            lista += `❀ ${aliases}${usage}\n`;
            lista += `> ${desc}\n`;
        }
        lista += `\n`;
    }
    return lista;
}

export default {
    name: 'menu',
    alias: ['help', 'menú', 'comandos'],
    description: 'Muestra la lista de comandos del bot',
    category: 'Herramientas',

    async execute(sock, msg, options) {
        try {
            const { config, plugins } = options;
            const from = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const phone = sender.split('@')[0];

            const botNombre = config.nombre?.trim() || 'GALAXIT'
            const botTipo = config.tipo || 'PRINCIPAL'
            const developer = config.creador || phone
            const prefix = config.prefix || '.'
            const canalLink = 'https://whatsapp.com/channel/0029VbCq9xP2ZjCr6AGMzi1b'
            const webLink = config.web || 'https://moonstaff.onrender.com/'
            const bannerUrl = config.banner || 'https://i.ibb.co/JRz1vZgQ/galaxy.jpg'

            const userMention = `@${phone}`
            const listaComandos = generarListaComandos(plugins, prefix, config) // <- LE PASAMOS CONFIG

            // INFO IGUAL QUE ANTES
            let menuText = `> 𝙃𝙤𝙡𝙖 ${userMention}! 𝙎𝙤𝙮 ${toBold(botNombre)} ${toBold(`(${botTipo})`)} 𝘼𝙦𝙪𝙞 𝙩𝙞𝙚𝙣𝙚𝙨 𝙢𝙞𝙨 𝙘𝙤𝙢𝙖𝙣𝙙𝙤𝙨 𝙥𝙖𝙧𝙖 𝙚𝙭𝙥𝙡𝙤𝙩𝙖𝙧
╭┈ ↷
│ ✐ 𝙏𝙞𝙥𝙤 » ${botTipo}
│ ✐ 𝘿𝙚𝙫𝙚𝙡𝙤𝙥𝙚𝙧 » ${developer}
│ ✐ ꒷ꕤ🌌ദ *𝙬𝙚𝙗* ෴
│ ${webLink}
│ ✐ ꒷ꕤ🌌ദ *𝘾𝘼𝙉𝘼𝙇 𝙊𝙁𝙄𝘾𝙄𝘼𝙇:* ෴
│ ${canalLink}
╰─────────────────${listaComandos}`;

            if (bannerUrl) {
                try {
                    const uploadMethod = sock.waUploadToServer || sock.updateMediaMessage;

                    const { imageMessage } = await prepareWAMessageMedia(
                        { image: { url: bannerUrl } },
                        {
                            upload: uploadMethod,
                            mediaTypeOverride: 'thumbnail-link'
                        }
                    );

                    const linkPreview = {
                        'canonical-url': webLink,
                        'matched-text': webLink,
                        title: `${botNombre} - ${botTipo}`,
                        description: `Bot de WhatsApp | Dev: ${developer}`,
                        jpegThumbnail: imageMessage?.jpegThumbnail? Buffer.from(imageMessage.jpegThumbnail) : undefined,
                        highQualityThumbnail: imageMessage || undefined
                    };

                    await sock.sendMessage(from, {
                        text: menuText,
                        mentions: [sender],
                        linkPreview: linkPreview,
                        contextInfo: {
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '120363398123456789@newsletter',
                                serverMessageId: '0',
                                newsletterName: config.canalNombre || 'CANAL OFICIAL'
                            }
                        }
                    }, { quoted: msg });
                } catch (error) {
                    console.error('Error con banner en menu:', error);
                    await sock.sendMessage(from, { text: menuText, mentions: [sender] }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(from, { text: menuText, mentions: [sender] }, { quoted: msg });
            }

        } catch (error) {
            console.error('Error en menu:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};