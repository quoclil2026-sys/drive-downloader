const express = require('express');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

app.post('/api/download', async (req, res) => {
    const { driveUrl } = req.body;
    if (!driveUrl) return res.status(400).json({ error: 'Vui lòng điền link!' });

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(driveUrl, { waitUntil: 'networkidle2', timeout: 90000 });
        const pageTitle = await page.title();
        console.log("=== THÔNG TIN: Đã vào trang: " + pageTitle + " ===");

        // THUẬT TOÁN CUỘN THÔNG MINH
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                const scrollableElement = Array.from(document.querySelectorAll('div')).find(el => {
                    const style = window.getComputedStyle(el);
                    return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > window.innerHeight;
                }) || window;

                let totalHeight = 0;
                let distance = 500;
                let timer = setInterval(() => {
                    if (scrollableElement === window) {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
                    } else {
                        scrollableElement.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollableElement.scrollHeight) { clearInterval(timer); resolve(); }
                    }
                }, 400);
            });
        });

        // BỘ TRÍCH XUẤT ĐA NĂNG
        const pageImagesBase64 = await page.evaluate(() => {
            let dataUrls = [];
            const canvases = document.querySelectorAll('canvas');
            if (canvases.length > 0) {
                canvases.forEach(canvas => {
                    try {
                        const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
                        dataUrls.push(dataUrl);
                    } catch (e) {
                        // Bỏ qua lỗi bảo mật nếu có
                    }
                });
            }

            if (dataUrls.length === 0) {
                const imgs = document.querySelectorAll('img');
                imgs.forEach(img => {
                    if (img.src && (img.src.includes('googleusercontent.com') || img.src.includes('drive-viewer'))) {
                        dataUrls.push(img.src);
                    }
                });
            }
            return dataUrls;
        });

        console.log(`=== THÔNG TIN: Bộ quét tìm thấy tổng cộng ${pageImagesBase64.length} trang dữ liệu ===`);

        await browser.close();
        browser = null;

        if (pageImagesBase64.length === 0) {
            return res.status(400).json({ 
                error: `Không bóc tách được dữ liệu hiển thị. Cấu trúc trang đã thay đổi.` 
            });
        }

        // TIẾN HÀNH ĐÓNG GÓI FILE PDF
        const pdfDoc = await PDFDocument.create();
        for (const dataStr of pageImagesBase64) {
            let imageBuffer;
            if (dataStr.startsWith('data:image')) {
                const base64Data = dataStr.split(',')[1];
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else {
                const response = await axios.get(dataStr, { responseType: 'arraybuffer' });
                imageBuffer = Buffer.from(response.data, 'binary');
            }
            
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
        // TIẾN HÀNH ĐÓNG GÓI FILE PDF
        const pdfDoc = await PDFDocument.create();
        for (const dataStr of pageImagesBase64) {
            let imageBuffer;
            if (dataStr.startsWith('data:image')) {
                const base64Data = dataStr.split(',')[1];
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else {
                const response = await axios.get(dataStr, { responseType: 'arraybuffer' });
                imageBuffer = Buffer.from(response.data, 'binary');
            }
            
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

app.listen(PORT, () => console.log(`Server đang chạy tại cổng ${PORT}`));        await browser.close();
        browser = null;

        if (pageImagesBase64.length === 0) {
            return res.status(400).json({ 
                error: `Không bóc tách được dữ liệu hiển thị. Cấu trúc trang đã thay đổi.` 
            });
        }

        // TIẾN HÀNH ĐÓNG GÓI FILE PDF
        const pdfDoc = await PDFDocument.create();
        for (const dataStr of pageImagesBase64) {
            let imageBuffer;
            if (dataStr.startsWith('data:image')) {
                // Xử lý nếu dữ liệu thô dạng Base64 từ Canvas
                const base64Data = dataStr.split(',')[1];
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else {
                // Tải ảnh về nếu dữ liệu là link url <img> thông thường
                const response = await axios.get(dataStr, { responseType: 'arraybuffer' });
                imageBuffer = Buffer.from(response.data, 'binary');
            }
            
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

app.listen(PORT, () => console.log(`Server đang chạy tại cổng ${PORT}`));            p.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }

        const pdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="tailieu_drive.pdf"');
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: 'Lỗi hệ thống: ' + err.message });
    }
});

app.listen(PORT, () => console.log(`Server đang chạy tại cổng ${PORT}`));
