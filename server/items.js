export function setupItems(app, db, authMiddleware) {
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

            if (req.query.q) {
                conditions.push("(items.title LIKE ? OR items.description LIKE ?)")
                values.push(`%${req.query.q}%`, `%${req.query.q}%`)
            }

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
            } else if (req.query.sort === "popular") {
                orderBy = "items.isPopular DESC, items.createdAt DESC"
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

    app.get("/api/items", listItemsHandler)
    app.get("/api/items/:id", getItemByIdHandler)
    app.post("/api/items", authMiddleware, requireAdmin, createItemHandler)
    app.put("/api/items/:id", authMiddleware, requireAdmin, updateItemHandler)
    app.delete("/api/items/:id", authMiddleware, requireAdmin, deleteItemHandler)
}
