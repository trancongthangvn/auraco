/**
 * Generates "AURA-CO_Bao-cao-tinh-nang-va-Bao-gia.docx" — a client-facing
 * feature/gap report + phase-2 quotation, built from an audit of:
 *   - the phase-1 contract's 16 line items,
 *   - what our build at aura.maxmin.vn actually ships today,
 *   - the reference admin at auracojewelry.com/admin ("Zenith", 16 sections).
 * Run: node docs/make-report.js
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageBreak, LevelFormat, convertInchesToTwip,
} = require("docx");

const W = 9026; // content width (A4 minus 1440 twip margins each side)
const INK = "2B261F";
const GOLD = "A67C3D";
const HDR_BG = "F2EDE4";
const ZEBRA = "FAF8F5";

const OK = "Hoàn thành";
const PARTIAL = "Một phần";
const MISSING = "Chưa có";

function statusColor(s) {
  if (s === OK) return "1E7B34";
  if (s === PARTIAL) return "B7791F";
  return "B02A1E";
}

function cell(text, width, opts = {}) {
  const runs = Array.isArray(text) ? text : [text];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: opts.bg ? { type: ShadingType.CLEAR, fill: opts.bg, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: opts.valign,
    children: runs.map((t, i) =>
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { after: i === runs.length - 1 ? 0 : 60 },
        children: [new TextRun({
          text: String(t),
          bold: !!opts.bold,
          size: opts.size || 19,
          color: opts.color || INK,
          font: "Calibri",
        })],
      })
    ),
  });
}

function headerRow(labels, widths) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) =>
      cell(l, widths[i], { bg: HDR_BG, bold: true, size: 19, color: INK })
    ),
  });
}

function table(widths, rows) {
  return new Table({
    columnWidths: widths,
    width: { size: W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "D8CFC0" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "D8CFC0" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "D8CFC0" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "D8CFC0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E5DED2" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "E5DED2" },
    },
    rows,
  });
}

const h1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 160 },
  children: [new TextRun({ text: t, bold: true, size: 30, color: INK, font: "Calibri" })],
});

const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 260, after: 120 },
  children: [new TextRun({ text: t, bold: true, size: 24, color: GOLD, font: "Calibri" })],
});

const p = (t, opts = {}) => new Paragraph({
  spacing: { after: opts.after === undefined ? 120 : opts.after },
  alignment: opts.align,
  children: [new TextRun({
    text: t, size: opts.size || 21, italics: !!opts.italics, bold: !!opts.bold,
    color: opts.color || INK, font: "Calibri",
  })],
});

const bullet = (t) => new Paragraph({
  numbering: { reference: "dots", level: 0 },
  spacing: { after: 60 },
  children: [new TextRun({ text: t, size: 21, color: INK, font: "Calibri" })],
});

// ---------------------------------------------------------------------------
// PART A — phase-1 contract line items
// ---------------------------------------------------------------------------
const CONTRACT = [
  ["1", "Trang chủ", "Header, thanh khuyến mãi, hero carousel 3 slide, Collections, Beach Vibe, New Arrivals, đánh giá khách hàng, trust badges, IT-Girl Edit, Journal, footer", OK],
  ["2", "Danh mục sản phẩm (Catalog)", "Lọc theo bộ sưu tập, sắp xếp theo giá và ngày, phân trang Show More", OK],
  ["3", "Catalog theo bộ sưu tập", "6 trang dùng chung khuôn mẫu: Quiet Luxury, Minimalist, Statement, Trending Now, Beach Vibe, New Arrivals", OK],
  ["4", "Chi tiết sản phẩm", "Thư viện ảnh, mô tả, tính năng, chọn số lượng, Add to Bag / Buy Now, accordion, sản phẩm liên quan, đánh giá", OK],
  ["5", "Giỏ hàng", "Giao diện trạng thái giỏ hàng trống (đúng phạm vi hợp đồng)", OK],
  ["6", "Our Story", "Nội dung giới thiệu thương hiệu", OK],
  ["7", "Liên hệ", "Form liên hệ phần giao diện (hợp đồng ghi rõ chưa kết nối gửi email thật)", OK],
  ["8", "Chính sách bảo mật", "Nội dung tĩnh", OK],
  ["9", "Chính sách an ninh", "Nội dung tĩnh", OK],
  ["10", "Chính sách đổi trả", "Nội dung tĩnh", OK],
  ["11", "Điều khoản dịch vụ", "Nội dung tĩnh", OK],
  ["12", "Responsive toàn site", "Bố cục desktop / tablet / mobile cho toàn bộ trang", PARTIAL],
  ["13", "Kiểm thử và sửa lỗi", "Kiểm tra đa trình duyệt, sửa lỗi hiển thị phát sinh", PARTIAL],
  ["14", "Tên miền, đóng gói, bàn giao", "Đã chạy tại aura.maxmin.vn; có tài liệu DEPLOYMENT.md hướng dẫn vận hành", OK],
  ["15", "Giao diện admin", "Đăng nhập, bảng điều khiển, quản lý sản phẩm, đơn hàng, tài khoản, tùy chỉnh trang chủ", OK],
  ["16", "Phân quyền cơ bản", "Quản trị viên toàn quyền; Nhân viên chỉ quản lý sản phẩm và đơn hàng, chặn cả giao diện lẫn máy chủ", OK],
];

// ---------------------------------------------------------------------------
// PART B — delivered beyond the phase-1 contract, at no extra charge
// ---------------------------------------------------------------------------
const EXTRAS = [
  ["Backend thật (Express + PostgreSQL)", "Hợp đồng 1 chỉ yêu cầu giao diện. Thực tế đã dựng máy chủ và cơ sở dữ liệu thật với 17 bảng, toàn bộ nội dung website do admin quản lý chứ không phải dữ liệu cứng."],
  ["Quản lý bài viết (Journal)", "Trình soạn thảo định dạng, chèn ảnh và video, danh mục bài viết, SEO riêng từng bài, hẹn giờ đăng, đếm lượt xem, bài viết liên quan."],
  ["Mã giảm giá", "Tạo mã theo phần trăm hoặc số tiền, thời hạn, giới hạn lượt dùng, bật/tắt nhanh. Website tham chiếu không có chức năng này."],
  ["Hộp thư liên hệ", "Lưu và quản lý yêu cầu khách gửi từ form Liên hệ, đánh dấu đã xử lý."],
  ["Duyệt đánh giá sản phẩm", "Duyệt / từ chối / xóa đánh giá trước khi hiển thị công khai."],
  ["Quản lý logo báo chí", "Mục \"As Seen In\" trên trang chủ, thêm/sửa/xóa và sắp xếp logo."],
  ["Quản lý bộ sưu tập", "Thêm, sửa, ẩn/hiện bộ sưu tập hiển thị trên trang chủ và bộ lọc catalog."],
  ["Cấu hình thanh toán", "Bật/tắt từng phương thức, cấu hình nội dung hướng dẫn và mã QR, lịch sử giao dịch, duyệt ảnh chứng từ chuyển khoản."],
  ["Đa ngôn ngữ (5 ngôn ngữ)", "Giao diện khách hàng: Anh, Pháp, Đức, Tây Ban Nha, Ý. Trang quản trị giữ tiếng Việt. Website tham chiếu chỉ có tiếng Anh."],
  ["Hiệu ứng cuộn trang", "Toàn bộ khối nội dung trang chủ hiện dần khi cuộn tới, có hỗ trợ chế độ giảm chuyển động cho người nhạy cảm."],
  ["Carousel video sản phẩm", "Khối video sản phẩm tự phát khi cuộn tới, kèm cấu hình tải video trong trang quản trị."],
  ["Nâng cấp giao diện quản trị", "Thư viện thành phần dùng chung: bo góc, đổ bóng, hiệu ứng hover và nhấn, biểu tượng SVG đồng bộ toàn trang quản trị."],
];

// ---------------------------------------------------------------------------
// PART C — gaps vs the reference site, i.e. the phase-2 quotation
// ---------------------------------------------------------------------------
const QUOTE = [
  ["1", "Đa tiền tệ (USD / EUR / GBP)", "Bảng tỷ giá quy đổi trong trang quản trị, khách chọn tiền tệ, giá hiển thị và đơn hàng ghi nhận theo tiền tệ đã chọn.", "4 - 5", "9.000.000"],
  ["2", "Quản lý Thương hiệu (Brands)", "Hiện danh mục sản phẩm đang cố định 4 giá trị trong mã nguồn. Cần chuyển thành bảng dữ liệu có thêm/sửa/xóa, sắp xếp kéo thả, dùng chung cho menu và trang chủ.", "3 - 4", "7.000.000"],
  ["3", "Quản lý Chuyên mục (Categories)", "Tách chuyên mục thành thực thể quản lý độc lập với thương hiệu, có thứ tự hiển thị riêng.", "2 - 3", "5.000.000"],
  ["4", "Trang tùy biến (Pages CMS)", "Cho phép tự tạo trang nội dung mới bằng trình soạn thảo mà không cần lập trình viên. Hiện các trang tĩnh nằm cứng trong mã nguồn.", "3 - 4", "7.000.000"],
  ["5", "Trang Giao diện (Interface)", "Đặt màu nền và ảnh nền cho từng khối trang chủ, ảnh hero riêng cho điện thoại, chọn và sắp xếp sản phẩm nổi bật cho từng khối.", "5 - 6", "11.000.000"],
  ["6", "Trình sửa CSS tùy chỉnh", "Sửa giao diện nâng cao cho desktop / tablet / mobile, xem trước trước khi xuất bản.", "3 - 4", "7.000.000"],
  ["7", "Cấu hình vận chuyển và thuế", "Phí ship cố định, ngưỡng miễn phí ship theo giá trị và theo số lượng, phần trăm thuế áp lên đơn hàng.", "2 - 3", "5.000.000"],
  ["8", "Giỏ hàng thật", "Hiện chỉ có giao diện giỏ trống theo đúng hợp đồng 1. Cần thêm, sửa số lượng, xóa, lưu giỏ giữa các phiên và đồng bộ sang thanh toán.", "4 - 5", "9.000.000"],
  ["9", "Hệ thống tài khoản khách hàng", "Đăng ký, đăng nhập, quên mật khẩu, lịch sử đơn hàng, sổ địa chỉ. Hiện hai trang này mới là giao diện mẫu.", "5 - 6", "11.000.000"],
  ["10", "Kết nối cổng thanh toán thật", "Tích hợp PayPal / Thẻ / Apple Pay để thu tiền tự động. Cần tài khoản PayPal Business và khóa API do khách hàng cung cấp.", "5 - 7", "13.000.000"],
  ["11", "Gửi email tự động", "Email xác nhận đơn hàng cho khách và thông báo đơn mới cho chủ shop; kết nối form Liên hệ để gửi thư thật.", "3 - 4", "7.000.000"],
  ["12", "Popup chào mừng và tiện ích", "Popup thu email khi khách vào trang chủ, nút liên hệ WhatsApp nổi, thanh tin chạy, biểu tượng thanh toán ở chân trang.", "3 - 4", "6.000.000"],
  ["13", "Soạn nội dung chính sách từ admin", "Chuyển 4 trang chính sách và Story of us sang trình soạn thảo trong trang quản trị thay vì sửa mã nguồn.", "2 - 3", "5.000.000"],
  ["14", "Bộ lọc và tìm kiếm trong admin", "Tìm kiếm, lọc theo thương hiệu và chuyên mục, phân trang cho danh sách sản phẩm và đơn hàng khi dữ liệu lớn.", "2 - 3", "5.000.000"],
  ["15", "Kiểm thử đa trình duyệt và mobile", "Rà soát Chrome, Safari, Firefox, Edge trên máy tính và điện thoại; sửa lỗi hiển thị phát sinh.", "3 - 4", "6.000.000"],
];

const TOTAL_LOW = "109.000.000";
const NOTE_PRICES = "Đơn giá trong bảng là đề xuất, cần được xác nhận lại trước khi gửi khách hàng chính thức.";

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const rowsA = [headerRow(["STT", "Hạng mục", "Nội dung", "Trạng thái"], [700, 2500, 4300, 1526])];
CONTRACT.forEach(([n, name, desc, st], i) => {
  const bg = i % 2 ? ZEBRA : undefined;
  rowsA.push(new TableRow({ children: [
    cell(n, 700, { bg, align: AlignmentType.CENTER }),
    cell(name, 2500, { bg, bold: true }),
    cell(desc, 4300, { bg }),
    cell(st, 1526, { bg, bold: true, color: statusColor(st), align: AlignmentType.CENTER }),
  ]}));
});

const rowsB = [headerRow(["Hạng mục", "Mô tả"], [3000, 6026])];
EXTRAS.forEach(([name, desc], i) => {
  const bg = i % 2 ? ZEBRA : undefined;
  rowsB.push(new TableRow({ children: [
    cell(name, 3000, { bg, bold: true }),
    cell(desc, 6026, { bg }),
  ]}));
});

const rowsC = [headerRow(["STT", "Tính năng", "Mô tả", "Ngày công", "Giá (VNĐ)"], [560, 2100, 4066, 900, 1400])];
QUOTE.forEach(([n, name, desc, days, price], i) => {
  const bg = i % 2 ? ZEBRA : undefined;
  rowsC.push(new TableRow({ children: [
    cell(n, 560, { bg, align: AlignmentType.CENTER }),
    cell(name, 2100, { bg, bold: true }),
    cell(desc, 4066, { bg }),
    cell(days, 900, { bg, align: AlignmentType.CENTER }),
    cell(price, 1400, { bg, align: AlignmentType.RIGHT }),
  ]}));
});
rowsC.push(new TableRow({ children: [
  cell("", 560, { bg: HDR_BG }),
  cell("TỔNG CỘNG", 2100, { bg: HDR_BG, bold: true }),
  cell("15 hạng mục, đã bao gồm thuế giá trị gia tăng", 4066, { bg: HDR_BG }),
  cell("49 - 61", 900, { bg: HDR_BG, bold: true, align: AlignmentType.CENTER }),
  cell(TOTAL_LOW, 1400, { bg: HDR_BG, bold: true, color: GOLD, align: AlignmentType.RIGHT }),
]}));

const doc = new Document({
  numbering: {
    config: [{
      reference: "dots",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.18) } } },
      }],
    }],
  },
  styles: { default: { document: { run: { font: "Calibri", size: 21, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: "AURA & CO", bold: true, size: 44, color: INK, font: "Calibri" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 8 } },
        children: [new TextRun({ text: "BÁO CÁO TÍNH NĂNG VÀ BÁO GIÁ GIAI ĐOẠN 2", bold: true, size: 26, color: GOLD, font: "Calibri" })] }),

      p("Website đang vận hành: https://aura.maxmin.vn", { bold: true }),
      p("Website tham chiếu dùng để đối chiếu: https://auracojewelry.com"),
      p("Ngày lập: 28/08/2026", { after: 240 }),

      p("Tài liệu này gồm ba phần: (A) tình trạng nghiệm thu hợp đồng giai đoạn 1, (B) các hạng mục đã thực hiện vượt phạm vi hợp đồng giai đoạn 1 mà không phát sinh chi phí, và (C) các tính năng còn thiếu so với website tham chiếu, kèm báo giá cho giai đoạn 2.", { after: 300 }),

      h1("A. Tình trạng hợp đồng giai đoạn 1"),
      p("Toàn bộ 16 hạng mục trong phạm vi công việc đã được thực hiện. Hai hạng mục ở trạng thái \"Một phần\" là công việc kiểm thử, sẽ hoàn tất trong đợt bàn giao cuối.", { after: 160 }),
      table([700, 2500, 4300, 1526], rowsA),
      p("", { after: 100 }),
      p("Ghi chú về hạng mục 16 (Phân quyền): trong quá trình rà soát đã phát hiện tài khoản Nhân viên tuy đăng nhập được nhưng bị máy chủ từ chối mọi thao tác, kể cả quản lý sản phẩm và đơn hàng, tức là chưa đúng mô tả hợp đồng. Lỗi này đã được sửa và kiểm thử lại: Nhân viên hiện thao tác được đúng hai mục Sản phẩm và Đơn hàng, đồng thời bị chặn ở các mục còn lại trên cả giao diện lẫn máy chủ.", { after: 60 }),

      new Paragraph({ children: [new PageBreak()] }),

      h1("B. Hạng mục đã thực hiện vượt hợp đồng giai đoạn 1"),
      p("Các hạng mục dưới đây nằm ngoài phạm vi hợp đồng giai đoạn 1 nhưng đã được thực hiện và bàn giao, không phát sinh chi phí.", { after: 160 }),
      table([3000, 6026], rowsB),

      new Paragraph({ children: [new PageBreak()] }),

      h1("C. Báo giá giai đoạn 2"),
      p("Danh sách dưới đây là kết quả đối chiếu trực tiếp giữa hệ thống hiện tại và trang quản trị của website tham chiếu (16 mục chức năng). Đây là phần chênh lệch cần bổ sung để hai hệ thống tương đương nhau về mặt vận hành.", { after: 160 }),
      table([560, 2100, 4066, 900, 1400], rowsC),
      p("", { after: 120 }),

      h2("Điều kiện thực hiện"),
      bullet("Hạng mục 10 (cổng thanh toán) yêu cầu khách hàng cung cấp tài khoản PayPal Business và khóa API. Đơn vị thi công không tạo và không lưu giữ thông tin tài chính thay khách hàng."),
      bullet("Hạng mục 11 (gửi email) cần khách hàng cung cấp tài khoản email dịch vụ hoặc cho phép đăng ký mới."),
      bullet("Thời gian thực hiện dự kiến 6 đến 8 tuần nếu triển khai toàn bộ, có thể tách thành nhiều đợt nhỏ theo thứ tự ưu tiên."),
      bullet("Báo giá chưa bao gồm chi phí tên miền, máy chủ và các dịch vụ bên thứ ba phát sinh hàng tháng."),
      new Paragraph({ spacing: { after: 200 }, children: [] }),

      h2("Đề xuất thứ tự ưu tiên"),
      p("Nếu cần chia nhỏ ngân sách, đề xuất triển khai theo ba đợt:", { after: 100 }),
      bullet("Đợt 1 - Bán hàng được đầy đủ: hạng mục 8 (giỏ hàng), 10 (cổng thanh toán), 11 (gửi email), 7 (vận chuyển và thuế). Đây là nhóm ảnh hưởng trực tiếp tới doanh thu."),
      bullet("Đợt 2 - Chủ shop tự vận hành: hạng mục 2, 3, 4, 5, 13, 14. Nhóm này giúp thay đổi nội dung và bố cục mà không cần lập trình viên."),
      bullet("Đợt 3 - Mở rộng và hoàn thiện: hạng mục 1 (đa tiền tệ), 6, 9, 12, 15."),
      new Paragraph({ spacing: { after: 240 }, children: [] }),

      p(NOTE_PRICES, { italics: true, color: "7A7266" }),
    ],
  }],
});

const outDir = path.join(__dirname);
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "AURA-CO_Bao-cao-tinh-nang-va-Bao-gia.docx");
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log("WROTE " + out);
});
