import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'reload',
    alias: ['recargar', 'refresh'],
    description: 'Recarga todos los comandos del bot (solo owner)',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { config, replyWithContext, isOwner, pushName, userNumber } = options;
            
            if (!isOwner) {
                return await replyWithContext(`🌌 El comando \`${config.prefix}reload\` es solo para owner.\n> Usa ${config.prefix}help para ver mis comandos`);
            }
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔄', key: msg.key } });
            } catch (e) {}
            
            try {
                // Obtener la función cargarPlugins del index
                const indexModule = await import('../index.js');
                
                const pluginsDir = path.join(process.cwd(), 'plugins');
                
                if (!fs.existsSync(pluginsDir)) {
                    return await replyWithContext(`🌠 No se encontró la carpeta de plugins`);
                }
                
                const pluginFiles = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
                
                let successCount = 0;
                let failCount = 0;
                const failedPlugins = [];
                
                // Limpiar plugins existentes (accediendo al plugins del handler)
                let pluginsMap = options.plugins;
                if (pluginsMap) {
                    pluginsMap.clear();
                }
                
                // Recargar plugins usando el mismo método que index.js
                for (const file of pluginFiles) {
                    try {
                        const filePath = path.join(pluginsDir, file);
                        const fileUrl = `file://${filePath}?update=${Date.now()}`;
                        const pluginModule = await import(fileUrl);
                        const pluginData = pluginModule.default || pluginModule;
                        
                        if (pluginData && pluginData.name) {
                            if (pluginsMap) {
                                pluginsMap.set(pluginData.name.toLowerCase(), pluginData);
                                
                                if (pluginData.alias && Array.isArray(pluginData.alias)) {
                                    pluginData.alias.forEach(alias => {
                                        pluginsMap.set(alias.toLowerCase(), pluginData);
                                    });
                                }
                            }
                            successCount++;
                            console.log(`✅ Plugin recargado: ${pluginData.name}`);
                        } else {
                            failCount++;
                            failedPlugins.push({
                                nombre: file,
                                error: 'El plugin no exporta un nombre válido'
                            });
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 10));
                        
                    } catch (error) {
                        failCount++;
                        failedPlugins.push({
                            nombre: file,
                            error: error.message || error.toString()
                        });
                        console.error(`❌ Error recargando ${file}:`, error);
                    }
                }
                
                let resultMessage = `🌠 *Plugins Recargados*\n> ✅ Exitosos: ${successCount}\n> ❌ Fallidos: ${failCount}`;
                
                if (failCount > 0 && failedPlugins.length > 0) {
                    resultMessage += `\n\n❌ *Plugins con error:*\n`;
                    failedPlugins.forEach(plugin => {
                        resultMessage += `\n📄 *${plugin.nombre}*\n\`\`\`\n${plugin.error}\n\`\`\`\n`;
                    });
                }
                
                // Si el mensaje es muy largo, dividirlo
                if (resultMessage.length > 4000) {
                    // Enviar primero el resumen
                    await replyWithContext(`🌠 *Plugins Recargados*\n> ✅ Exitosos: ${successCount}\n> ❌ Fallidos: ${failCount}\n\n📄 Enviando errores detallados...`);
                    
                    // Enviar cada error por separado
                    for (const plugin of failedPlugins) {
                        const errorMsg = `📄 *${plugin.nombre}*\n\`\`\`\n${plugin.error}\n\`\`\``;
                        await sock.sendMessage(msg.key.remoteJid, { text: errorMsg });
                    }
                } else {
                    await replyWithContext(resultMessage);
                }
                
                try {
                    await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
                } catch (e) {}
                
                console.log(`✅ Plugins recargados por OWNER: ${pushName || userNumber} - Éxito: ${successCount}, Fallos: ${failCount}`);
                
            } catch (error) {
                console.error('Error en reload:', error);
                await replyWithContext(`🌠 Error al recargar plugins:\n\`\`\`\n${error.stack || error.message}\n\`\`\``);
            }
            
        } catch (error) {
            console.error('❌ Error en reload:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ *Error:*\n\`\`\`\n${error.stack || error.message}\n\`\`\``);
            } catch (e) {}
        }
    }
};