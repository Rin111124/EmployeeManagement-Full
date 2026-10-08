
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ContractTemplate = require('../models/contractTemplate');

const templates = [
    {
        name: 'Hợp đồng Thử việc (Chuẩn)',
        description: 'Mẫu hợp đồng dùng cho nhân viên trong thời gian thử việc (1-2 tháng).',
        contract_type_match: 'Probation',
        is_default: true,
        html_content: `
            <div style="font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6;">
                <div style="text-align: center; font-weight: bold; text-transform: uppercase;">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
                    Độc lập - Tự do - Hạnh phúc<br>
                    ------------------
                </div>
                <h1 style="text-align: center; margin-top: 30px;">HỢP ĐỒNG THỬ VIỆC</h1>
                <p style="text-align: center; font-style: italic;">Số: {{CONTRACT_NUMBER}}</p>
                
                <p>Chúng tôi, một bên là Bà/Ông: <strong>{{COMPANY_REPRESENTATIVE}}</strong></p>
                <p>Đại diện cho: <strong>{{COMPANY_NAME}}</strong></p>
                <p>Địa chỉ: {{COMPANY_ADDRESS}}</p>
                
                <p>Và một bên là Bà/Ông: <strong>{{EMPLOYEE_NAME}}</strong></p>
                <p>Ngày sinh: {{EMPLOYEE_DOB}} | CCCD số: {{EMPLOYEE_ID}}</p>
                <p>Địa chỉ: {{EMPLOYEE_ADDRESS}}</p>
                
                <p>Cùng thỏa thuận ký kết hợp đồng thử việc với các điều khoản sau:</p>
                
                <h3>Điều 1: Thời hạn và công việc</h3>
                <p>1.1. Thời hạn thử việc: Từ ngày {{START_DATE}} đến ngày {{END_DATE}}.</p>
                <p>1.2. Chức danh chuyên môn: {{JOB_TITLE}} tại bộ phận {{DEPARTMENT}}.</p>
                
                <h3>Điều 2: Tiền lương</h3>
                <p>2.1. Mức lương thử việc: <strong>{{BASE_SALARY}}</strong> (Bằng chữ: {{BASE_SALARY_WORDS}}).</p>
                <p>2.2. Hình thức trả lương: Chuyển khoản ngân hàng.</p>
                
                <h3>Điều 3: Ký tên</h3>
                <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                    <div style="text-align: center; width: 45%;">
                        <strong>NGƯỜI SỬ DỤNG LAO ĐỘNG</strong><br><br><br><br>
                        {{COMPANY_REPRESENTATIVE}}
                    </div>
                    <div style="text-align: center; width: 45%;">
                        <strong>NGƯỜI LAO ĐỘNG</strong><br><br><br><br>
                        {{EMPLOYEE_NAME}}
                    </div>
                </div>
            </div>
        `
    },
    {
        name: 'Hợp đồng Chính thức (Xác định thời hạn)',
        description: 'Mẫu hợp đồng lao động chuẩn 12-36 tháng.',
        contract_type_match: 'Fixed-term',
        is_default: true,
        html_content: `
            <div style="font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6;">
                <div style="text-align: center; font-weight: bold; text-transform: uppercase;">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
                    Độc lập - Tự do - Hạnh phúc<br>
                    ------------------
                </div>
                <h1 style="text-align: center; margin-top: 30px;">HỢP ĐỒNG LAO ĐỘNG</h1>
                <p style="text-align: center; font-style: italic;">Số: {{CONTRACT_NUMBER}}</p>
                
                <p>Bên A (Người sử dụng lao động): <strong>{{COMPANY_NAME}}</strong></p>
                <p>Người đại diện: {{COMPANY_REPRESENTATIVE}} - Chức vụ: {{COMPANY_POSITION}}</p>
                
                <p>Bên B (Người lao động): <strong>{{EMPLOYEE_NAME}}</strong></p>
                <p>CCCD: {{EMPLOYEE_ID}} | Vị trí: {{JOB_TITLE}}</p>
                
                <h3>Điều 1: Thời hạn hợp đồng</h3>
                <p>Hợp đồng có thời hạn xác định từ ngày {{START_DATE}} đến ngày {{END_DATE}}.</p>
                
                <h3>Điều 2: Chế độ tiền lương</h3>
                <p>Mức lương chính: <strong>{{BASE_SALARY}}</strong>. Các khoản phụ cấp khác theo quy định công ty.</p>
                
                <p>Các điều khoản khác thực hiện theo Bộ Luật Lao động 2019.</p>
                
                <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                    <div style="text-align: center; width: 45%;">
                        <strong>ĐẠI DIỆN BÊN A</strong><br><br><br><br>
                        (Ký tên và đóng dấu)
                    </div>
                    <div style="text-align: center; width: 45%;">
                        <strong>NGƯỜI LAO ĐỘNG (BÊN B)</strong><br><br><br><br>
                        {{EMPLOYEE_NAME}}
                    </div>
                </div>
            </div>
        `
    },
    {
        name: 'Hợp đồng Không xác định thời hạn',
        description: 'Dành cho nhân viên gắn bó lâu dài sau khi hoàn thành các hợp đồng xác định thời hạn.',
        contract_type_match: 'Indefinite',
        is_default: false,
        html_content: `
            <div style="font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6;">
                <div style="text-align: center; font-weight: bold; text-transform: uppercase;">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
                    Độc lập - Tự do - Hạnh phúc<br>
                    ------------------
                </div>
                <h1 style="text-align: center; margin-top: 30px;">HỢP ĐỒNG LAO ĐỘNG KHÔNG XÁC ĐỊNH THỜI HẠN</h1>
                <p style="text-align: center; font-style: italic;">Số: {{CONTRACT_NUMBER}}</p>
                
                <p>Đơn vị: <strong>{{COMPANY_NAME}}</strong></p>
                <p>Đại diện: {{COMPANY_REPRESENTATIVE}}</p>
                <p>Nhân viên: <strong>{{EMPLOYEE_NAME}}</strong></p>
                
                <p>Hai bên thỏa thuận ký kết hợp đồng lao động không xác định thời hạn kể từ ngày {{START_DATE}}.</p>
                
                <p>Mức lương: {{BASE_SALARY}}.</p>
                
                <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                    <div style="text-align: center; width: 45%;"><strong>ĐẠI DIỆN CÔNG TY</strong></div>
                    <div style="text-align: center; width: 45%;"><strong>NHÂN VIÊN</strong></div>
                </div>
            </div>
        `
    }
];

async function seedTemplates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Đã kết nối MongoDB.');

        for (const t of templates) {
            await ContractTemplate.findOneAndUpdate(
                { name: t.name },
                t,
                { upsert: true, new: true }
            );
            console.log(`- Đã tạo/cập nhật template: ${t.name}`);
        }

        console.log('\nHOÀN THÀNH TẠO TEMPLATE HỢP ĐỒNG.');
        process.exit(0);
    } catch (err) {
        console.error('Lỗi:', err);
        process.exit(1);
    }
}

seedTemplates();
