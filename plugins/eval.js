import syntaxerror from 'syntax-error';
import { format } from 'util';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(__dirname);

// Función para detectar lectura de archivos
function isReadFileAttempt(code) {
    // Detecta require('fs').readFileSync o fs.readFileSync
    const patterns = [
        /require\(['"]fs['"]\)\.readFileSync/,
        /fs\.readFileSync/,
        /readFileSync\(/
    ];
    
    for (const pattern of patterns) {
        if (pattern.test(code)) {
            return true;
        }
    }
    return false;
}

export default {
    name: '>',
    alias: [],
    description: '',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, startTime, isOwner, pushName, userNumber, isGroup, replyWithContext, body } = options;
            const from = msg.key.remoteJid;
            
            if (!body || !body.startsWith('>')) {
                return;
            }
            
            if (!isOwner) {
                return;
            }
            
            let code = body.substring(1).trim();
            
            if (!code) {
                return;
            }
            
            // Bloquear solo intentos de leer archivos
            if (isReadFileAttempt(code)) {
                await replyWithContext(`Ok mañana 💜`);
                console.log(`🛡️ Eval bloqueado (lectura de archivos) por ${pushName || userNumber}`);
                return;
            }
            
            if (!code.includes('return') && !code.includes(';') && !code.includes('\n')) {
                code = 'return ' + code;
            }
            
            let result;
            let syntax = '';
            
            try {
                const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                
                const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
                const qsender = quotedMsg?.participant || userNumber;
                
                const m = {
                    chat: from,
                    sender: userNumber,
                    from: from,
                    msg: msg,
                    pushName: pushName,
                    isGroup: isGroup
                };
                
                const forMe = msg.key?.fromMe || false;
                const jid = from;
                
                let usersDB = {};
                try {
                    const { usersDb } = await import('../handler.js');
                    usersDB = usersDb;
                } catch (e) {}
                
                const fn = new AsyncFunction(
                    'sock', 'msg', 'args', 'config', 'usersDB', 'sender', 'pushName', 'from', 'qsender', 'require', 'format', 'syntaxerror', 'm', 'forMe', 'jid', 'replyWithContext',
                    `try {
                        ${code}
                    } catch(e) {
                        throw e;
                    }`
                );
                
                result = await fn(
                    sock, msg, args, config, usersDB, userNumber, pushName, from, qsender, require, format, syntaxerror, m, forMe, jid, replyWithContext
                );
                
            } catch (err) {
                const syn = syntaxerror(code, 'Eval', {
                    allowReturnOutsideFunction: true,
                    allowAwaitOutsideFunction: true
                });
                
                if (syn) {
                    syntax = '```' + syn + '```\n\n';
                }
                
                result = err;
            }
            
            let output = '';
            if (result !== undefined && result !== null) {
                if (typeof result === 'object' || typeof result === 'function') {
                    try {
                        output = format(result, { depth: 2 });
                    } catch (e) {
                        output = String(result);
                    }
                } else {
                    output = String(result);
                }
            } else {
                output = 'Ejecutado sin retorno';
            }
            
            if (output.length > 4000) {
                output = output.substring(0, 4000) + '\n\n... (resultado truncado)';
            }
            
            await replyWithContext(syntax + '```\n' + output + '\n```');
            
            console.log(`✅ Eval ejecutado por OWNER: ${pushName || userNumber}`);
            console.log(`📝 Código: ${code.substring(0, 100)}${code.length > 100 ? '...' : ''}`);
            
        } catch (error) {
            console.error('❌ Error en eval:', error);
        }
    }
};