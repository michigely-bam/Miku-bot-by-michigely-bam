import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'allmenu',
    alias: ['cm'],
    description: 'Muestra todos los comandos de una categoría',
    category: 'main',

    async execute(sock, msg, options) {
        try {
            const { config, usersDB, sender, pushName, plugins = new Map(), args } = options;
            const from = msg.key.remoteJid;
            const prefix = config.prefix || '.';
            const catSel = args[0]; // <- "descargas"

            if (!catSel) {
                return await sock.sendMessage(from, { text: `Uso: ${prefix}allmenu <categoria>` }, { quoted: msg });
            }

            if (usersDB && sender &&!usersDB[sender]) {
                return await sock.sendMessage(from, {
                    text: `🥡 Regístrate primero: ${prefix}reg nombre`
                }, { quoted: msg });
            }

            // 1. FILTRA PLUGINS POR CATEGORIA
            const cmds = [];
            for (const [_, plugin] of plugins) {
                if (!plugin.name ||!plugin.category) continue;
                if (plugin.category.toLowerCase() === 'owner' && sender!== config.owner) continue;

                if (plugin.category.toLowerCase() === catSel.toLowerCase()) {
                    const aliasTxt = plugin.alias?.length? ` | ${plugin.alias.join(', ')}` : '';
                    cmds.push(`> ${prefix}${plugin.name}${aliasTxt} - ${plugin.description || 'Sin desc'}`);
                }
            }

            if (cmds.length === 0) {
                return await sock.sendMessage(from, { text: `⚠️ No hay comandos en la categoria: ${catSel}` }, { quoted: msg });
            }

            // 2. TEXTO DECORADO DE LA CATEGORIA
            const menuText = `╭━━━〔 🌾 ${catSel.toUpperCase()} 〕━━━╮
${cmds.join('\n')}
╰━━━━ Total: ${cmds.length} ━━━━╯
`;

            // 3. MANDA LA MISMA FOTO
            let imageBuffer = null;
            try {
                if (config.banner) {
                    const res = await fetch(config.banner);
                    imageBuffer = Buffer.from(await res.arrayBuffer());
                }
            } catch (e) {}

            const payload = imageBuffer? { image: imageBuffer, caption: menuText } : { text: menuText };
            payload.footer = `v${config.version} | ${config.canalNombre}`;
            payload.contextInfo = {
                forwardingScore: 9999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.canalId || '',
                    newsletterName: config.canalNombre || ''
                }
            };

            await sock.sendMessage(from, payload, { quoted: msg });

        } catch (error) {
            console.error('Error en allmenu:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`
            }, { quoted: msg });
        }
    }
};