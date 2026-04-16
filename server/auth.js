import bcrypt from "bcrypt"
import crypto from "crypto"

export function setupAuth(app, db, config = {}) {
    const tokenSecret = config.tokenSecret || "dev-token-secret-change-me"
    const tokenTtlSeconds = config.tokenTtlSeconds || 60 * 60 * 24 * 7

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
        const expiresAt = Math.floor(Date.now() / 1000) + tokenTtlSeconds
        const payload = `${userId}.${expiresAt}`
        const signature = crypto
            .createHmac("sha256", tokenSecret)
            .update(payload)
            .digest("hex")

        return `${payload}.${signature}`
    }

    function setAuthCookie(res, token) {
        res.cookie("authToken", token, {
            maxAge: tokenTtlSeconds * 1000,
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
            .createHmac("sha256", tokenSecret)
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
    app.put("/api/auth/me/secret-word", authMiddleware, updateSecretWordHandler)
    app.post("/api/auth/reset-password", resetPasswordHandler)
    app.post("/api/auth/logout", (req, res) => {
        clearAuthCookie(res)
        res.json({ status: "ok" })
    })

    return {
        authMiddleware
    }
}
