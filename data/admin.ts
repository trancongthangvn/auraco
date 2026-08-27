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
  username: string;
  password: string;
  role: Role;
};

// Exactly one real admin account (1/1), per scope. The role-based permission
// system (contract item 16 — Quản trị viên vs Nhân viên) stays fully wired in
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
