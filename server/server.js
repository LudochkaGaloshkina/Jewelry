import express from "express"
import mysql from "mysql2/promise"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"

    console.log("Server running");

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

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


app.listen(3000, ()=>{
    console.log("http://localhost:3000")
})
