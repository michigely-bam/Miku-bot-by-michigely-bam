import { getPairingCode, getSub, getConnectionStatus } from '../lib/sub.js'
import chalk from 'chalk'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOLDOWN_FILE = path.join(__dirname, '..', 'databases', 'code_cooldown.json');

if (!fs.existsSync(path.join(__dirname, '..', 'databases'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'databases'), { recursive: true });
}

function loadCooldown() {
    try {
        if (fs.existsSync(COOLDOWN_FILE)) {
            return JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveCooldown(data) {
    try {
        fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2));
    } catch (e) {}
}

function getTotalSubBotsCount() {
    try {
        const subsSessionsPath = path.join(process.cwd(), 'Sessions', 'Subs');
        if (!fs.existsSync(subsSessionsPath)) return 0;
        const folders = fs.readdirSync(subsSessionsPath).filter(folder => {
            const folderPath = path.join(subsSessionsPath, folder);
            return fs.statSync(folderPath).isDirectory() && /^\d+$/.test(folder);
        });
        return folders.length;
    } catch (error) {
        return 0;
    }
}

export default {
    name: 'code',
    alias: ['serbot', 'jadibot'],
    description: 'Genera un código de emparejamiento para vincular un Sub-Bot',
    category: 'Owner',
    
    async execute(sock, msg, options) {
        const { args = [], config = {}, pushName = 'Usuario', userNumber = '', replyWithContext } = options
        
        let targetNumber = userNumber
        
        if (args && args.length > 0) {
            const inputNumber = args[0].replace(/\D/g, '')
            if (inputNumber && inputNumber.length > 0) {
                targetNumber = inputNumber
            }
        }
        
        if (!targetNumber || targetNumber === 'Desconocido') {
            return await replyWithContext('❌ No se pudo obtener tu número.')
        }
        
        // Cooldown
        const cooldowns = loadCooldown();
        const lastUsed = cooldowns[targetNumber];
        const now = Date.now();
        const cooldownTime = 2 * 60 * 1000;
        
        if (lastUsed && (now - lastUsed) < cooldownTime) {
            const tiempoRestante = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
            const minutos = Math.floor(tiempoRestante / 60);
            const segundos = tiempoRestante % 60;
            let tiempoTexto = minutos > 0 ? `${minutos} minuto(s) y ${segundos} segundo(s)` : `${segundos} segundo(s)`;
            return await replyWithContext(`🌌 Debes esperar \`${tiempoTexto}\` para volver a intentar`);
        }
        
        // Límite de sub-bots
        const totalSubBots = getTotalSubBotsCount();
        const MAX_SUB_BOTS = 20;
        
        if (totalSubBots >= MAX_SUB_BOTS) {
            return await replyWithContext(`🌌 Límite de sub-bots alcanzados`);
        }
        
        cooldowns[targetNumber] = now;
        saveCooldown(cooldowns);
        
        await replyWithContext(`🌌 \`GALAXIT SUB\`\n> Conecta un Sub-Bot\n\n WhatsApp > Dispositivos vinculados > Vincular > Vincular con número > Pega el código\n\n> El código expira en 60 segundos`);
        
        console.log(chalk.cyan(`[ SUB-BOT ] Usuario ${pushName} (${targetNumber}) generando código...`));
        
        try {
            const result = await getPairingCode(targetNumber)
            
            if (result.status === 'pending') {
                await replyWithContext(`${result.code}`)
                
                console.log(chalk.green(`[ SUB-BOT ] Código generado para ${targetNumber}: ${result.code}`))
                
                let checkInterval
                const timeout = setTimeout(() => {
                    if (checkInterval) clearInterval(checkInterval)
                }, 60000)
                
                checkInterval = setInterval(async () => {
                    const sub = getSub(targetNumber)
                    if (sub && sub.sock && sub.sock.user) {
                        clearTimeout(timeout)
                        clearInterval(checkInterval)
                        await replyWithContext(`🌌 @${userNumber} Ha conectado un nuevo Sub-Bot`, [`${userNumber}@s.whatsapp.net`])
                        console.log(chalk.green(`[ SUB-BOT ] ${targetNumber} conectado por ${pushName}`))
                    }
                }, 2000)
                
            } else if (result.status === 'connected') {
                await replyWithContext(`🌌 @${userNumber} Ya tiene un Sub-Bot conectado`, [`${userNumber}@s.whatsapp.net`])
            } else if (result.status === 'expired') {
                await replyWithContext(`⌛ El código expiró. Usa *${config.prefix}code* nuevamente.`)
            }
            
        } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`))
            await replyWithContext(`💤 Error: ${err.message}`)
        }
    }
}