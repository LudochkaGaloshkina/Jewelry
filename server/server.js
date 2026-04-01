import express from "express"
import mysql from "mysql2/promise"
import cors from "cors"
import bcrypt from "bcrypt"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"

console.log("Server running")

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const TOKEN_SECRET = process.env.TOKEN_SECRET || "dev-token-secret-change-me"
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

app.use(cors())
app.use(express.json())

// раздача ВСЕГО проекта
app.use(express.static(path.join(__dirname, "../frontend")))
app.use("/node_modules", express.static(path.join(__dirname, "../node_modules")))

/* ---------- MYSQL ---------- */

const db = await mysql.createPool({
    host: "localhost",
    user: "root",
    password: "1111",
    database: "diamond",
    connectionLimit: 10
})

function createAuthToken(userId) {
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    const payload = `${userId}.${expiresAt}`
    const signature = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(payload)
        .digest("hex")

    return `${payload}.${signature}`
}

function verifyAuthToken(token) {
    if (!token) return null

    const parts = token.split(".")
    if (parts.length !== 3) return null

    const [idPart, expiresAtPart, signature] = parts
    const payload = `${idPart}.${expiresAtPart}`

    const expectedSignature = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(payload)
        .digest("hex")

    if (signature !== expectedSignature) return null

    const userId = Number(idPart)
    const expiresAt = Number(expiresAtPart)

    if (!Number.isInteger(userId) || !Number.isInteger(expiresAt)) return null
    if (expiresAt < Math.floor(Date.now() / 1000)) return null

    return { userId }
}

function getBearerToken(req) {
    const authHeader = req.headers.authorization
    if (!authHeader) return null

    const [scheme, token] = authHeader.split(" ")
    if (scheme !== "Bearer" || !token) return null

    return token
}

async function authMiddleware(req, res, next) {
    try {
        const token = getBearerToken(req)
        const tokenData = verifyAuthToken(token)

        if (!tokenData) {
            return res.status(401).json({ status: "error", message: "unauthorized" })
        }

        const [rows] = await db.execute(
            "SELECT id, name, email, role, createdAt FROM users WHERE id=? LIMIT 1",
            [tokenData.userId]
        )

        if (rows.length === 0) {
            return res.status(401).json({ status: "error", message: "unauthorized" })
        }

        req.user = rows[0]
        next()
    } catch (err) {
        console.log(err)
        return res.status(500).json({ status: "error" })
    }
}

async function registerHandler(req, res) {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.json({ status: "error", message: "missing fields" })
        }

        const [existing] = await db.execute(
            "SELECT id FROM users WHERE email=?",
            [email]
        )

        if (existing.length > 0) {
            return res.json({ status: "error", message: "email exists" })
        }

        const hash = await bcrypt.hash(password, 10)

        const [result] = await db.execute(
            `INSERT INTO users (name,email,password,role,createdAt)
             VALUES (?,?,?,'user',NOW())`,
            [name, email, hash]
        )

        const userId = result.insertId
        const token = createAuthToken(userId)

        const [users] = await db.execute(
            "SELECT id, name, email, role, createdAt FROM users WHERE id=? LIMIT 1",
            [userId]
        )

        res.json({
            status: "ok",
            token,
            user: users[0]
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

async function loginHandler(req, res) {
    try {
        const { email, password } = req.body

        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email=?",
            [email]
        )

        if (rows.length === 0) {
            return res.json({ status: "error", message: "wrong email" })
        }

        const user = rows[0]
        const match = await bcrypt.compare(password, user.password)

        if (!match) {
            return res.json({ status: "error", message: "wrong password" })
        }

        const token = createAuthToken(user.id)

        res.json({
            status: "ok",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

/* ---------- REGISTER ---------- */

app.post("/register", registerHandler)
app.post("/api/auth/register", registerHandler)

/* ---------- LOGIN ---------- */

app.post("/login", loginHandler)
app.post("/api/auth/login", loginHandler)

/* ---------- CURRENT USER ---------- */

app.get("/api/auth/me", authMiddleware, (req, res) => {
    res.json({
        status: "ok",
        user: req.user
    })
})

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"))
})

app.listen(3000, () => {
    console.log("http://localhost:3000")
})
