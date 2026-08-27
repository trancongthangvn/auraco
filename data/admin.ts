export type OrderStatus = "Đang xử lý" | "Đã giao" | "Đã hủy";

export type MockOrder = {
  id: string;
  customer: string;
  total: string;
  status: OrderStatus;
  date: string;
};

export const mockOrders: MockOrder[] = [
  { id: "AC-1042", customer: "Nguyễn Thị Hoa", total: "$230.00", status: "Đang xử lý", date: "24/08/2026" },
  { id: "AC-1041", customer: "Trần Minh Anh", total: "$130.00", status: "Đã giao", date: "23/08/2026" },
  { id: "AC-1040", customer: "Lê Thu Trang", total: "$100.00", status: "Đã giao", date: "22/08/2026" },
  { id: "AC-1039", customer: "Phạm Quốc Bảo", total: "$260.00", status: "Đã hủy", date: "21/08/2026" },
  { id: "AC-1038", customer: "Vũ Ngọc Mai", total: "$130.00", status: "Đã giao", date: "20/08/2026" },
];

export type Role = "admin" | "staff";

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
};

// Single real admin account (1/1), matching the signed scope: exactly one
// fixed administrator login. A second fixed staff login is kept only to make
// the role-based permission feature (contract item 16) demonstrable.
export const adminAccounts: AdminAccount[] = [
  {
    id: "u1",
    name: "Chủ shop",
    email: "admin@auraco.vn",
    password: "AuraCo@2026",
    role: "admin",
  },
  {
    id: "u2",
    name: "Nhân viên bán hàng",
    email: "staff@auraco.vn",
    password: "AuraCoStaff@2026",
    role: "staff",
  },
];

export const mockAccounts = adminAccounts.map((a) => ({
  id: a.id,
  name: a.name,
  email: a.email,
  role: a.role,
}));
