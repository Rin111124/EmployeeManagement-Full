# 🎯 3 Cách Xem Biểu đồ UML

## ✅ Vấn đề Giải quyết

Thay vì cài mermaid-cli phức tạp, bạn có thể sử dụng **3 cách đơn giản**:

---

## 🌐 Cách 1: **Mermaid Live Online (Nhanh nhất)**

### Step 1: Mở file `MERMAID_LIVE_LINKS.txt`
```
Trong thư mục: uml-diagrams/MERMAID_LIVE_LINKS.txt
```

### Step 2: Copy một URL
Ví dụ:
```
https://mermaid.live/edit#pako:graph%20TB%0A%20%20%20%20subgraph%20Actors...
```

### Step 3: Dán vào trình duyệt
```
Paste URL → Enter → Xem biểu đồ
```

### ✨ Ưu điểm:
- ✅ Không cần cài đặt gì
- ✅ Xem ngay trong trình duyệt
- ✅ Có thể export PNG/SVG
- ✅ Có thể edit live

---

## 📝 Cách 2: **View Markdown trong VS Code**

### Step 1: Mở VS Code
```bash
code uml-diagrams/
```

### Step 2: Mở file markdown
```
Ví dụ: 02-usecase-tong-quat.md
```

### Step 3: Preview biểu đồ
```
Ctrl+Shift+V  (hoặc Command+Shift+V trên Mac)
```

### ✨ Ưu điểm:
- ✅ Xem ngay trong VS Code
- ✅ Dễ edit markdown
- ✅ Không cần plugin (có sẵn)

---

## 🎨 Cách 3: **Draw.io Desktop (Chuyên nghiệp)**

### Step 1: Tải Draw.io
```
https://drawio-app.com/
```

### Step 2: Mở Draw.io

### Step 3: Copy mermaid code từ markdown
```
Mở file: 02-usecase-tong-quat.md
Copy đoạn code từ ```mermaid đến ```
```

### Step 4: Import vào Draw.io
```
File → Import from → Paste
```

### Step 5: Edit & Export
```
File → Export as PNG/SVG/PDF
```

### ✨ Ưu điểm:
- ✅ WYSIWYG editor
- ✅ Export chất lượng cao
- ✅ Format chi tiết
- ✅ Save as .drawio file

---

## 📊 So sánh 3 Cách

| Cách | Cài đặt | Dễ dùng | Chất lượng | Export | Tốc độ |
|------|---------|---------|-----------|--------|--------|
| **Mermaid Live** | Không | ✅✅ | ⭐⭐⭐⭐ | PNG/SVG | ⚡⚡ |
| **VS Code** | Không | ✅✅ | ⭐⭐⭐ | ❌ | ⚡⚡ |
| **Draw.io** | Cài đặt | ✅ | ⭐⭐⭐⭐⭐ | ✅ | ⚡ |

---

## 🚀 Khuyến nghị

### Ngay bây giờ:
```bash
# 1. Mở file MERMAID_LIVE_LINKS.txt
cd uml-diagrams
cat MERMAID_LIVE_LINKS.txt

# 2. Copy URL đầu tiên
# 3. Dán vào trình duyệt
# 4. Xem biểu đồ!
```

### Nếu cần edit chi tiết:
```bash
# 1. Tải Draw.io desktop
# 2. Copy mermaid code từ markdown
# 3. Import vào Draw.io
# 4. Export PNG/SVG
```

### Nếu muốn view trong VS Code:
```bash
# 1. Cài extension: "Markdown Preview Mermaid Support"
# 2. Mở file .md
# 3. Preview (Ctrl+Shift+V)
```

---

## 📌 File Liên Quan

- **MERMAID_LIVE_LINKS.txt** - Danh sách URL cho tất cả biểu đồ
- **02-usecase-tong-quat.md** - Usecase tổng quát (dễ nhất để bắt đầu)
- **06-class-diagram.md** - Class diagram cho developer
- **07-er-diagram-database.md** - Database schema (SQL)

---

## 💡 Tips

1. **Mermaid Live** tốt nhất để chia sẻ/presentation
2. **VS Code** tốt nhất để đọc/edit documentation
3. **Draw.io** tốt nhất để export tài liệu chuyên nghiệp

---

## ✨ Kết quả Cuối cùng

```
✅ Biểu đồ tổng quát       → Dùng Mermaid Live
✅ Biểu đồ chi tiết        → Dùng VS Code + Mermaid Live
✅ Export PNG/SVG/PDF      → Dùng Draw.io
✅ Documentation           → Dùng Markdown
✅ Presentation            → Dùng PNG từ Draw.io
```

---

**Chúc mừng! 🎉 Bây giờ bạn có tất cả biểu đồ UML và nhiều cách để xem/edit chúng!**

