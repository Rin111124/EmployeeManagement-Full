# ⚠️ Thư mục này không còn là source chính

> **Giai đoạn 0 — Source of Truth:** Thư mục `admin-system/` là **legacy shell**, không chứa mã nguồn hoạt động.

## Source chính (Canonical Source)

| Service | Thư mục chính | Ghi chú |
|---|---|---|
| **Admin Backend** | [`packages/backend/`](../packages/backend/) | Express 5 + MongoDB + Node 22 |
| **Admin Frontend** | [`packages/frontend/`](../packages/frontend/) | React 19 + Vite + TypeScript |

## Tại sao vẫn còn thư mục này?

Thư mục `admin-system/` tồn tại từ cấu trúc monorepo ban đầu.
Mã nguồn đã được di chuyển sang `packages/` kể từ refactoring giai đoạn 0.
README này giữ nguyên để CI/git history không bị gián đoạn.

## Lệnh phát triển đúng

Từ root của repo:

```bash
# Chạy backend
npm --prefix packages/backend run dev

# Chạy frontend
npm --prefix packages/frontend run dev

# Chạy cả hai cùng lúc
npm run dev:admin
```

Xem chi tiết trong [packages/backend/README.md](../packages/backend/README.md) và [packages/frontend/README.md](../packages/frontend/README.md).

---

> **Không phát triển hoặc commit code vào thư mục `admin-system/`.** Mọi thay đổi vào `admin-system/` sẽ không được CI kiểm thử và không được deploy.
