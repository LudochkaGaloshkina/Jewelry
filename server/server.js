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

<<<<<<< Updated upstream
=======
/* ---------- REGISTER ---------- */

app.post("/register", async (req,res)=>{
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

        await db.execute(
            `INSERT INTO users (name,email,password,role,createdAt)
             VALUES (?,?,?,'user',NOW())`,
            [name,email,hash]
        )

        res.json({status:"ok"})
    }
    catch(err){
        console.log(err)
        res.status(500).json({status:"error"})
    }
})
>>>>>>> Stashed changes

app.listen(3000, ()=>{
    console.log("http://localhost:3000")
})
