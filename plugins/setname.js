import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanNumber(number) {
    if (!number) return '';
    let cleaned = number.split('@')[0];
    cleaned = cleaned.split(':')[0];
    return cleaned.replace(/\D/g, '');
}

function getBotConfigPath(sock) {
    let botNumber = '';
    if (sock.phoneNumber) {
        botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
    } else if (sock.user?.id) {
        botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
    }
    
    if (!botNumber) return null;
    
    // Primero verificar si es sub-bot
    const subBotPath = path.join(process.cwd(), 'subs', botNumber, 'config.js');
    if (fs.existsSync(subBotPath)) {
        return { path: subBotPath, type: 'sub-bot', number: botNumber };
    }
    
    // Si no, es bot principal
    const mainPath = path.join(process.cwd(), 'config.js');
    if (fs.existsSync(mainPath)) {
        return { path: mainPath, type: 'main', number: botNumber };
    }
    
    return null;
}

export default {
    name: 'setname',
    alias: ['botname'],
    description: 'Cambia el nombre del bot (solo dueño del bot)',
    category: 'sub-bot',
    
    async execute(sock, msg, options) {
        try {
            const { config, args, senderNumber, replyWithContext, userNumber } = options;
            
            const userNumberClean = cleanNumber(senderNumber || userNumber || '');
            const botownerClean = config.botowner ? cleanNumber(config.botowner) : '';
            
            if (!botownerClean || userNumberClean !== botownerClean) {
                return await replyWithContext(`❀ *Solo el dueño de este bot puede cambiar su nombre*`);
            }
            
            if (!args || args.length === 0) {
                return await replyWithContext(`「✰」 *Formato incorrecto*\n\n> *Solo nombre corto:*\n> ${config.prefix}setname Roxy\n\n> *Nombre corto y largo:*\n> ${config.prefix}setname Roxy / Roxy Migurdia`);
            }
            
            const botConfig = getBotConfigPath(sock);
            if (!botConfig) {
                throw new Error('No se pudo encontrar la configuración del bot');
            }
            
            const configPath = botConfig.path;
            
            if (!fs.existsSync(configPath)) {
                throw new Error(`No se encontró configuración en: ${configPath}`);
            }
            
            const textoCompleto = args.join(' ');
            let nuevoNombreCorto = '';
            let nuevoNombreLargo = '';
            
            if (textoCompleto.includes(' / ')) {
                const partes = textoCompleto.split(' / ');
                nuevoNombreCorto = partes[0].trim();
                nuevoNombreLargo = partes[1].trim();
            } else {
                nuevoNombreCorto = textoCompleto.trim();
            }
            
            if (nuevoNombreCorto.length > 13) {
                return await replyWithContext(`*ᰔᩚ* *El nombre corto no puede tener más de 13 letras*`);
            }
            if (nuevoNombreLargo && nuevoNombreLargo.length > 17) {
                return await replyWithContext(`*ᰔᩚ* *El nombre largo no puede tener más de 17 letras*`);
            }
            
            let configContent = fs.readFileSync(configPath, 'utf8');
            
            // Actualizar nombre
            const nombreRegex = /(nombre:\s*['"])([^'"]+)(['"])/;
            let newConfigContent = configContent.replace(nombreRegex, `$1${nuevoNombreCorto}$3`);
            
            // Actualizar nombre2 si se proporcionó
            if (nuevoNombreLargo) {
                const nombre2Regex = /(nombre2:\s*['"])([^'"]+)(['"])/;
                if (nombre2Regex.test(newConfigContent)) {
                    newConfigContent = newConfigContent.replace(nombre2Regex, `$1${nuevoNombreLargo}$3`);
                } else {
                    newConfigContent = newConfigContent.replace(/(nombre:\s*['"][^'"]+['"]),/, `$1,\n  nombre2: '${nuevoNombreLargo}',`);
                }
            }
            
            fs.writeFileSync(configPath, newConfigContent, 'utf8');
            
            // Actualizar memoria
            if (options.config) {
                options.config.nombre = nuevoNombreCorto;
                if (nuevoNombreLargo) options.config.nombre2 = nuevoNombreLargo;
            }
            
            const mensaje = nuevoNombreLargo 
                ? `⭐ Nombre actualizado\n\n> Nombre corto: ${nuevoNombreCorto}\n> Nombre largo: ${nuevoNombreLargo}`
                : `⭐ Nombre actualizado a: ${nuevoNombreCorto}`;
            
            await replyWithContext(mensaje);
            
        } catch (error) {
            console.error('Error en setname:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};