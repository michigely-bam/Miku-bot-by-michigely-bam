export default {
    name: 'lvl',
    alias: ['level'],
    description: 'Información de nivel del usuario',
    category: 'main',
    
    async execute(sock, msg, { args, config, startTime, isOwner, pushName, userNumber, senderJid, isGroup, replyWithContext, usersDb }) {
        
        const from = msg.key.remoteJid;
        let targetNumber = userNumber;
        let targetPushName = pushName;
        
        // Verificar si se mencionó a alguien o se respondió a un mensaje
        let mentionedUser = null;
        
        // Caso 1: Respondiendo a un mensaje
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMsg) {
            const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;
            if (quotedParticipant) {
                mentionedUser = quotedParticipant;
            }
        }
        
        // Caso 2: Mención directa (@)
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            const mentions = msg.message.extendedTextMessage.contextInfo.mentionedJid;
            if (mentions && mentions.length > 0) {
                mentionedUser = mentions[0];
            }
        }
        
        // Si hay mención o respuesta, obtener datos del usuario mencionado
        if (mentionedUser) {
            // Limpiar el número (quitar :0 y @s.whatsapp.net)
            let cleanMentioned = mentionedUser.split(':')[0].split('@')[0].replace(/\D/g, '');
            
            // Buscar el usuario en la base de datos
            const userFound = usersDb.find(user => user.number === cleanMentioned);
            
            if (userFound) {
                targetNumber = userFound.number;
                targetPushName = userFound.pushName || 'Usuario';
            } else {
                // Usuario no registrado
                return await replyWithContext(`🌌 *Este usuario no está registrado aún*`, [mentionedUser]);
            }
        }
        
        // Buscar el usuario en la base de datos
        const userData = usersDb.find(user => user.number === targetNumber);
        
        if (!userData) {
            return await replyWithContext(`> 👤 Usuario » ${targetPushName}\n> ⚙️ Nivel » 1\n> 🌌 Exp » 0\n\n  — Total Comandos » 0\n\n⚠️ *Aún no estás registrado. Usa un comando para registrarte automáticamente.*`);
        }
        
        // Obtener datos del usuario
        const nivel = userData.nivel || 1;
        const exp = userData.exp || 0;
        const cmds = userData.cmds || 0;
        
        // Calcular EXP necesaria para siguiente nivel
        let expNeeded = 100;
        let currentLevel = 1;
        let currentExp = exp;
        
        while (currentLevel < nivel) {
            expNeeded = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
            currentExp -= expNeeded;
            currentLevel++;
        }
        
        const nextLevelExp = Math.floor(100 * Math.pow(1.5, nivel - 1));
        const expProgress = currentExp;
        const expPercentage = Math.floor((expProgress / nextLevelExp) * 100);
        
        // Crear barra de progreso
        const barLength = 20;
        const filledBars = Math.floor((expPercentage / 100) * barLength);
        const emptyBars = barLength - filledBars;
        const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
        
        // Si es el propio usuario o consulta a otro
        if (targetNumber === userNumber) {
            // Ver propio nivel
            await replyWithContext(
                `> 👤 Usuario » ${targetPushName}\n` +
                `> 🌌 Nivel » ${nivel}\n` +
                `> ✨ Exp » ${exp}\n\n` +
                `  📄 Total Comandos » ${cmds}\n` +
                `  🕯️ Progreso » ${progressBar} ${expPercentage}%\n` +
                `  ☁️ Exp para nivel ${nivel + 1} » ${nextLevelExp - expProgress}/${nextLevelExp}`
            );
        } else {
            // Ver nivel de otro usuario (sin mencionar directamente para evitar errores)
            const mentionJid = mentionedUser || (targetNumber + '@s.whatsapp.net');
            await replyWithContext(
                `> 👤 Usuario » ${targetPushName}\n` +
                `> 🌌 Nivel » ${nivel}\n` +
                `> ✨ — Exp » ${exp}\n\n` +
                `  ⚙️ Total Comandos » ${cmds}`,
                [mentionJid]
            );
        }
    }
};