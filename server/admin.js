export function setupAdmin(app, db, authMiddleware) {
    function requireAdmin(req, res, next) {
        if (req.user.role !== "admin") {
            return res.status(403).json({ status: "error", message: "admin only" })
        }

        next()
    }

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

    async function listUsersHandler(req, res) {
        try {
            const [rows] = await db.execute(`
                SELECT id, name, email, role, createdAt, secretWordHash
                FROM users
                ORDER BY createdAt DESC
            `)

            res.json({
                status: "ok",
                users: rows.map(getSafeUser)
            })
        } catch (err) {
            console.log(err)
            res.status(500).json({ status: "error" })
        }
    }

    async function updateUserHandler(req, res) {
        try {
            const userId = Number(req.params.id)
            const { role } = req.body

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(400).json({ status: "error", message: "invalid id" })
            }

            if (!["user", "admin"].includes(role)) {
                return res.status(400).json({ status: "error", message: "invalid role" })
            }

            if (userId === req.user.id && role !== "admin") {
                return res.status(400).json({
                    status: "error",
                    message: "Нельзя снять роль администратора с текущего аккаунта."
                })
            }

            const [existingRows] = await db.execute(
                "SELECT id FROM users WHERE id=? LIMIT 1",
                [userId]
            )

            if (existingRows.length === 0) {
                return res.status(404).json({ status: "error", message: "user not found" })
            }

            await db.execute(
                "UPDATE users SET role=? WHERE id=?",
                [role, userId]
            )

            const [rows] = await db.execute(
                "SELECT id, name, email, role, createdAt, secretWordHash FROM users WHERE id=? LIMIT 1",
                [userId]
            )

            res.json({
                status: "ok",
                user: getSafeUser(rows[0])
            })
        } catch (err) {
            console.log(err)
            res.status(500).json({ status: "error" })
        }
    }

    async function deleteUserHandler(req, res) {
        try {
            const userId = Number(req.params.id)

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(400).json({ status: "error", message: "invalid id" })
            }

            if (userId === req.user.id) {
                return res.status(400).json({
                    status: "error",
                    message: "Нельзя удалить текущий аккаунт администратора."
                })
            }

            const [existingRows] = await db.execute(
                "SELECT id FROM users WHERE id=? LIMIT 1",
                [userId]
            )

            if (existingRows.length === 0) {
                return res.status(404).json({ status: "error", message: "user not found" })
            }

            await db.execute("DELETE FROM favorites WHERE userId=?", [userId])
            await db.execute("DELETE FROM users WHERE id=?", [userId])

            res.json({ status: "ok" })
        } catch (err) {
            console.log(err)
            res.status(500).json({ status: "error" })
        }
    }

    app.get("/api/admin/users", authMiddleware, requireAdmin, listUsersHandler)
    app.put("/api/admin/users/:id", authMiddleware, requireAdmin, updateUserHandler)
    app.delete("/api/admin/users/:id", authMiddleware, requireAdmin, deleteUserHandler)
}
