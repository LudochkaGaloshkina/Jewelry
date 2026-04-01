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
    try{
        const {name,email,password} = req.body

        if(!name || !email || !password){
            return res.json({status:"error",message:"missing fields"})
        }

        const [existing] = await db.execute(
            "SELECT id FROM users WHERE email=?",
            [email]
        )

        if(existing.length>0){
            return res.json({status:"error",message:"email exists"})
        }

        const hash = await bcrypt.hash(password,10)

        const [result] = await db.execute(
            `INSERT INTO users (name,email,password,role,createdAt)
             VALUES (?,?,?,'user',NOW())`,
            [name,email,hash]
        )

        const userId = result.insertId
        const token = createAuthToken(userId)

        const [users] = await db.execute(
            "SELECT id, name, email, role, createdAt FROM users WHERE id=? LIMIT 1",
            [userId]
        )

        setAuthCookie(res, token)
        res.json({
            status:"ok",
            token,
            user: users[0]
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
            user:{
                id:user.id,
                name:user.name,
                email:user.email,
                role:user.role,
                createdAt:user.createdAt
            }
        })
    }
    catch(err){
        console.log(err)
        res.status(500).json({status:"error"})
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

app.post("/register", registerHandler)
app.post("/api/auth/register", registerHandler)

app.post("/login", loginHandler)
app.post("/api/auth/login", loginHandler)

app.get("/api/auth/me", authMiddleware, (req, res) => {
    res.json({
        status: "ok",
        user: req.user
    })
})

app.post("/api/auth/logout", (req, res) => {
    clearAuthCookie(res)
    res.json({ status: "ok" })
})

app.get("/api/items", listItemsHandler)
app.get("/api/items/:id", getItemByIdHandler)
app.post("/api/items", authMiddleware, requireAdmin, createItemHandler)
app.put("/api/items/:id", authMiddleware, requireAdmin, updateItemHandler)
app.delete("/api/items/:id", authMiddleware, requireAdmin, deleteItemHandler)

app.get("/api/users/me/favorites", authMiddleware, listFavoritesHandler)
app.post("/api/users/me/favorites/:itemId", authMiddleware, addFavoriteHandler)
app.delete("/api/users/me/favorites/:itemId", authMiddleware, deleteFavoriteHandler)



app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"))
});

app.listen(3000, ()=>{
    console.log("http://localhost:3000")
})
