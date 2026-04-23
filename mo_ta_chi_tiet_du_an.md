# TÀI LIỆU MÔ TẢ CHI TIẾT DỰ ÁN
**Tên dự án:** Security Academy Blockchain Ledger (Hệ thống Quản lý và Xét duyệt bảng điểm bằng Blockchain)

---

## 1. Giới thiệu chung (Overview)
- **Mục đích:** Dự án hướng tới việc số hóa quá trình cấp phát, lưu trữ, tra cứu và xác minh bảng điểm của sinh viên bằng công nghệ Blockchain, đồng thời tuân thủ theo lý thuyết kiến trúc của MIT Blockcerts.
- **Vấn đề giải quyết:** Ngăn chặn tuyệt đối vấn nạn làm giả bằng cấp, chỉnh sửa điểm số trái phép. Hệ thống trả quyền kiểm soát hồ sơ học thuật về cho sinh viên (bằng chứng chỉ file JSON số hóa) và cho phép bên thứ ba (nhà tuyển dụng, trường liên kết) có thể tự truy xuất và xác minh trực tiếp điểm số thật/giả mà không cần liên hệ trung gian với trường quản lý.

## 2. Kiến trúc Hệ thống (System Architecture)
Dự án được xây dựng theo mô hình Client-Server kết hợp Mạng Blockchain nội bộ chuyên dụng.
- **Frontend (Giao diện người dùng):** Xây dựng bằng **ReactJS** (đóng gói bằng Vite), sử dụng **TailwindCSS** kết hợp với `framer-motion` cho trải nghiệm Web App mượt mà, phản hồi siêu tốc. Tích hợp `html5-qrcode` & `html2pdf` cho các chức năng QR và tải về.
- **Backend (Máy chủ và Node lõi):** Xây dựng bằng **NodeJS / ExpressJS**, quản lý cơ sở dữ liệu nội bộ nhẹ bằng **SQLite**. Tại đây, backend cũng đồng thời đảm nhiệm vai trò hoạt động như một node mạng lưu trữ sổ cái (Ledger).

## 3. Công nghệ cốt lõi và Tính bảo mật
- **Ký số bất đối xứng (Public-key Cryptography):** Thông qua `KeyService.js`, hệ thống sinh ra một cặp khóa (Private/Public Key). Nhà trường (Admin) dùng Khóa Bí mật để "Ký số" cho bảng điểm. Người xem (nhà tuyển dụng) có thể dùng Khóa Công khai để đối chiếu và xác thực chữ ký này (chống chối bỏ).
- **Hàm Băm (Hash Function - SHA256):** Toàn bộ dữ liệu điểm của mỗi môn học được băm (hash) bằng thư viện `crypto-js`. Mọi sự thay đổi (dù chỉ là 0.1 điểm) trên bản ghi nội bộ cũng sẽ làm sai lệch mã băm này, làm cho chứng chỉ trên tay sinh viên trở thành vô giá trị ngay lập tức nếu bị chỉnh sửa.
- **Cấu trúc JSON MIT Blockcerts:** File bảng điểm được cấp cho sinh viên không phải là PDF đơn thuần mà là một file JSON (Payload) chứa toàn bộ điểm chi tiết, kèm theo metadata và chuỗi chữ ký điện tử bảo mật (Signature).

---

## 4. Các luồng chức năng chi tiết (Features Breakdown)

### 4.1. Phân hệ Dành cho Sinh viên / Bên thứ 3 (Public Features)
* **Tra cứu Bảng điểm (Lookup Module):**
  * Sinh viên nhập mã định danh (Ví dụ: Mã sinh viên) để xem chi tiết điểm các môn học (Chuyên cần, Bài tập, Giữa kỳ, Cuối kỳ, Tổng kết...).
  * Cho phép hiển thị QR code tham chiếu liên kết nhanh.
  * Tải "Bảng điểm JSON số hóa": Đây là trọng tâm dự án. Bảng điểm tải xuống chứa đầy đủ chữ ký số không thể giả mạo.

* **Trình Xác minh Độc lập (Universal Verifier):**
  * Nơi diễn ra sự kỳ diệu của Blockchain. Quý vị (nhà tuyển dụng) có thể kéo thả (Drag and drop) file JSON sinh viên vừa nộp vào giao diện này.
  * Ngay lập tức thuật toán tại frontend đọc file -> Gửi truy vấn mã hash lên mạng Blockchain backend để đối chiếu -> Giải mã chữ ký.
  * *Kết quả trả về:*
    * **Authentic (Hợp lệ):** Dữ liệu chuẩn xác, do chính học viện phát hành.
    * **Tampered (Bị giả mạo):** Dữ liệu JSON đã bị sinh viên âm thầm sửa điểm.
    * **Revoked (Bị thu hồi):** Bảng điểm đã từng được phát hành nhưng vì lỗi/nhầm lẫn mà điểm này đã bị học viện cập nhật đính chính trên hệ thống bằng phiên bản khác.

* **Trình duyệt Khối (Blockchain Explorer):**
  * Cửa sổ theo dõi mạng lưới: Cho phép bất cứ ai cũng có thể xem trực tiếp cấu trúc của Blockchain bao gồm các Block, mã Hash hiện tại (Current), mã Hash kết nối block trước đó (Previous), Thời gian tạo (Timestamp) nhằm công khai tính minh bạch của toàn bộ hệ thống lưu trữ sinh viên.

### 4.2. Phân hệ Dành cho Quản trị viên (Admin Dashboard)
* **Bảo mật và Xác thực:** Yêu cầu quyền admin thông qua cơ chế Authorization bằng JSON Web Tokens (JWT).
* **Phát hành Chứng chỉ (Issuance):** 
  * Ghi nhận dữ liệu sinh viên. Khi hoàn tất, một giao dịch (Transaction) sinh ra, niêm phong khóa bảo mật và tiến hành đóng thành một Block mới đưa lên mạng (`BlockchainService.js`).
* **Thu hồi Chứng chỉ (Revocation Registry):** 
  * Hệ thống cho phép "Thu hồi" những kết quả bị tính toán nhầm. Chức năng này tạo một Transaction mới công bố việc rút bỏ hiệu lực các mã hash cũ thay vì xóa/chỉnh sửa trực tiếp dữ liệu (nhằm tôn trọng triết lý bất biến của Blockchain). 

---

## 5. Quy trình / Vị trí Tương tác Dữ liệu (Data Flow)
1. **Lưu trữ (Admin):** Admin nhập/sửa điểm -> Backend mã hóa điểm sinh viên và Ký điện tử -> Backend xếp gói điểm đó vào 1 Block mới.
2. **Cấp phát (Tự động):** Block hòa vào mạng Blockchain chính.
3. **Sở hữu (Sinh viên):** Sinh viên truy cập Frontend -> Chọn xuất file `.json` -> Tải file JSON mật mã về USB / thiết bị cá nhân.
4. **Tuyển dụng (Nhà Tuyển dụng):** Nhận file từ sinh viên -> Truy cập Frontend (mục Verifier) -> Kéo thả JSON vào Verifier -> Nhận kết quả xác suất làm giả = 0%.

## 6. Hướng phát triển và mở rộng trong tương lai
- **Lưu trữ Phi tập trung (Decentralized Storage):** Kết hợp nền tảng IPFS để xử lý thêm các văn bằng chứng chỉ dạng hình ảnh, PDF dung lượng lớn đính kèm.
- **Peer-to-Peer Consurtium:** Nâng cấp hệ thống Backend để chấp nhận nhiều Node máy chủ. Ví dụ: Các học viện hay các trường Đại học quốc gia có thể lập thành một mạng (Consortium) chạy song song nhau. Khi một Node sập mạng, dữ liệu sinh viên ở các Node trường ĐH khác vẫn đảm bảo an toàn tuyệt đối.
- **Decentralized Identity (DID):** Cấp danh tính dạng ví Web3 trực tiếp vào hệ thống sinh viên để ký các phản hồi lại cho trường.

=======================================================
Tài liệu cung cấp cái nhìn chi tiết nhất về thành phần cấu thành kiến trúc kỹ thuật cũng như tư duy sản phẩm của "Security Academy Blockchain Ledger".
