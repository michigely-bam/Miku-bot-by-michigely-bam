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

function getSelfPath(sock) {
    let botNumber = '';
    if (sock.phoneNumber) {
        botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
    } else if (sock.user?.id) {
        botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
    }
    
    if (!botNumber) return null;
    
    // Verificar si es sub-bot
    const subBotDir = path.join(process.cwd(), 'subs', botNumber);
    if (fs.existsSync(subBotDir)) {
        return path.join(subBotDir, 'self.json');
    }
    
    // Si no, es bot principal
    const imgDir = path.join(process.cwd(), 'img');
    return path.join(imgDir, 'self.json');
}

function loadSelfStatus(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            return parsed.enabled === true;
        }
    } catch (e) {}
    return false;
}

function saveSelfStatus(filePath, enabled) {
    try {
        fs.writeFileSync(filePath, JSON.stringify({ enabled: enabled, updated: Date.now() }, null, 2));
        return true;
    } catch (e) {
        console.error('Error guardando estado self:', e);
        return false;
    }
}

export default {
    name: 'self',
    alias: ['privado'],
    description: 'Activa/Desactiva el modo self (solo el dueño puede usar el bot)',
    category: 'sub-bot',
    
    execute: async (sock, msg, options) => {
        try {
            const { args, config, senderNumber, userNumber, replyWithContext } = options;
            
            const userNumberClean = cleanNumber(senderNumber || userNumber || '');
            const botownerClean = config.botowner ? cleanNumber(config.botowner) : '';
            
            if (!botownerClean || userNumberClean !== botownerClean) {
                return await replyWithContext(`🌌 *Solo el dueño de este bot puede usar este comando*`);
            }
            
            const argsLower = args[0]?.toLowerCase();
            if (!argsLower || (argsLower !== 'on' && argsLower !== 'off')) {
                return await replyWithContext(`🌌 Uso incorrecto\n> Ejemplo: ${config.prefix}self on/off`);
            }
            
            const selfFilePath = getSelfPath(sock);
            if (!selfFilePath) {
                throw new Error('No se pudo encontrar la ruta del bot');
            }
            
            const newStatus = argsLower === 'on';
            saveSelfStatus(selfFilePath, newStatus);
            
            const statusText = newStatus ? '✅ ACTIVADO' : '❌ DESACTIVADO';
            const statusMsg = newStatus ? 'solo el dueño puede usar el bot' : 'todos pueden usar el bot';
            
            await replyWithContext(`🌌 *Modo Self ${statusText}*\n> Ahora ${statusMsg}`);
            
            console.log(`🔒 Self mode ${newStatus ? 'ON' : 'OFF'} para ${selfFilePath}`);
            
        } catch (error) {
            console.error('Error en self:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`🌌 Error: ${error.message}`);
            } catch (e) {}
        }
    }
};