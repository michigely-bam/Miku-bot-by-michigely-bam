import fs from 'fs';
import path from 'path';

function buscarArchivoPlugin(nombre, directorio = './plugins') {
    const archivos = fs.readdirSync(directorio, { withFileTypes: true });

    for (const archivo of archivos) {
        const rutaCompleta = path.join(directorio, archivo.name);

        if (archivo.isDirectory()) {
            const resultado = buscarArchivoPlugin(nombre, rutaCompleta);
            if (resultado) return resultado;
        } else if (archivo.name.endsWith('.js')) {
            const nombreSinExt = archivo.name.replace('.js', '').toLowerCase();
            if (nombreSinExt === nombre.toLowerCase()) {
                return rutaCompleta;
            }
        }
    }
    return null;
}

export default {
    name: 'setcategory',
    alias: ['sc', 'setcat'],
    category: 'Owner',
    description: 'Cambia la categoría de uno o varios comandos',
    usage: '<categoria> <comando1> <comando2>...',

    async execute(sock, msg, options) {
        try {
            const { config, args, plugins } = options;
            const from = msg.key.remoteJid;

            const senderNumber = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            const isOwner = config.owner && config.owner.some(ownerNum =>
                ownerNum.replace(/\D/g, '') === senderNumber.replace(/\D/g, '')
            );
            if (!isOwner) return;

            if (!args || args.length < 2) {
                return await sock.sendMessage(from, {
                    text: `🌠 Uso: ${config.prefix}setcategory <categoria> <comando1> <comando2>\n` +
                          `Ejemplo: ${config.prefix}setcategory Economy crime tienda`,
                    quoted: msg
                });
            }

            const nuevaCat = args[0];
            const comandos = args.slice(1);

            let exitosos = [];
            let fallidos = [];

            await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

            for (const nombreComando of comandos) {
                const nombreLower = nombreComando.toLowerCase();

                // Buscar el plugin por name O alias
                let pluginEncontrado = null;
                for (const [key, plugin] of plugins) {
                    if (plugin.name === nombreLower || (plugin.alias && plugin.alias.includes(nombreLower))) {
                        pluginEncontrado = plugin;
                        break;
                    }
                }

                if (!pluginEncontrado) {
                    fallidos.push(nombreComando);
                    continue;
                }

                // Buscar archivo por name del plugin
                let pluginPath = buscarArchivoPlugin(pluginEncontrado.name);

                // Si no lo encuentra, buscar por alias[0] o por key del map
                if (!pluginPath) {
                    for (const [key, plugin] of plugins) {
                        if (plugin.name === pluginEncontrado.name) {
                            pluginPath = buscarArchivoPlugin(key.replace('.js',''));
                            if(pluginPath) break;
                        }
                    }
                }

                if (!pluginPath) {
                    fallidos.push(nombreComando);
                    continue;
                }

                try {
                    let fileContent = fs.readFileSync(pluginPath, 'utf8');

                    if (/category:\s*['"`].*?['"`]/.test(fileContent)) {
                        fileContent = fileContent.replace(/category:\s*['"`].*?['"`]/, `category: '${nuevaCat}'`);
                    } else if (/alias:\s*\[.*?\],/.test(fileContent)) {
                        fileContent = fileContent.replace(/(alias:\s*\[.*?\],)/, `$1\n category: '${nuevaCat}',`);
                    } else {
                        fileContent = fileContent.replace(/(name:\s*['"`].*?['"`],)/, `$1\n category: '${nuevaCat}',`);
                    }

                    fs.writeFileSync(pluginPath, fileContent, 'utf8');
                    exitosos.push(`${pluginEncontrado.name} -> ${nuevaCat}`);

                } catch (e) {
                    fallidos.push(nombreComando);
                    console.error(`Error con ${nombreComando}:`, e);
                }
            }

            let resultadoText = `✅ Resultado:\n`;
            if (exitosos.length > 0) resultadoText += `\n*Movidos:*\n${exitosos.join('\n')}`;
            if (fallidos.length > 0) resultadoText += `\n\n*No encontrados:*\n${fallidos.join('\n')}`;
            resultadoText += `\n\nReinicia con ${config.prefix}restart`;

            await sock.sendMessage(from, { text: resultadoText, quoted: msg });
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('Error en setcategory:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}`, quoted: msg });
        }
    }
};