import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// ID del creador (número)
const CREATOR_NUMBER = "5219992042946";

export default {
    name: 'npm',
    alias: ['pkg', 'package', 'module'],
 category: 'Owner',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, pushName, senderNumber, senderJid } = options;
            const from = msg.key.remoteJid;
            
            // Verificar si es el creador
            if (senderNumber !== CREATOR_NUMBER) {
                await sock.sendMessage(from, {
                    text: `๑ֵ݊🍀 ᥱᥣ ᥴ᥆mᥲᥒძ᥆ \`${config.prefix}npm\` ᥒ᥆ ᥱ᥊іs𝗍ᥱ.\n> ೯۪🎑̶ֵ ᥙsᥲ ${config.prefix}help ⍴ᥲrᥲ ᥎ᥱr mіs ᥴ᥆mᥲᥒძ᥆s`,
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
            
            const command = args.join(' ');
            
            // Mostrar ayuda si no hay comando
            if (!command) {
                await sock.sendMessage(from, {
                    text: `♡ *Comando NPM* ♡\n\n` +
                          `📦 *Uso:*\n` +
                          `• ${config.prefix}npm install <paquete>\n` +
                          `• ${config.prefix}npm uninstall <paquete>\n` +
                          `• ${config.prefix}npm update <paquete>\n` +
                          `• ${config.prefix}npm list\n\n` +
                          `🔧 *Ejemplos:*\n` +
                          `• ${config.prefix}npm install axios\n` +
                          `• ${config.prefix}npm uninstall cheerio\n` +
                          `• ${config.prefix}npm list`,
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
            
            const parts = command.split(' ');
            const action = parts[0].toLowerCase();
            const packageName = parts.slice(1).join(' ');
            
            // Validar acciones permitidas
            const allowedActions = ['install', 'i', 'uninstall', 'remove', 'rm', 'update', 'upgrade', 'list', 'ls', 'search'];
            
            if (!allowedActions.includes(action)) {
                await sock.sendMessage(from, {
                    text: `♡ *Acción no válida*\n\n` +
                          `Acciones permitidas:\n` +
                          `• install/i - Instalar paquete\n` +
                          `• uninstall/remove/rm - Desinstalar\n` +
                          `• update/upgrade - Actualizar\n` +
                          `• list/ls - Listar paquetes\n` +
                          `• search - Buscar paquetes`,
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
            
            // Para listar paquetes
            if (action === 'list' || action === 'ls') {
                try {
                    await sock.sendMessage(from, {
                        text: '♡ Obteniendo lista de paquetes... 📦',
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
                    
                    const { stdout } = await execAsync('npm list --depth=0 --json', { cwd: process.cwd() });
                    const packages = JSON.parse(stdout);
                    
                    let packageList = '♡ *Paquetes Instalados* ♡\n\n';
                    let count = 0;
                    
                    if (packages.dependencies) {
                        for (const [name, info] of Object.entries(packages.dependencies)) {
                            packageList += `• *${name}* - v${info.version}\n`;
                            count++;
                            
                            if (count >= 20) {
                                packageList += `\n... y ${Object.keys(packages.dependencies).length - 20} más`;
                                break;
                            }
                        }
                    }
                    
                    packageList += `\n📊 Total: ${count} paquete${count !== 1 ? 's' : ''}`;
                    
                    await sock.sendMessage(from, {
                        text: packageList,
                        contextInfo: {
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            },
                            forwardingScore: 9999999,
                            isForwarded: true
                        }
                    });
                    return;
                    
                } catch (error) {
                    await sock.sendMessage(from, {
                        text: `♡ Error al listar paquetes:\n${error.message}`,
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
            }
            
            // Para buscar paquetes
            if (action === 'search' && packageName) {
                try {
                    await sock.sendMessage(from, {
                        text: `♡ Buscando "${packageName}" en NPM... 🔍`,
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
                    
                    const { stdout } = await execAsync(`npm search ${packageName} --json`, { cwd: process.cwd() });
                    const results = JSON.parse(stdout).slice(0, 10);
                    
                    let searchResults = `♡ *Resultados para "${packageName}"* ♡\n\n`;
                    
                    if (results.length === 0) {
                        searchResults += 'No se encontraron paquetes';
                    } else {
                        results.forEach((pkg, index) => {
                            searchResults += `${index + 1}. *${pkg.name}*\n   📦 v${pkg.version}\n   📝 ${pkg.description?.substring(0, 80) || 'Sin descripción'}...\n\n`;
                        });
                    }
                    
                    await sock.sendMessage(from, {
                        text: searchResults,
                        contextInfo: {
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            },
                            forwardingScore: 9999999,
                            isForwarded: true
                        }
                    });
                    return;
                    
                } catch (error) {
                    await sock.sendMessage(from, {
                        text: `♡ Error en búsqueda:\n${error.message}`,
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
            }
            
            // Verificar que se proporcionó nombre de paquete
            if (!packageName && (action === 'install' || action === 'uninstall' || action === 'update')) {
                await sock.sendMessage(from, {
                    text: `♡ *Falta nombre del paquete*\n\nUso: ${config.prefix}npm ${action} <nombre-paquete>`,
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
            
            try {
                // Enviar mensaje de procesamiento
                await sock.sendMessage(from, {
                    text: `♡ Ejecutando: \`npm ${action} ${packageName}\`\n⏱️ Esto puede tomar unos segundos...`,
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
                
                // Mapear acciones
                let npmAction = action;
                if (action === 'i') npmAction = 'install';
                if (action === 'rm' || action === 'remove') npmAction = 'uninstall';
                if (action === 'upgrade') npmAction = 'update';
                
                // Ejecutar comando npm
                const commandToRun = `npm ${npmAction} ${packageName} --save`;
                
                try {
                    const { stdout, stderr } = await execAsync(commandToRun, {
                        cwd: process.cwd(),
                        timeout: 120000 // 2 minutos timeout
                    });
                    
                    // Verificar resultado
                    const packagePath = path.join(process.cwd(), 'node_modules', packageName.split('@')[0]);
                    const existsAfter = fs.existsSync(packagePath);
                    
                    if (npmAction === 'install') {
                        if (!existsAfter) {
                            throw new Error(`Instalación falló: ${packageName}`);
                        }
                        
                        // Calcular tamaño del paquete
                        let totalSize = 0;
                        let fileCount = 0;
                        
                        function calculateSize(dir) {
                            if (!fs.existsSync(dir)) return;
                            
                            try {
                                const items = fs.readdirSync(dir);
                                for (const item of items) {
                                    const itemPath = path.join(dir, item);
                                    try {
                                        const stats = fs.statSync(itemPath);
                                        if (stats.isFile()) {
                                            fileCount++;
                                            totalSize += stats.size;
                                        } else if (stats.isDirectory() && item !== 'node_modules') {
                                            calculateSize(itemPath);
                                        }
                                    } catch (e) {
                                        // Ignorar errores
                                    }
                                }
                            } catch (e) {
                                // Ignorar errores
                            }
                        }
                        
                        calculateSize(packagePath);
                        
                        // Formatear tamaño
                        let sizeText;
                        if (totalSize < 1024) {
                            sizeText = `${totalSize} bytes`;
                        } else if (totalSize < 1024 * 1024) {
                            sizeText = `${(totalSize / 1024).toFixed(2)} KB`;
                        } else {
                            sizeText = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
                        }
                        
                        // Obtener información del paquete
                        let packageInfo = { name: packageName };
                        try {
                            const packageJsonPath = path.join(packagePath, 'package.json');
                            if (fs.existsSync(packageJsonPath)) {
                                packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                            }
                        } catch (e) {
                            // Ignorar error
                        }
                        
                        // Mensaje de éxito
                        const successMessage = 
                            `♡ *Paquete Instalado* ♡\n\n` +
                            `📦 *Nombre:* ${packageInfo.name || packageName}\n` +
                            `🏷️ *Versión:* ${packageInfo.version || 'N/A'}\n` +
                            `📊 *Tamaño:* ${sizeText}\n` +
                            `📄 *Archivos:* ${fileCount}\n` +
                            `📁 *Ruta:* node_modules/${packageName.split('@')[0]}\n\n` +
                            `✅ *Instalación completada exitosamente*`;
                        
                        await sock.sendMessage(from, {
                            text: successMessage,
                            contextInfo: {
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: config.canalId || '',
                                    serverMessageId: 0,
                                    newsletterName: config.canalNombre || ''
                                },
                                forwardingScore: 9999999,
                                isForwarded: true
                            }
                        });
                        
                    } else if (npmAction === 'uninstall') {
                        // Mensaje de éxito para desinstalación
                        const successMessage = 
                            `♡ *Paquete Desinstalado* ♡\n\n` +
                            `📦 *Nombre:* ${packageName}\n` +
                            `🗑️ *Estado:* Eliminado completamente\n\n` +
                            `✅ *Desinstalación completada exitosamente*`;
                        
                        await sock.sendMessage(from, {
                            text: successMessage,
                            contextInfo: {
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: config.canalId || '',
                                    serverMessageId: 0,
                                    newsletterName: config.canalNombre || ''
                                },
                                forwardingScore: 9999999,
                                isForwarded: true
                            }
                        });
                        
                    } else if (npmAction === 'update') {
                        // Mensaje de éxito para actualización
                        const successMessage = 
                            `♡ *Paquete Actualizado* ♡\n\n` +
                            `📦 *Nombre:* ${packageName}\n` +
                            `🔄 *Acción:* Actualizado a la última versión\n\n` +
                            `✅ *Actualización completada exitosamente*`;
                        
                        await sock.sendMessage(from, {
                            text: successMessage,
                            contextInfo: {
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: config.canalId || '',
                                    serverMessageId: 0,
                                    newsletterName: config.canalNombre || ''
                                },
                                forwardingScore: 9999999,
                                isForwarded: true
                            }
                        });
                    }
                    
                } catch (execError) {
                    console.error('Error ejecutando npm:', execError.message);
                    
                    let errorMessage = `♡ *Error en comando NPM*\n\n`;
                    
                    if (execError.message.includes('404') || execError.message.includes('not found')) {
                        errorMessage += `📦 El paquete *${packageName}* no existe en NPM`;
                    } else if (execError.message.includes('permission denied') || execError.message.includes('EACCES')) {
                        errorMessage += `🔒 Permiso denegado\nEjecuta manualmente con permisos adecuados`;
                    } else if (execError.message.includes('timeout')) {
                        errorMessage += `⏱️ Tiempo excedido\nEl comando tardó demasiado`;
                    } else if (execError.message.includes('already installed')) {
                        errorMessage += `⚠️ El paquete ya está instalado`;
                    } else if (execError.message.includes('no such package')) {
                        errorMessage += `❌ El paquete no está instalado`;
                    } else {
                        errorMessage += `🔧 Error: ${execError.message.substring(0, 100)}`;
                    }
                    
                    await sock.sendMessage(from, {
                        text: errorMessage,
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
                }
                
            } catch (error) {
                console.error('Error en comando npm:', error);
                
                await sock.sendMessage(from, {
                    text: `♡ *Error crítico*\n\n${error.message.substring(0, 100)}`,
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
            }
            
        } catch (error) {
            console.error('❌ Error general en npm:', error);
            
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
        }
    }
};