export type OrderStatus = "Đang xử lý" | "Đã giao" | "Đã hủy";

// The value itself stays Vietnamese — it's what's stored in the DB and what
// every status comparison in the app (STATUS_TONE, order filters, the order
// edit dropdown) already keys off. Changing the stored value would mean a
// data migration and touching that logic everywhere it's compared, for a
// change that's purely cosmetic. This is a display-only translation for the
// admin UI, which the site owner asked to be in English to match a reference
// screenshot: it maps each stored status to the English label shown there.
export const ORDER_STATUS_LABEL_EN: Record<OrderStatus, string> = {
  "Đang xử lý": "Pending",
  "Đã giao": "Delivered",
  "Đã hủy": "Cancelled",
};

export type OrderItem = {
  name: string;
  material: string;
  price: number;
  qty: number;
  img: string;
};

export type MockOrder = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  total: string;
  status: OrderStatus;
  date: string;
  items: OrderItem[];
  shippingFee: number;
  paymentMethod: string;
};

export const mockOrders: MockOrder[] = [
  {
    id: "AC-1042",
    customer: "Nguyễn Thị Hoa",
    email: "hoa.nguyen@example.com",
    phone: "0912 345 678",
    address: "12 Nguyễn Huệ",
    city: "Quận 1, TP. Hồ Chí Minh",
    country: "Vietnam",
    total: "$230.00",
    status: "Đang xử lý",
    date: "24/08/2026",
    shippingFee: 0,
    paymentMethod: "Card",
    items: [
      { name: "Evermere Heart Necklace", material: "18ct Gold Vermeil", price: 130, qty: 1, img: "/images/products/thumbnails/1fb8c789-ece5-4cdb-9022-0a20ee3a1261.webp" },
      { name: "Audrey Diamond Hoops", material: "18k Gold Vermeil, Cubic Zirconia", price: 100, qty: 1, img: "/images/products/variants/822cc99c-8e65-45f6-bb68-9ea8962cefb3.webp" },
    ],
  },
  {
    id: "AC-1041",
    customer: "Trần Minh Anh",
    email: "minhanh.tran@example.com",
    phone: "0987 654 321",
    address: "45 Lê Lợi",
    city: "Hải Châu, Đà Nẵng",
    country: "Vietnam",
    total: "$130.00",
    status: "Đã giao",
    date: "23/08/2026",
    shippingFee: 0,
    paymentMethod: "PayPal",
    items: [
      { name: "Pure Alhambra", material: "18k Gold Vermeil, Mother of Pearl", price: 130, qty: 1, img: "/images/products/thumbnails/01937a3b-cd91-477a-a68f-ab079668d02c.webp" },
    ],
  },
  {
    id: "AC-1040",
    customer: "Lê Thu Trang",
    email: "trang.le@example.com",
    phone: "0901 222 333",
    address: "8 Trần Phú",
    city: "Ba Đình, Hà Nội",
    country: "Vietnam",
    total: "$100.00",
    status: "Đã giao",
    date: "22/08/2026",
    shippingFee: 0,
    paymentMethod: "Card",
    items: [
      { name: "Dot Chain Necklace", material: "Sterling Silver", price: 100, qty: 1, img: "/images/products/thumbnails/4bdc27f4-f778-4cdd-ba40-b69666f9ebea.webp" },
    ],
  },
  {
    id: "AC-1039",
    customer: "Phạm Quốc Bảo",
    email: "bao.pham@example.com",
    phone: "0933 444 555",
    address: "120 Điện Biên Phủ",
    city: "Bình Thạnh, TP. Hồ Chí Minh",
    country: "Vietnam",
    total: "$260.00",
    status: "Đã hủy",
    date: "21/08/2026",
    shippingFee: 0,
    paymentMethod: "Cash App",
    items: [
      { name: "Evermere Heart Necklace", material: "18ct Gold Vermeil", price: 130, qty: 2, img: "/images/products/thumbnails/1fb8c789-ece5-4cdb-9022-0a20ee3a1261.webp" },
    ],
  },
  {
    id: "AC-1038",
    customer: "Vũ Ngọc Mai",
    email: "mai.vu@example.com",
    phone: "0977 888 999",
    address: "3 Hoàng Diệu",
    city: "Hải Châu, Đà Nẵng",
    country: "Vietnam",
    total: "$130.00",
    status: "Đã giao",
    date: "20/08/2026",
    shippingFee: 0,
    paymentMethod: "Zelle",
    items: [
      { name: "Layered Opal Necklace", material: "18k Gold Vermeil, Opal", price: 130, qty: 1, img: "/images/products/thumbnails/97fce6ae-f0bd-419d-a95d-97e5a0825815.webp" },
    ],
  },
];

export type Role = "admin" | "staff";

export type AdminAccount = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
};

// Exactly one real admin account (1/1), per scope. The role-based permission
// system (contract item 16: Quản trị viên vs Nhân viên) stays fully wired in
// the code (see AdminShell nav filtering and the /admin/accounts page gate);
// it activates automatically the moment a second account with role "staff"
// is added here.
export const adminAccounts: AdminAccount[] = [
  {
    id: "u1",
    name: "Chủ shop",
    username: "admin",
    password: "AuraCo@2026",
    role: "admin",
  },
];

export const mockAccounts = adminAccounts.map((a) => ({
  id: a.id,
  name: a.name,
  username: a.username,
  role: a.role,
}));

export type DiscountType = "percent" | "fixed";

export type DiscountCode = {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrder: number;
  usageLimit: number;
  used: number;
  startDate: string;
  endDate: string;
  active: boolean;
};

export const discountCodes: DiscountCode[] = [
  {
    id: "d1",
    code: "AURA10",
    type: "percent",
    value: 10,
    minOrder: 50,
    usageLimit: 200,
    used: 87,
    startDate: "01/08/2026",
    endDate: "30/09/2026",
    active: true,
  },
  {
    id: "d2",
    code: "WELCOME20",
    type: "percent",
    value: 20,
    minOrder: 0,
    usageLimit: 500,
    used: 342,
    startDate: "01/01/2026",
    endDate: "31/12/2026",
    active: true,
  },
  {
    id: "d3",
    code: "FREESHIP",
    type: "fixed",
    value: 5,
    minOrder: 80,
    usageLimit: 1000,
    used: 610,
    startDate: "01/06/2026",
    endDate: "31/08/2026",
    active: false,
  },
];

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  date: string;
  resolved: boolean;
};

export const inquiries: Inquiry[] = [
  {
    id: "i1",
    name: "Đặng Thu Hà",
    email: "ha.dang@example.com",
    phone: "0909 111 222",
    subject: "Hỏi về kích thước nhẫn",
    message:
      "Chào shop, mình muốn hỏi vòng size nhẫn AURA & CO có tương đương bảng size quốc tế không, mình đeo size 6 US.",
    date: "25/08/2026",
    resolved: false,
  },
  {
    id: "i2",
    name: "Ngô Bảo Long",
    email: "long.ngo@example.com",
    phone: "0933 222 111",
    subject: "Đơn hàng chưa nhận được",
    message:
      "Em đặt đơn AC-1038 từ tuần trước mà chưa thấy giao, shop kiểm tra giúp em với.",
    date: "24/08/2026",
    resolved: false,
  },
  {
    id: "i3",
    name: "Trịnh Yến Nhi",
    email: "nhi.trinh@example.com",
    phone: "0977 333 444",
    subject: "Hợp tác KOL/Affiliate",
    message:
      "Mình làm nội dung về trang sức, muốn trao đổi cơ hội hợp tác review sản phẩm với AURA & CO.",
    date: "22/08/2026",
    resolved: true,
  },
];

export type PressMention = {
  id: string;
  name: string;
  sort: number;
};

export const pressMentions: PressMention[] = [
  { id: "p1", name: "VOGUE", sort: 0 },
  { id: "p2", name: "ELLE", sort: 1 },
  { id: "p3", name: "HARPER'S BAZAAR", sort: 2 },
  { id: "p4", name: "MARIE CLAIRE", sort: 3 },
  { id: "p5", name: "REFINERY29", sort: 4 },
];

export type ReviewStatus = "Chờ duyệt" | "Đã duyệt" | "Từ chối";

export type ProductReview = {
  id: string;
  productName: string;
  customer: string;
  rating: number;
  comment: string;
  date: string;
  status: ReviewStatus;
};

export const productReviews: ProductReview[] = [
  {
    id: "r1",
    productName: "Evermere Heart Necklace",
    customer: "Grace",
    rating: 5,
    comment:
      "Beautiful piece and great quality! Shipping took a little longer than expected, but overall very happy.",
    date: "04/08/2026",
    status: "Đã duyệt",
  },
  {
    id: "r2",
    productName: "Pure Alhambra",
    customer: "Julia James",
    rating: 4,
    comment:
      "Beautiful minimalist piece with a lovely shine. I only wish the chain was a tiny bit longer.",
    date: "02/08/2026",
    status: "Đã duyệt",
  },
  {
    id: "r3",
    productName: "Audrey Diamond Hoops",
    customer: "Minh Thư",
    rating: 2,
    comment:
      "Đeo được 2 tuần thì bị xỉn màu, hơi thất vọng so với giá tiền.",
    date: "20/08/2026",
    status: "Chờ duyệt",
  },
  {
    id: "r4",
    productName: "Layered Opal Necklace",
    customer: "Abbie Bennett",
    rating: 5,
    comment: "Even prettier in person! The polished finish gives it such an elegant look.",
    date: "26/07/2026",
    status: "Chờ duyệt",
  },
  {
    id: "r5",
    productName: "Dot Chain Necklace",
    customer: "Anonymous Spam",
    rating: 1,
    comment: "Check out my website for cheap jewelry supplies! www.spam-link.example",
    date: "18/08/2026",
    status: "Từ chối",
  },
];

export type PaymentMethodKey =
  | "card"
  | "paypal"
  | "applePay"
  | "cashapp"
  | "zelle";

export type PaymentMethodSetting = {
  key: PaymentMethodKey;
  label: string;
  enabled: boolean;
  detail: string;
};

export const paymentMethodSettings: PaymentMethodSetting[] = [
  { key: "card", label: "Credit / Debit Card", enabled: true, detail: "Xử lý qua cổng PayPal Advanced Card Payments" },
  { key: "paypal", label: "PayPal", enabled: true, detail: "merchant@auraco.example" },
  { key: "applePay", label: "Apple Pay", enabled: false, detail: "Yêu cầu xác thực domain với PayPal" },
  { key: "cashapp", label: "Cash App", enabled: true, detail: "$AuraCoShop" },
  { key: "zelle", label: "Zelle", enabled: true, detail: "payments@auraco.example" },
];

export type PaymentTransaction = {
  id: string;
  orderId: string;
  method: string;
  amount: string;
  status: "Chờ xử lý" | "Đã thanh toán" | "Thất bại" | "Đã hủy";
  date: string;
};

export const paymentTransactions: PaymentTransaction[] = [
  { id: "t1", orderId: "AC-1042", method: "Cash App", amount: "$230.00", status: "Chờ xử lý", date: "24/08/2026 11:01" },
  { id: "t2", orderId: "AC-1041", method: "PayPal", amount: "$130.00", status: "Đã thanh toán", date: "23/08/2026 17:35" },
  { id: "t3", orderId: "AC-1040", method: "Card", amount: "$100.00", status: "Đã thanh toán", date: "22/08/2026 09:12" },
  { id: "t4", orderId: "AC-1039", method: "Zelle", amount: "$260.00", status: "Đã hủy", date: "21/08/2026 15:47" },
  { id: "t5", orderId: "AC-1038", method: "Cash App", amount: "$130.00", status: "Đã thanh toán", date: "20/08/2026 16:57" },
];
