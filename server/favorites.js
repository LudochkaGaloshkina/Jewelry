export function setupFavorites(app, db, authMiddleware) {
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

    app.get("/api/users/me/favorites", authMiddleware, listFavoritesHandler)
    app.post("/api/users/me/favorites/:itemId", authMiddleware, addFavoriteHandler)
    app.delete("/api/users/me/favorites/:itemId", authMiddleware, deleteFavoriteHandler)
}
