import { applyItemPricing } from "./itemPricing.js"

function normalizeCartRow(row) {
    const pricedItem = applyItemPricing({
        id: row.item_id,
        title: row.title,
        description: row.description,
        price: row.item_price,
        discount: row.discount,
        imageUrl: row.imageUrl,
        category: row.category,
        isPopular: row.isPopular,
        createdAt: row.itemCreatedAt
    })

    return {
        cartId: row.cart_id,
        itemId: row.item_id,
        quantity: Number(row.quantity),
        price: Number(row.cart_price),
        totalPrice: Number(row.total_price),
        createdAt: row.created_at,
        item: pricedItem
    }
}

export function setupCart(app, db, authMiddleware) {
    async function getCartItems(userId) {
        const [rows] = await db.execute(`
            SELECT
                cart.cart_id,
                cart.item_id,
                cart.quantity,
                cart.price AS cart_price,
                cart.total_price,
                cart.created_at,
                items.title,
                items.description,
                items.price AS item_price,
                items.discount,
                items.imageUrl,
                items.category,
                items.isPopular,
                items.createdAt AS itemCreatedAt
            FROM cart
            JOIN items ON items.id = cart.item_id
            WHERE cart.user_id = ?
            ORDER BY cart.created_at DESC, cart.cart_id DESC
        `, [userId])

        const items = rows.map(normalizeCartRow)
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
        const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0)

        return {
            items,
            summary: {
                totalQuantity,
                totalPrice
            }
        }
    }

    async function listCartHandler(req, res) {
        try {
            const cart = await getCartItems(req.user.id)
            res.json({ status: "ok", ...cart })
        } catch (err) {
            console.log(err)
            res.status(500).json({ status: "error" })
        }
    }

    async function addCartItemHandler(req, res) {
        try {
            const itemId = Number(req.params.itemId)
            const requestedQuantity = Number(req.body?.quantity ?? 1)
            const quantity = Number.isInteger(requestedQuantity) && requestedQuantity > 0
                ? Math.min(requestedQuantity, 99)
                : 1

            if (!Number.isInteger(itemId) || itemId <= 0) {
                return res.status(400).json({ status: "error", message: "invalid id" })
            }

            const [itemRows] = await db.execute(`
                SELECT id, price, discount
                FROM items
                WHERE id = ?
                LIMIT 1
            `, [itemId])

            if (itemRows.length === 0) {
                return res.status(404).json({ status: "error", message: "item not found" })
            }

            const pricedItem = applyItemPricing(itemRows[0])
            const price = pricedItem.finalPrice

            const [existingRows] = await db.execute(
                "SELECT cart_id, quantity FROM cart WHERE user_id=? AND item_id=? LIMIT 1",
                [req.user.id, itemId]
            )

            if (existingRows.length > 0) {
                const nextQuantity = Math.min(Number(existingRows[0].quantity) + quantity, 99)

                await db.execute(
                    "UPDATE cart SET quantity=?, price=? WHERE cart_id=? AND user_id=?",
                    [nextQuantity, price, existingRows[0].cart_id, req.user.id]
                )
            } else {
                await db.execute(
                    "INSERT INTO cart (user_id, item_id, quantity, price) VALUES (?, ?, ?, ?)",
                    [req.user.id, itemId, quantity, price]
                )
            }

            const cart = await getCartItems(req.user.id)
            res.status(201).json({ status: "ok", ...cart })
        } catch (err) {
            console.log(err)
            res.status(500).json({ status: "error" })
        }
    }

    async function updateCartItemHandler(req, res) {
        try {
            const cartId = Number(req.params.cartId)
            const quantity = Number(req.body?.quantity)

            if (!Number.isInteger(cartId) || cartId <= 0) {
                return res.status(400).json({ status: "error", message: "invalid id" })
            }

            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
                return res.status(400).json({ status: "error", message: "invalid quantity" })
            }

            const [existingRows] = await db.execute(
                "SELECT cart_id FROM cart WHERE cart_id=? AND user_id=? LIMIT 1",
                [cartId, req.user.id]
            )

            if (existingRows.length === 0) {
                return res.status(404).json({ status: "error", message: "cart item not found" })
            }

            await db.execute(
                "UPDATE cart SET quantity=? WHERE cart_id=? AND user_id=?",
                [quantity, cartId, req.user.id]
            )

            const cart = await getCartItems(req.user.id)
            res.json({ status: "ok", ...cart })
        } catch (err) {
            console.log(err)
            res.status(500).json({ status: "error" })
        }
    }

    async function deleteCartItemHandler(req, res) {
        try {
            const cartId = Number(req.params.cartId)

            if (!Number.isInteger(cartId) || cartId <= 0) {
                return res.status(400).json({ status: "error", message: "invalid id" })
            }

            await db.execute(
                "DELETE FROM cart WHERE cart_id=? AND user_id=?",
                [cartId, req.user.id]
            )

            const cart = await getCartItems(req.user.id)
            res.json({ status: "ok", ...cart })
        } catch (err) {
            console.log(err)
            res.status(500).json({ status: "error" })
        }
    }

    async function clearCartHandler(req, res) {
        try {
            await db.execute("DELETE FROM cart WHERE user_id=?", [req.user.id])
            res.json({
                status: "ok",
                items: [],
                summary: {
                    totalQuantity: 0,
                    totalPrice: 0
                }
            })
        } catch (err) {
            console.log(err)
            res.status(500).json({ status: "error" })
        }
    }

    app.get("/api/users/me/cart", authMiddleware, listCartHandler)
    app.post("/api/users/me/cart/:itemId", authMiddleware, addCartItemHandler)
    app.put("/api/users/me/cart/:cartId", authMiddleware, updateCartItemHandler)
    app.delete("/api/users/me/cart/:cartId", authMiddleware, deleteCartItemHandler)
    app.delete("/api/users/me/cart", authMiddleware, clearCartHandler)
}
