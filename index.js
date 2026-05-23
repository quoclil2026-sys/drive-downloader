const express = require('express');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Port do Render cấp tự động qua biến môi trường
const PORT = process.env.PORT || 3000;

app.post('/api/download', async (req, res) => {
    const { driveUrl } = req.body;
    if (!driveUrl) return res.status(400).json({ error: 'Vui lòng điền link!' });

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        // Giả lập trình duyệt máy tính thật
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(driveUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Tự động cuộn lướt trang
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 600;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 300);
            });
        });

        const imageUrls = await page.evaluate(() => {
            const images = document.querySelectorAll('.ndfHFb-c43Zrf-i57A7c-img');
            return Array.from(images).map(img => img.src);
        });

        await browser.close();
        browser = null;

        if (imageUrls.length === 0) {
            return res.status(400).json({ error: 'Không tìm thấy ảnh. Hãy chắc chắn file ở chế độ công khai cho xem.' });
        }

        const pdfDoc = await PDFDocument.create();
        for (const url of imageUrls) {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data, 'binary');
            const image = await pdfDoc.embedJpg(imageBuffer);
            const p = pdfDoc.addPage([image.width, image.height]);
            p.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }

        const pdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="tailieu_bichan.pdf"');
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: 'Lỗi hệ thống: ' + err.message });
    }
});

app.listen(PORT, () => console.log(`Server đang chạy tại cổng ${PORT}`));
