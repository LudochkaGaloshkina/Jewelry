import express from "express"
import mysql from "mysql2/promise"
import bcrypt from "bcrypt"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)



const app = express()

app.use(express.json())
app.use(express.static(path.join(__dirname, "../script")));
app.use(express.static(path.join(__dirname, "../Style")));
app.use(cors())

/* ---------- MYSQL CONNECTION ---------- */

const db = await mysql.createPool({

    host: "localhost",
    user: "root",
    password: "1111",
    database: "diamond",
    connectionLimit: 10

})


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
            return res.json({status:"error",message:"email already exists"})
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



/* ---------- LOGIN ---------- */

app.post("/login", async (req,res)=>{

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

        res.json({

            status:"ok",

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

})


/* ---------- START SERVER ---------- */

app.listen(3000,()=>{

    console.log("Server running on http://localhost:3000")

})