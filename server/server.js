import express from "express"
import mysql from "mysql2/promise"
import bcrypt from "bcrypt"
import cors from "cors"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"

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

function getSafeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        hasSecretWord: Boolean(user.secretWordHash)
    }
}

function normalizeSecretWord(value) {
    return String(value || "").trim().toLowerCase()
}

function getPasswordValidationError(value) {
    if (typeof value !== "string") {
        return "Пароль должен быть строкой."
    }

    if (value.length < 8) {
        return "Пароль должен быть не короче 8 символов."
    }

    if (!/[a-z]/.test(value)) {
        return "Пароль должен содержать хотя бы одну строчную латинскую букву."
    }

    if (!/[A-Z]/.test(value)) {
        return "Пароль должен содержать хотя бы одну заглавную латинскую букву."
    }

    if (!/\d/.test(value)) {
        return "Пароль должен содержать хотя бы одну цифру."
    }

    return null
}

function validatePassword(value) {
    return getPasswordValidationError(value) === null
}

function validateSecretWord(value) {
    return typeof value === "string" && normalizeSecretWord(value).length >= 3
}


function createAuthToken(userId) {
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    const payload = `${userId}.${expiresAt}`
    const signature = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(payload)
        .digest("hex")

    return `${payload}.${signature}`
}

function setAuthCookie(res, token) {
    res.cookie("authToken", token, {
        maxAge: TOKEN_TTL_SECONDS * 1000,
        sameSite: "lax",
        path: "/"
    })
}

function clearAuthCookie(res) {
    res.clearCookie("authToken", {
        sameSite: "lax",
        path: "/"
    })
}

function getCookieValue(req, name) {
    const cookieHeader = req.headers.cookie
    if (!cookieHeader) return null

    const cookies = cookieHeader.split(";")

    for (const cookie of cookies) {
        const [rawName, ...rawValueParts] = cookie.trim().split("=")

        if (rawName !== name) continue

        return decodeURIComponent(rawValueParts.join("="))
    }

    return null
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

function getAuthToken(req) {
    return getBearerToken(req) || getCookieValue(req, "authToken") || req.query.token || null
}

async function authMiddleware(req, res, next) {
    try {
        const token = getAuthToken(req)
        const tokenData = verifyAuthToken(token)

        if (!tokenData) {
            return res.status(401).json({ status: "error", message: "unauthorized" })
        }

        const [rows] = await db.execute(
            "SELECT id, name, email, role, createdAt, secretWordHash FROM users WHERE id=? LIMIT 1",
            [tokenData.userId]
        )

        if (rows.length === 0) {
            return res.status(401).json({ status: "error", message: "unauthorized" })
        }

        req.user = getSafeUser(rows[0])
        next()
    } catch (err) {
        console.log(err)
        return res.status(500).json({ status: "error" })
    }
}

async function registerHandler(req, res) {
    try{
        const {name,email,password,confirmPassword,secretWord} = req.body

        if(!name || !email || !password){
            return res.json({status:"error",message:"missing fields"})
        }

        if (!confirmPassword) {
            return res.json({ status: "error", message: "Подтвердите пароль." })
        }

        if (password !== confirmPassword) {
            return res.json({ status: "error", message: "Пароли не совпадают." })
        }

        const passwordValidationError = getPasswordValidationError(password)

        if (passwordValidationError) {
            return res.json({ status: "error", message: passwordValidationError })
        }

        if (secretWord && !validateSecretWord(secretWord)) {
            return res.json({ status: "error", message: "Секретное слово должно содержать минимум 3 символа." })
        }

        const [existing] = await db.execute(
            "SELECT id FROM users WHERE email=?",
            [email]
        )

        if(existing.length>0){
            return res.json({status:"error",message:"email exists"})
        }

        const hash = await bcrypt.hash(password,10)
        const secretWordHash = secretWord
            ? await bcrypt.hash(normalizeSecretWord(secretWord), 10)
            : null

        const [result] = await db.execute(
            `INSERT INTO users (name,email,password,secretWordHash,role,createdAt)
             VALUES (?,?,?,?, 'user',NOW())`,
            [name,email,hash,secretWordHash]
        )

        const userId = result.insertId
        const token = createAuthToken(userId)

        const [users] = await db.execute(
            "SELECT id, name, email, role, createdAt, secretWordHash FROM users WHERE id=? LIMIT 1",
            [userId]
        )

        setAuthCookie(res, token)
        res.json({
            status:"ok",
            token,
            user: getSafeUser(users[0])
        })
    }
    catch(err){
        console.log(err)
        res.status(500).json({status:"error"})
    }
}

/* ---------- LOGIN ---------- */

async function loginHandler(req, res) {
    try{
        const {email,password} = req.body

        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email=?",
            [email]
        )

        if(rows.length===0){
            return res.json({status:"error",message:"wrong email"})
        }

        const user = rows[0]
        const match = await bcrypt.compare(password,user.password)

        if(!match){
            return res.json({status:"error",message:"wrong password"})
        }

        const token = createAuthToken(user.id)

        setAuthCookie(res, token)
        res.json({
            status:"ok",
            token,
            user: getSafeUser(user)
        })
    }
    catch(err){
        console.log(err)
        res.status(500).json({status:"error"})
    }
}

async function updateSecretWordHandler(req, res) {
    try {
        const { secretWord } = req.body

        if (!validateSecretWord(secretWord)) {
            return res.status(400).json({
                status: "error",
                message: "Секретное слово должно содержать минимум 3 символа."
            })
        }

        const secretWordHash = await bcrypt.hash(normalizeSecretWord(secretWord), 10)

        await db.execute(
            "UPDATE users SET secretWordHash=? WHERE id=?",
            [secretWordHash, req.user.id]
        )

        const [rows] = await db.execute(
            "SELECT id, name, email, role, createdAt, secretWordHash FROM users WHERE id=? LIMIT 1",
            [req.user.id]
        )

        return res.json({
            status: "ok",
            message: "Секретное слово сохранено.",
            user: getSafeUser(rows[0])
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ status: "error" })
    }
}

//Восстановление пароля по секретному слову

async function resetPasswordHandler(req, res) {
    try {
        const { email, secretWord, newPassword } = req.body

        if (!email || !secretWord || !newPassword) {
            return res.status(400).json({ status: "error", message: "missing fields" })
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                status: "error",
                message: getPasswordValidationError(newPassword)
            })
        }

        const [rows] = await db.execute(
            "SELECT id, secretWordHash FROM users WHERE email=? LIMIT 1",
            [email]
        )

        if (rows.length === 0) {
            return res.json({ status: "error", message: "Пользователь с таким email не найден." })
        }

        const user = rows[0]

        if (!user.secretWordHash) {
            return res.json({
                status: "error",
                message: "Для этого аккаунта не задано секретное слово. Обратитесь в личный кабинет после входа."
            })
        }

        const isSecretWordMatch = await bcrypt.compare(
            normalizeSecretWord(secretWord),
            user.secretWordHash
        )

        if (!isSecretWordMatch) {
            return res.json({ status: "error", message: "Секретное слово не совпадает." })
        }

        const passwordHash = await bcrypt.hash(newPassword, 10)

        await db.execute(
            "UPDATE users SET password=? WHERE id=?",
            [passwordHash, user.id]
        )

        return res.json({
            status: "ok",
            message: "Пароль обновлён. Теперь можно войти с новым паролем."
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ status: "error" })
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({ status: "error", message: "admin only" })
    }

    next()
}

async function listItemsHandler(req, res) {
    try {
        const conditions = []
        const values = []
        let orderBy = "items.createdAt DESC"

        if (req.query.category) {
            conditions.push("items.category = ?")
            values.push(req.query.category)
        }

        if (req.query.popular === "true") {
            conditions.push("items.isPopular = TRUE")
        }

        if (req.query.related) {
            const relatedId = Number(req.query.related)

            if (!Number.isInteger(relatedId) || relatedId <= 0) {
                return res.status(400).json({ status: "error", message: "invalid related id" })
            }

            const [relatedRows] = await db.execute(
                "SELECT category FROM items WHERE id=? LIMIT 1",
                [relatedId]
            )

            if (relatedRows.length === 0) {
                return res.status(404).json({ status: "error", message: "item not found" })
            }

            conditions.push("items.category = ?")
            values.push(relatedRows[0].category)
            conditions.push("items.id <> ?")
            values.push(relatedId)
        }

        if (req.query.sort === "price_asc") {
            orderBy = "items.price ASC"
        } else if (req.query.sort === "price_desc") {
            orderBy = "items.price DESC"
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : ""

        const [rows] = await db.execute(`
            SELECT
                items.id,
                items.title,
                items.description,
                items.price,
                items.imageUrl,
                items.category,
                items.isPopular,
                items.createdAt
            FROM items
            ${whereClause}
            ORDER BY ${orderBy}
        `, values)

        res.json({
            status: "ok",
            items: rows
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

async function getItemByIdHandler(req, res) {
    try {
        const itemId = Number(req.params.id)

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return res.status(400).json({ status: "error", message: "invalid id" })
        }

        const [rows] = await db.execute(`
            SELECT
                items.id,
                items.title,
                items.description,
                items.price,
                items.imageUrl,
                items.category,
                items.isPopular,
                items.createdAt
            FROM items
            WHERE items.id = ?
            LIMIT 1
        `, [itemId])

        if (rows.length === 0) {
            return res.status(404).json({ status: "error", message: "item not found" })
        }

        res.json({
            status: "ok",
            item: rows[0]
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

async function createItemHandler(req, res) {
    try {
        const { title, description, price, imageUrl, category, isPopular } = req.body
        const normalizedPrice = Number(price)

        if (!title || !description || !category || Number.isNaN(normalizedPrice)) {
            return res.status(400).json({ status: "error", message: "missing fields" })
        }

        const [result] = await db.execute(`
            INSERT INTO items (title, description, price, imageUrl, category, isPopular)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            title,
            description,
            normalizedPrice,
            imageUrl || null,
            category,
            Boolean(isPopular)
        ])

        const [rows] = await db.execute(`
            SELECT
                items.id,
                items.title,
                items.description,
                items.price,
                items.imageUrl,
                items.category,
                items.isPopular,
                items.createdAt
            FROM items
            WHERE items.id = ?
            LIMIT 1
        `, [result.insertId])

        res.status(201).json({
            status: "ok",
            item: rows[0]
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

async function updateItemHandler(req, res) {
    try {
        const itemId = Number(req.params.id)
        const { title, description, price, imageUrl, category, isPopular } = req.body
        const normalizedPrice = Number(price)

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return res.status(400).json({ status: "error", message: "invalid id" })
        }

        if (!title || !description || !category || Number.isNaN(normalizedPrice)) {
            return res.status(400).json({ status: "error", message: "missing fields" })
        }

        const [existingRows] = await db.execute(
            "SELECT id FROM items WHERE id=? LIMIT 1",
            [itemId]
        )

        if (existingRows.length === 0) {
            return res.status(404).json({ status: "error", message: "item not found" })
        }

        await db.execute(`
            UPDATE items
            SET title=?, description=?, price=?, imageUrl=?, category=?, isPopular=?
            WHERE id=?
        `, [
            title,
            description,
            normalizedPrice,
            imageUrl || null,
            category,
            Boolean(isPopular),
            itemId
        ])

        const [rows] = await db.execute(`
            SELECT
                items.id,
                items.title,
                items.description,
                items.price,
                items.imageUrl,
                items.category,
                items.isPopular,
                items.createdAt
            FROM items
            WHERE items.id = ?
            LIMIT 1
        `, [itemId])

        res.json({
            status: "ok",
            item: rows[0]
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

async function deleteItemHandler(req, res) {
    try {
        const itemId = Number(req.params.id)

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return res.status(400).json({ status: "error", message: "invalid id" })
        }

        const [existingRows] = await db.execute(
            "SELECT id FROM items WHERE id=? LIMIT 1",
            [itemId]
        )

        if (existingRows.length === 0) {
            return res.status(404).json({ status: "error", message: "item not found" })
        }

        await db.execute("DELETE FROM items WHERE id=?", [itemId])

        res.json({ status: "ok" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

async function listFavoritesHandler(req, res) {
    try {
        const [rows] = await db.execute(`
            SELECT
                items.id,
                items.title,
                items.description,
                items.price,
                items.imageUrl,
                items.category,
                items.isPopular,
                items.createdAt
            FROM favorites
            JOIN items ON items.id = favorites.itemId
            WHERE favorites.userId = ?
            ORDER BY favorites.createdAt DESC
        `, [req.user.id])

        res.json({
            status: "ok",
            items: rows
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

async function addFavoriteHandler(req, res) {
    try {
        const itemId = Number(req.params.itemId)

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return res.status(400).json({ status: "error", message: "invalid id" })
        }

        const [itemRows] = await db.execute(
            "SELECT id FROM items WHERE id=? LIMIT 1",
            [itemId]
        )

        if (itemRows.length === 0) {
            return res.status(404).json({ status: "error", message: "item not found" })
        }

        await db.execute(`
            INSERT INTO favorites (userId, itemId)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE itemId = VALUES(itemId)
        `, [req.user.id, itemId])

        res.status(201).json({ status: "ok" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}

async function deleteFavoriteHandler(req, res) {
    try {
        const itemId = Number(req.params.itemId)

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return res.status(400).json({ status: "error", message: "invalid id" })
        }

        await db.execute(
            "DELETE FROM favorites WHERE userId=? AND itemId=?",
            [req.user.id, itemId]
        )

        res.json({ status: "ok" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ status: "error" })
    }
}


//эндпоинты регистрации
app.post("/register", registerHandler)
app.post("/api/auth/register", registerHandler)

//эндпоинты логина
app.post("/login", loginHandler)
app.post("/api/auth/login", loginHandler)


//эндпоинт получения данных текущего пользователя
app.get("/api/auth/me", authMiddleware, (req, res) => {
    res.json({
        status: "ok",
        user: req.user
    })
})

app.put("/api/auth/me/secret-word", authMiddleware, updateSecretWordHandler)
app.post("/api/auth/reset-password", resetPasswordHandler)

app.post("/api/auth/logout", (req, res) => {
    clearAuthCookie(res)
    res.json({ status: "ok" })
})

//CRUD эндпоинт для работы с товарами
app.get("/api/items", listItemsHandler)
app.get("/api/items/:id", getItemByIdHandler)
app.post("/api/items", authMiddleware, requireAdmin, createItemHandler)
app.put("/api/items/:id", authMiddleware, requireAdmin, updateItemHandler)
app.delete("/api/items/:id", authMiddleware, requireAdmin, deleteItemHandler)

//CRUD эндпоинты для работы с избранным
app.get("/api/users/me/favorites", authMiddleware, listFavoritesHandler)
app.post("/api/users/me/favorites/:itemId", authMiddleware, addFavoriteHandler)
app.delete("/api/users/me/favorites/:itemId", authMiddleware, deleteFavoriteHandler)



app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"))
});



app.listen(3000, ()=>{
    console.log("http://localhost:3000")
})
