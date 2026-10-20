// ============================================================
// CẤU HÌNH DỮ LIỆU QUÀ TẶNG (BẠN CÓ THỂ TỰ DO CHỈNH SỬA Ở ĐÂY)
// ============================================================

window.GIFT_DATA = {
    // 1. Màn mở đầu (Intro Screen - Chữ ghép từ các trái tim bay)
    intro: {
        // Dòng chữ tiêu đề (có thể dùng \n để chủ động xuống dòng theo ý muốn)
        topic: "HAPPY VIETNAMESE WOMEN'S DAY!",
        
        // Tên người nhận (sẽ tự động ghép thêm icon trái tim đỏ ở cuối)
        recipientName: "NGỌC MAI",

        // Tùy biến kiểu chữ và độ tinh tế của các trái tim ghép chữ (Tùy chọn):
        // - fontFamily: Phông chữ hiển thị ('Montserrat', 'Quicksand', 'Pacifico', 'Dancing Script', 'Arial'...)
        // - letterSpacing: Khoảng cách giữa các chữ cái (pixel). Mặc định tự động giãn đều đẹp mắt (~8px).
        // - heartSize: Kích thước từng trái tim nhỏ ghép nên chữ (pixel, khuyên dùng từ 6 đến 9 để chữ nét, thanh mảnh, không bị thô).
        fontFamily: "Montserrat",
        letterSpacing: 7,
        heartSize: 6,

        backgroundMusic: {
            url: "assets/musics/phepmau.mp3"   // File nhạc nền (chọn các bài có sẵn trong assets/musics/)
        }
    },

    // 2. Cuốn sổ kỷ niệm 3D (Lật từng trang tương tác)
    book: {
        pages: [
            {
                pageNumber: 1,
                text: "Mùa đông năm ấy thật đặc biệt với tụi em. Giữa lòng thủ đô tất bật, chúng mình có duyên gặp gỡ và gắn kết bằng tất cả sự chân thành 🎉🎈",
                image: "assets/images/user/page1.jpg"
            },
            {
                pageNumber: 2,
                text: "Đồng hành qua từng buổi họp, cùng nhau chạy qua bao sự kiện, từ lúc nào không hay, chị đã trở thành một mảnh ghép không thể thiếu của tụi em 🌊☔",
                image: "assets/images/user/page2.jpg"
            },
            {
                pageNumber: 3,
                text: "Suốt gần một năm chia sẻ mọi buồn vui, gắn bó nhiều đến mức cái tên \"chị Mai\" đã trở nên thân thương và in sâu vào tâm trí tụi em 💞",
                image: "assets/images/user/page3.jpg"
            },
            {
                pageNumber: 4,
                text: "Dù giờ đây mỗi người một công việc, chẳng thể gặp nhau thường xuyên như trước, nhưng tình cảm và những kỷ niệm ngày ấy vẫn vẹn nguyên như thuở ban đầu 🎂💖",
                image: "assets/images/user/page4.jpg"
            },
            {
                pageNumber: 5,
                text: "Cảm ơn chị vì đã luôn ở đó, cùng tụi em đi qua một phần thanh xuân thật rực rỡ và trọn vẹn ❤️✨",
                image: "assets/images/user/page5.jpg"
            }
        ]
    },

    // 3. Quả cầu ảnh 3D & Các dòng chữ chúc bay lượn (Sphere & Orbiting Wishes)
    sphere: {
        // Danh sách ảnh tạo nên quả cầu 3D (bạn có thể thêm ảnh của bạn vào thư mục assets/images/user/)
        images: [
            "assets/images/sp/1.jpg",
            "assets/images/sp/2.jpg",
            "assets/images/sp/3.jpg",
            "assets/images/sp/4.jpg",
            "assets/images/sp/5.jpg",
            "assets/images/sp/6.jpg",
            "assets/images/sp/7.jpg",
            "assets/images/sp/8.JPG",
            "assets/images/sp/9.JPG",
            "assets/images/sp/10.JPG",
            "assets/images/sp/11.JPG"
        ],
        // Kích thước các dòng chữ chúc bay lượn (Tùy chọn: mặc định 2.9, tăng lên 3.2 - 3.8 nếu muốn chữ to hơn nữa)
        wishScale: 2.9,

        // Các dòng chữ chúc 3D bay lượn quanh không gian sau khi ấn vào quả cầu
        wishes: [
            "Happy Vietnamese Women's Day 💖",
            "Cảm ơn vì luôn quan tâm chúng em ✨",
            "Chúc chị gái luôn luôn vui vẻ, hạnh phúc 💕",
            "Yêu chị gái rất nhiều 💓",
            "Ngày càng xinh đẹp 😘",
            "Cảm ơn vì luôn bảo vệ, nhường nhịn tụi em 🌸",
            "We always with you 💖",
            "Ngọc Mai 🌹",
            "Yêu thương đong đầy từng khoảnh khắc 💞",
            "Cảm ơn chị đã xuất hiện trong cuộc đời tụi em 💐"
        ],
        // Lá thư tâm sự (xuất hiện nút mở thư ở góc phải sau khi quả cầu nổ)
        letter: {
            enabled: true,
            title: "Gửi chị gái yêu dấu Ngọc Mai ❤️",
            text: "Gửi chị gái,\n\nCảm ơn chị vì đã luôn đồng hành bên cạnh chúng em, cùng chúng chia sẻ biết bao niềm vui và nỗi buồn trong cuộc sống.\n\nNhân ngày 20/10, chúc chị luôn luôn xinh đẹp, rạng rỡ và ngập tràn hạnh phúc mỗi ngày. Mong rằng chị gái sẽ luôn luôn yêu thương chở che cho tụi em. Luv 💕"
        }
    }
};
