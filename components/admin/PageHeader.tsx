"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Tag,
  MessageSquare,
  Newspaper,
  Layout,
  Globe,
  Users,
  KeyRound,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

interface GuideMeta {
  title: string;
  guide: string;
  icon: LucideIcon;
}

const GUIDES: Record<string, GuideMeta> = {
  "/admin": {
    title: "Tổng quan",
    icon: LayoutDashboard,
    guide:
      "Theo dõi nhanh số sản phẩm, đơn hàng và bộ sưu tập hiện có. Xem danh sách đơn hàng gần đây ngay tại đây.",
  },
  "/admin/products": {
    title: "Sản phẩm",
    icon: Package,
    guide:
      "Quản lý toàn bộ sản phẩm trang sức: tên, danh mục, giá, ẩn/hiện trên website. Bấm Sửa để chỉnh từng sản phẩm.",
  },
  "/admin/collections": {
    title: "Collections",
    icon: Layers,
    guide:
      "Quản lý các bộ sưu tập hiển thị trên trang chủ và bộ lọc catalog (Quiet Luxury, Minimalist...). Thêm collection mới bằng nút bên phải.",
  },
  "/admin/orders": {
    title: "Đơn hàng",
    icon: ShoppingCart,
    guide:
      "Xem danh sách đơn hàng, cập nhật trạng thái xử lý. Bấm Xem để mở chi tiết đơn: sản phẩm, địa chỉ giao hàng, thanh toán.",
  },
  "/admin/discount-codes": {
    title: "Khuyến mãi",
    icon: Tag,
    guide:
      "Tạo mã giảm giá theo phần trăm hoặc số tiền cố định, đặt thời hạn hiệu lực và giới hạn lượt dùng. Bật/tắt nhanh từng mã.",
  },
  "/admin/inquiries": {
    title: "Yêu cầu liên hệ",
    icon: MessageSquare,
    guide:
      "Toàn bộ form Liên hệ khách gửi từ website tập trung tại đây. Liên hệ lại theo số điện thoại/email và đánh dấu khi đã xử lý.",
  },
  "/admin/posts": {
    title: "Bài viết",
    icon: Newspaper,
    guide:
      "Viết và quản lý bài Journal: trình soạn thảo có định dạng, chèn ảnh và video trực tiếp vào nội dung.",
  },
  "/admin/homepage": {
    title: "Trang chủ",
    icon: Layout,
    guide:
      "Quản lý nội dung trang chủ: banner hero, sản phẩm nổi bật ở từng khối, và đánh giá khách hàng.",
  },
  "/admin/cai-dat-web": {
    title: "Cài đặt web",
    icon: Globe,
    guide:
      "Cấu hình tiêu đề, mô tả SEO và ảnh chia sẻ mạng xã hội (Open Graph) cho toàn bộ website.",
  },
  "/admin/accounts": {
    title: "Tài khoản",
    icon: Users,
    guide:
      "Quản lý tài khoản đăng nhập trang quản trị và cơ chế phân quyền Quản trị viên / Nhân viên.",
  },
  "/admin/profile": {
    title: "Đổi mật khẩu",
    icon: KeyRound,
    guide:
      "Đổi mật khẩu đăng nhập trang quản trị của bạn. Nên dùng mật khẩu mạnh và đổi định kỳ để bảo mật.",
  },
};

export default function PageHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const key =
    Object.keys(GUIDES)
      .filter((k) => pathname === k || (k !== "/admin" && pathname.startsWith(k)))
      .sort((a, b) => b.length - a.length)[0] || "/admin";
  const meta = GUIDES[key];
  const Icon = meta.icon;

  return (
    <div className="mb-6 rounded-2xl border border-black/10 bg-white px-5 py-4 lg:px-6 lg:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="shrink-0 mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#2b261f]/5 text-[#2b261f]">
            <Icon size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif-display text-xl leading-tight">
              {meta.title}
            </h1>
            <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-relaxed text-black/50 max-w-2xl">
              <Lightbulb size={13} className="mt-0.5 shrink-0 text-gold" />
              <span>{meta.guide}</span>
            </p>
          </div>
        </div>
        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-0.5">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
