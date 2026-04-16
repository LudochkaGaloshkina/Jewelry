import express from "express"
import mysql from "mysql2/promise"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { setupAuth } from "./auth.js"
import { setupItems } from "./items.js"
import { setupFavorites } from "./favorites.js"

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

const { authMiddleware } = setupAuth(app, db, {
    tokenSecret: TOKEN_SECRET,
    tokenTtlSeconds: TOKEN_TTL_SECONDS
})
setupItems(app, db, authMiddleware)
setupFavorites(app, db, authMiddleware)



app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"))
});



app.listen(3000, ()=>{
    console.log("http://localhost:3000")
})
