import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ECONO_FILE = path.join(__dirname, '../database/economy.json')

const load = () => fs.existsSync(ECONO_FILE)? JSON.parse(fs.readFileSync(ECONO_FILE)) : {}
const save = (d) => {
    fs.mkdirSync(path.dirname(ECONO_FILE), { recursive: true })
    fs.writeFileSync(ECONO_FILE, JSON.stringify(d, null, 2))
}
const createUser = (u) => ({ coins: 100, bank: 0, lastDaily: 0, lastWeekly: 0, lastCofre: 0 })

export default {
    name: 'weekly',
    alias: ['semanal'],
    description: 'Reclama 3000 Coins cada 7 días',
    category: 'economy',

    async execute(sock, msg, { replyWithContext, senderNumber, senderJid }) {
        const db = load()
        db.users ||= {}
        db.users[senderNumber] ||= createUser(senderNumber)
        const user = db.users[senderNumber]

        const CD = 7 * 24 * 60 * 60 * 1000
        const left = (user.lastWeekly + CD) - Date.now()

        if (left > 0) {
            const d = Math.floor(left / 86400000)
            const h = Math.floor((left % 86400000) / 3600000)
            return replyWithContext(`⏳ Ya reclamaste esta semana.\nVuelve en: *${d}d ${h}h*`, [senderJid])
        }

        user.coins += 3000
        user.lastWeekly = Date.now()
        save(db)
        replyWithContext(`🎁 *SEMANAL RECLAMADO*\n\n+3000 Coins 🪙\nTotal: ${user.coins} 🪙`, [senderJid])
    }
}