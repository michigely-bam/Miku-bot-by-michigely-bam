import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 
const pluginsDir = __dirname; // <- Lee /plugins

export default {
    name: 'plugins',
    alias: ['misplugins', 'listaplugins', 'ls'],
    description: 'Lista todos los plugins en fila',
    category: 'owner',

    async execute(sock, msg, options) {
        try {
            const { isOwner } = options;
            const from = msg.key.remoteJid;

            if (!isOwner) return await sock.sendMessage(from, { text: '🌌 Solo owner 🫟' }, { quoted: msg });

            const archivos = fs.readdirSync(pluginsDir)
               .filter(file => file.endsWith('.js')) // <- todos los .js
               .map(f => f.replace('.js', '')) // <- quita el .js
               .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); // <- orden A-Z

            let texto = `╭─────────────────
│ 📂 *PLUGINS EN /plugins*
│ 🫟 *Total:* ${archivos.length}
╰─────────────────\n\n`;

            texto += archivos.join('\n'); // <- uno por línea

            // WhatsApp tiene límite de 4096 chars. Si tienes 89, te los parte.
            if (texto.length > 4000) {
                const partes = [];
                for (let i = 0; i < archivos.length; i += 40) {
                    partes.push(archivos.slice(i, i + 40).join('\n'));
                }
                for (const [i, parte] of partes.entries()) {
                    await sock.sendMessage(from, { text: `*Parte ${i+1}/${partes.length}*\n\n${parte}` }, { quoted: msg });
                }
                return;
            }

            await sock.sendMessage(from, { text: texto }, { quoted: msg });

        } catch (error) {
            await sock.sendMessage(msg.key.remoteJid, { text: `🌠 Error: ${error.message}` }, { quoted: msg });
        }
    }
};