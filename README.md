# 🎁 Web Quà Tặng Đa Tầng Kỷ Niệm (Special Gift)

Trang web quà tặng kết hợp hoàn hảo giữa 2 phiên bản:
1. **Phần mở đầu (Intro Screen từ Gift For You)**: Video nền lãng mạn, canvas bắn tim, hiệu ứng gấu cupid, chữ chạy nghệ thuật và nút "Sẵn sàng ❤️" mở nhạc du dương.
2. **Cuốn sổ kỷ niệm (3D Flipbook)**: Mở ra cuốn sổ ảnh bìa cứng 3D, lật từng trang ảnh kỷ niệm và lời nhắn gửi ngọt ngào. Ở trang cuối, 2 chú cupid bay vào giữa và hộp quà bí mật xuất hiện.
3. **Quả cầu ảnh 3D (3D Photo Sphere từ Món Quà Nhỏ)**: Khi ấn vào hộp quà, quả cầu ảnh 3D xuất hiện xoay 360 độ trong vũ trụ sao lấp lánh với mưa hạt hào quang.
4. **Bùng nổ yêu thương & Các dòng chữ chúc 3D bay lượn (Explosion & Orbiting Wishes)**:
   - Click lần 1 vào quả cầu: Camera zoom cận cảnh quả cầu với lời nhắc "Click lần nữa nào 💕".
   - Click lần 2 vào quả cầu: Quả cầu nổ tung, các bức ảnh kỷ niệm viền phát sáng hồng lơ lửng bồng bềnh, và **hàng chục dòng chữ chúc tình cảm (Wishes từ Gift for you) bung tỏa, xoay quanh không gian 3D** với font chữ Pacifico nghệ thuật viền hồng neon rực rỡ!
   - Chạm vào màn hình tạo vòng sóng năng lượng vũ trụ (Cosmic Ripple) và nhịp đập rung động không gian.
   - Nút "Xem thư 💌" ở góc mở bức tâm thư phong bì do chim cupid mang đến.

---

## 🚀 1. Cách chạy trang web trên máy tính

Rất đơn giản, bạn chỉ cần:
- **Nhấp đúp chuột vào file `start.bat`**
- Trình duyệt sẽ tự động mở trang web tại địa chỉ: `http://localhost:3000`

*(Hoặc mở PowerShell / CMD tại thư mục này và gõ `node server.js`)*

---

## ✏️ 2. Cách tùy chỉnh nội dung cho người yêu của bạn

Mở file [`config.js`](./config.js) bằng bất kỳ trình soạn thảo văn bản nào (Notepad, VS Code...):

### A. Đổi tên người nhận & tiêu đề mở đầu:
```javascript
intro: {
    topic: "Happy Valentine",              // Dòng chữ tiêu đề
    recipientName: "Hương Giang",          // Tên người nhận (ví dụ: Ngọc Anh, Em Yêu...)
    backgroundMusic: {
        url: "assets/musics/phepmau.mp3"   // Bài nhạc nền (có sẵn hơn 30 bài trong assets/musics/)
    }
}
```

### B. Thay đổi ảnh và lời tâm sự cho từng trang sách:
- Thêm ảnh của bạn vào thư mục `assets/images/user/` (ví dụ `page1.jpg`, `page2.jpg`...).
- Cập nhật danh sách trang trong `config.js`:
```javascript
book: {
    pages: [
        {
            pageNumber: 1,
            text: "Lời nhắn cho trang 1 của bạn...",
            image: "assets/images/user/page1.jpg"
        },
        // Thêm bao nhiêu trang tùy thích...
    ]
}
```

### C. Thay đổi ảnh quả cầu & các dòng chữ chúc bay lượn 3D:
```javascript
sphere: {
    // Danh sách ảnh tạo quả cầu 3D:
    images: [
        "assets/images/user/page1.jpg",
        "assets/images/user/page2.jpg",
        "assets/images/icons/couple.png"
    ],
    // Các dòng chữ chúc bay lượn 3D trong không gian sau khi ấn vào quả cầu:
    wishes: [
        "Happy Valentine's Day 💖",
        "Mãi bên nhau nhé 💕",
        "Anh yêu em nhiều 💓",
        "iuuu Hương Giang 😘",
        "Cảm ơn vì em đã đến bên anh ✨"
    ],
    // Lá thư tâm sự (tùy chọn):
    letter: {
        enabled: true,
        title: "Gửi Hương Giang ❤️",
        text: "Gửi em yêu,\n\nNội dung lá thư của bạn..."
    }
}
```

---

## 🌐 3. Cách đưa lên mạng (Online) miễn phí để gửi link

Khi bạn muốn gửi link cho người ấy mở trên điện thoại:
1. **Dùng Vercel hoặc Netlify (Khuyên dùng - Cực nhanh & Miễn phí):**
   - Kéo thả cả thư mục này vào [Netlify Drop](https://app.netlify.com/drop) hoặc import vào [Vercel](https://vercel.com/).
   - Bạn sẽ có ngay một đường link HTTPS (ví dụ: `https://tang-em-yeu.vercel.app`) để gửi qua Zalo/Messenger/Instagram.
2. **Dùng GitHub Pages:**
   - Đẩy mã nguồn lên một repository GitHub và bật GitHub Pages trong phần Settings.

---

Chúc bạn và người ấy có những khoảnh khắc thật hạnh phúc và ý nghĩa! ❤️
