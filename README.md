# AURA & CO

Cửa hàng trang sức trực tuyến: storefront đa ngôn ngữ + trang quản trị tiếng Việt, chạy trên Next.js với backend Express + PostgreSQL riêng.

- Production: <https://aura.maxmin.vn>
- Trang quản trị: `/admin`

## Kiến trúc

Hai tầng độc lập, không phải static export:

| Tầng | Vị trí | Ghi chú |
|---|---|---|
| Next.js (App Router) | `app/`, `components/`, `lib/` | Chạy bằng `next start`. `next.config.ts` có `rewrites()` đẩy `/api/*` và `/uploads/*` sang API. |
| Express API | `server/` | `pg` thuần (không ORM), JWT (`jsonwebtoken` + `bcryptjs`), upload bằng `multer` có kiểm tra magic bytes. |

Cơ sở dữ liệu PostgreSQL 17 bảng — toàn bộ nội dung website do admin quản lý, không có dữ liệu cứng trong mã nguồn.

### Cấu trúc thư mục đáng chú ý

```
app/(storefront)/     Trang khách hàng. Layout ở đây đọc cookie ngôn ngữ.
app/admin/            Trang quản trị (luôn tiếng Việt).
components/admin/ui/  Bộ thành phần dùng chung của admin: Button, Field, Table, Badge, Modal.
lib/i18n/             Từ điển 5 ngôn ngữ + helper đọc locale phía server.
server/migrations/    Migration SQL, đánh số tăng dần, an toàn khi chạy lại.
docs/                 Tài liệu bàn giao cho khách (script sinh file Word).
```

`/admin` cố tình nằm **ngoài** `(storefront)` để không phải chịu chi phí đọc cookie ngôn ngữ của layout đó.

## Chạy dự án

Cần Node 22+ và một PostgreSQL đang chạy.

```bash
npm install
cd server && npm install && cd ..
```

Tạo `server/.env` (mẫu ở `server/.env.example`) và `.env.local` ở thư mục gốc:

```
API_URL=http://localhost:4000
```

Khởi tạo cơ sở dữ liệu, rồi chạy hai tiến trình:

```bash
psql -d auraco -f server/schema.sql
for f in server/migrations/*.sql; do psql -d auraco -f "$f"; done
node server/seed.js

node server/index.js     # API, cổng 4000
npm run dev              # web, cổng 3001
```

## Kiểm tra trước khi giao

```bash
npx eslint .
npx tsc --noEmit
npm run build
```

Cả ba phải sạch. Xem `DEPLOYMENT.md` để biết quy trình deploy (bắt buộc staging trước) và danh sách lỗi đã từng gặp.

## Quy ước bắt buộc

Những điều dưới đây đều xuất phát từ lỗi thật đã xảy ra — chi tiết trong `DEPLOYMENT.md`.

- **Không dùng `useSearchParams()`.** Nó đẩy component vào Suspense boundary; một boundary như vậy đã khiến toàn bộ trang catalog trắng trên production dù server trả HTML đúng. Đọc query string từ prop `searchParams` của page rồi truyền xuống.
- **Luôn chặn `src` rỗng cho `next/image`**: `{src && <Image .../>}`. Tối ưu ảnh đang bật nên `src=""` sẽ ra biểu tượng ảnh vỡ.
- **Ảnh chỉ dùng đường dẫn cùng máy chủ.** URL ngoài sẽ làm trang lỗi 500 trừ khi khai báo trong `remotePatterns`.
- **Cột NUMERIC của Postgres trả về chuỗi** qua `pg`. Phải `Number(...)` trước khi `.toFixed()` — từng làm sập trang thanh toán.
- **Storefront hiển thị 5 ngôn ngữ, admin luôn tiếng Việt.** Chuỗi mới ở storefront phải thêm vào cả 5 từ điển trong `lib/i18n/dictionaries/`.
- **Phân quyền hai lớp.** Nhân viên chỉ thao tác được Sản phẩm và Đơn hàng; chặn ở cả giao diện (`useRequireAdmin`) lẫn máy chủ (`requireAdmin` / `requireStaffOrAdmin`). Sửa một lớp là hở.
- **Dữ liệu seed lọt ra khách hàng.** Trường `label` trong `data/admin.ts` được `server/seed.js` ghi thẳng vào DB rồi phục vụ cho trang thanh toán — từng để lọt nhãn tiếng Việt lên storefront tiếng Anh. Sửa file seed chỉ có tác dụng cho lần seed sau; DB đang chạy phải `UPDATE` riêng.
- **Kiểm tra giao diện bằng Chrome thật.** Browser pane tích hợp không render frame nên báo sai cả hai chiều — vừa báo lỗi khống, vừa che lỗi thật. Xem `DEPLOYMENT.md`.
