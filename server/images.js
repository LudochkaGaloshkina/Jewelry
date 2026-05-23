function normalizeImageMeta(row) {
    return {
        id: row.id,
        imageKey: row.image_key,
        name: row.name,
        fileName: row.file_name,
        mimeType: row.mime_type,
        type: row.type,
        oldPath: row.old_path,
        sortOrder: row.sort_order,
        isActive: Boolean(row.is_active),
        imageUrl: `/api/images/${row.id}/file`
    }
}

export function setupImages(app, db) {
    app.get("/api/images", async (req, res) => {
        try {
            const type = typeof req.query.type === "string" ? req.query.type.trim() : ""
            const params = []
            const conditions = ["is_active = TRUE"]

            if (type) {
                conditions.push("type = ?")
                params.push(type)
            }

            const [rows] = await db.execute(
                `
                SELECT id, image_key, name, file_name, mime_type, type, old_path, sort_order, is_active
                FROM images
                WHERE ${conditions.join(" AND ")}
                ORDER BY sort_order ASC, id ASC
                `,
                params
            )

            res.json({
                status: "ok",
                images: rows.map(normalizeImageMeta)
            })
        } catch (err) {
            console.error(err)
            res.status(500).json({ status: "error", message: "Не удалось загрузить изображения." })
        }
    })

    app.get("/api/images/key/:imageKey/file", async (req, res) => {
        try {
            const [rows] = await db.execute(
                `
                SELECT file_name, mime_type, image_data
                FROM images
                WHERE image_key = ? AND is_active = TRUE
                LIMIT 1
                `,
                [req.params.imageKey]
            )

            if (!rows.length) {
                return res.status(404).json({ status: "error", message: "Изображение не найдено." })
            }

            const image = rows[0]
            res.setHeader("Content-Type", image.mime_type)
            res.setHeader("Cache-Control", "public, max-age=3600")
            res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(image.file_name)}"`)
            res.send(image.image_data)
        } catch (err) {
            console.error(err)
            res.status(500).json({ status: "error", message: "Не удалось загрузить изображение." })
        }
    })

    app.get("/api/images/:id/file", async (req, res) => {
        const imageId = Number(req.params.id)

        if (!Number.isInteger(imageId) || imageId <= 0) {
            return res.status(400).json({ status: "error", message: "Некорректный id изображения." })
        }

        try {
            const [rows] = await db.execute(
                `
                SELECT file_name, mime_type, image_data
                FROM images
                WHERE id = ? AND is_active = TRUE
                LIMIT 1
                `,
                [imageId]
            )

            if (!rows.length) {
                return res.status(404).json({ status: "error", message: "Изображение не найдено." })
            }

            const image = rows[0]
            res.setHeader("Content-Type", image.mime_type)
            res.setHeader("Cache-Control", "public, max-age=3600")
            res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(image.file_name)}"`)
            res.send(image.image_data)
        } catch (err) {
            console.error(err)
            res.status(500).json({ status: "error", message: "Не удалось загрузить изображение." })
        }
    })
}
