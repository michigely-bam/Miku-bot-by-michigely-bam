import fs from 'fs';
import path from 'path';

export default {
    name: 'scan',
    alias: ['scandir'],
    category: 'Owner',
    description: 'Escanea y dice en qué archivo está cada comando',

    async execute(sock, msg, {config}) {
        const from = msg.key.remoteJid;
        const comandosBuscados = ['crime', 'tienda', 'setgenero', 'setmeta'];
        let resultado = `🔍 *Buscando comandos:*\n\n`;

        function buscar(dir) {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                const ruta = path.join(dir, file.name);
                if (file.isDirectory()) buscar(ruta);
                if (file.name.endsWith('.js')) {
                    const content = fs.readFileSync(ruta, 'utf8');
                    for (const cmd of comandosBuscados) {
                        if (content.includes(`name: '${cmd}'`) || content.includes(`name: "${cmd}"`)) {
                            resultado += `• *${cmd}* → \`${ruta}\`\n`;
                        }
                    }
                }
            }
        }
        buscar('./plugins');

        await sock.sendMessage(from, { text: resultado }, { quoted: msg });
    }
}