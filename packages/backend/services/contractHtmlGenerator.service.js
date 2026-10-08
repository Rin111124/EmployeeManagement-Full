const xss = require('xss');

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeColor = (value) => /^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? value : '#1a3c6e';

const sanitizeContractHtml = (html) => xss(html, {
    whiteList: {
        html: ['lang'],
        head: [],
        meta: ['charset'],
        title: [],
        style: [],
        body: [],
        div: ['class', 'style'],
        span: ['class', 'style'],
        strong: [],
        br: [],
        table: ['class', 'style'],
        tr: ['class', 'style'],
        th: ['class', 'style'],
        td: ['class', 'style'],
        h1: ['class', 'style'],
        footer: ['class', 'style'],
        button: ['class', 'style', 'type'],
    },
    css: false,
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'iframe', 'object', 'embed'],
});

/**
 * Generates a professional, print-ready HTML employment contract.
 * Exact replica of the user's reference file (hop_dong_mau.html).
 */
const generateHtmlContract = (data) => {
    const {
        contract_type,
        company,
        employee,
        job,
        compensation,
        terms,
        metadata,
        status
    } = data;

    // Helper for currency formatting
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0) + ' VND';

    // Helper for date formatting
    const formatDate = (dateStr) => {
        if (!dateStr) return '.../.../...';
        const d = new Date(dateStr);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return { day, month, year };
    };

    const startDateObj = formatDate(job.start_date);
    const endDateObj = job.end_date ? formatDate(job.end_date) : null;
    const signedDateObj = formatDate(metadata.signed_date);

    const brandColor = safeColor(company.brand_color);
    const totalCompensation = (compensation.basic_salary || 0) + 
                             (compensation.position_allowance || 0) + 
                             (compensation.meal_allowance || 0) + 
                             (compensation.transport_allowance || 0);

    const typeLabels = {
        probation: 'THỬ VIỆC / PROBATION',
        fixed_term: 'XÁC ĐỊNH THỜI HẠN / FIXED-TERM',
        indefinite: 'KHÔNG XÁC ĐỊNH THỜI HẠN / INDEFINITE',
        freelance: 'TỰ DO / FREELANCE'
    };

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hợp đồng ${metadata.contract_number} — ${employee.full_name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 20mm 18mm 20mm;
    }
    @media print {
      .no-print { display: none; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: avoid; }
      .no-break { page-break-inside: avoid; }
    }
    @media screen {
      body { background: #f0f2f5; margin: 0; padding: 0; }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 20px auto;
        background: white;
        padding: 18mm 20mm;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        box-sizing: border-box;
      }
    }
    body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; color: #000; }
    
    /* Header & Branding */
    .national-heading { text-align: center; margin-bottom: 20pt; }
    .national-heading .country { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2pt; }
    .national-heading .motto { font-size: 11pt; font-weight: bold; margin-bottom: 4pt; }
    .national-heading .border-line { width: 140pt; height: 1pt; background: #000; margin: 0 auto; }

    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15pt; }
    .company-info { font-size: 10pt; line-height: 1.3; }
    .company-info strong { color: ${brandColor}; }

    .doc-title { text-align: center; margin: 20pt 0; }
    .doc-title h1 { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
    .doc-title .contract-no { font-size: 11pt; margin-top: 5pt; font-style: italic; }

    /* Content Sections */
    .section-heading { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 15pt 0 8pt; border-bottom: 1pt solid #ddd; padding-bottom: 2pt; }
    .parties-table { width: 100%; border-collapse: collapse; margin-bottom: 10pt; }
    .parties-table td { padding: 3pt 0; vertical-align: top; font-size: 11.5pt; }
    .parties-table td:first-child { width: 180pt; font-weight: bold; }

    .article { margin-bottom: 12pt; }
    .clause { font-size: 11.5pt; margin-top: 5pt; text-align: justify; }
    .clause-en { font-size: 10.5pt; font-style: italic; color: #444; margin-top: 2pt; margin-bottom: 5pt; text-align: justify; }
    
    .salary-table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
    .salary-table th { border: 0.5pt solid #000; padding: 6pt; background: #f5f5f5; text-align: center; font-size: 10pt; }
    .salary-table td { border: 0.5pt solid #000; padding: 6pt; text-align: left; font-size: 11pt; }
    .salary-table .amount-col { text-align: right; width: 100pt; }

    /* Signature Section */
    .signature-section { margin-top: 30pt; page-break-inside: avoid; }
    .signed-line { text-align: right; font-style: italic; margin-bottom: 15pt; font-size: 11pt; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20pt; }
    .sig-party { text-align: center; }
    .sig-role { font-weight: bold; font-size: 11pt; text-transform: uppercase; }
    .sig-instruction { font-size: 9.5pt; font-style: italic; margin: 5pt 0 60pt; color: #555; }
    .sig-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; }
    .sig-title-line { font-size: 10pt; color: #444; }

    /* Footer */
    .doc-footer { margin-top: 20pt; border-top: 0.5pt solid #ccc; padding-top: 5pt; display: flex; justify-content: space-between; font-size: 8.5pt; color: #777; }
    
    /* Draft Overlay */
    .draft-overlay { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100pt; color: rgba(0,0,0,0.03); font-weight: bold; pointer-events: none; z-index: -1; white-space: nowrap; }
    
    .print-btn { position: fixed; bottom: 30px; right: 30px; padding: 12px 24px; background: ${brandColor}; color: white; border: none; border-radius: 50px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 1000; display: flex; align-items: center; gap: 8px; }
    .print-btn:hover { transform: scale(1.05); transition: 0.2s; }
  </style>
</head>
<body>
  ${status !== 'Signed' ? '<div class="draft-overlay">DỰ THẢO / DRAFT</div>' : ''}
  
  <button class="print-btn no-print" onclick="window.print()">
    <span>🖨️</span> IN HỢP ĐỒNG / PRINT CONTRACT
  </button>

  <div class="page">
    <div class="national-heading">
      <div class="country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
      <div class="border-line"></div>
    </div>

    <div class="doc-header">
      <div class="company-info">
        <strong>${company.name}</strong><br>
        Địa chỉ: ${company.address}<br>
        MST: ${company.tax_code} | ĐT: ${company.phone || '...'}
      </div>
    </div>

    <div class="doc-title">
      <h1>HỢP ĐỒNG LAO ĐỘNG</h1>
      <div class="contract-no">Số: ${metadata.contract_number}</div>
    </div>

    <div class="clause">Chúng tôi, một bên là Bà/Ông: <strong>${company.representative}</strong></div>
    <div class="clause-en">We, on one side, Mr/Ms: ${company.representative_en}</div>
    <div class="clause">Chức vụ: <strong>${company.position}</strong> đại diện cho <strong>${company.name}</strong></div>
    <div class="clause-en">Position: ${company.position_en} representing ${company.name_en}</div>
    
    <div class="clause" style="margin-top:10pt;">Và một bên là Bà/Ông: <strong>${employee.full_name}</strong></div>
    <div class="clause-en">And on the other side, Mr/Ms: ${employee.full_name_en}</div>
    <div class="clause">Ngày sinh: ${employee.dob} | CCCD số: ${employee.id_number}</div>
    <div class="clause-en">Date of birth: ${employee.dob} | ID No: ${employee.id_number}</div>
    <div class="clause">Địa chỉ: ${employee.permanent_address}</div>
    <div class="clause-en">Address: ${employee.permanent_address}</div>

    <div class="clause" style="margin-top:15pt;">Cùng thỏa thuận ký kết hợp đồng lao động này với các điều khoản sau đây:</div>
    <div class="clause-en">Hereby agree to enter into this employment contract with the following terms and conditions:</div>

    <div class="article">
      <div class="section-heading">Điều 1: Thời hạn và công việc / Article 1: Term and Job</div>
      <div class="clause">1.1. Loại hợp đồng: <strong>${typeLabels[contract_type] || contract_type}</strong></div>
      <div class="clause-en">Contract type: ${typeLabels[contract_type] || contract_type}</div>
      <div class="clause">1.2. Thời hạn: Từ ngày <strong>${startDateObj.day}/${startDateObj.month}/${startDateObj.year}</strong> ${endDateObj ? `đến ngày <strong>${endDateObj.day}/${endDateObj.month}/${endDateObj.year}</strong>` : 'vô thời hạn'}.</div>
      <div class="clause-en">Term: From ${startDateObj.day}/${startDateObj.month}/${startDateObj.year} ${endDateObj ? `to ${endDateObj.day}/${endDateObj.month}/${endDateObj.year}` : 'indefinite'}.</div>
      <div class="clause">1.3. Thử việc: ${job.probation_months} tháng.</div>
      <div class="clause-en">Probation: ${job.probation_months} months.</div>
    </div>

    <div class="article">
      <div class="section-heading">Điều 2: Địa điểm và mô tả / Article 2: Workplace and Duties</div>
      <div class="clause">2.1. Địa điểm làm việc: ${job.workplace}</div>
      <div class="clause-en">Workplace: ${job.workplace}</div>
      <div class="clause">2.2. Chức danh: ${job.title} - Bộ phận: ${job.department}</div>
      <div class="clause-en">Title: ${job.title_en} - Department: ${job.department_en}</div>
    </div>

    <div class="article">
      <div class="section-heading">Điều 3: Tiền lương và phụ cấp / Article 3: Salary and Allowances</div>
      <table class="salary-table">
        <tr>
          <th>Khoản mục / Items</th>
          <th>Số tiền / Amount (VND)</th>
          <th>Ghi chú / Notes</th>
        </tr>
        <tr>
          <td>Lương cơ bản / Basic Salary</td>
          <td class="amount-col">${formatCurrency(compensation.basic_salary)}</td>
          <td>${compensation.basic_salary_words_vi}</td>
        </tr>
        ${compensation.meal_allowance ? `<tr><td>Phụ cấp ăn trưa / Meal Allowance</td><td class="amount-col">${formatCurrency(compensation.meal_allowance)}</td><td>Tax-exempt</td></tr>` : ''}
        ${compensation.position_allowance ? `<tr><td>Phụ cấp chức vụ / Position Allowance</td><td class="amount-col">${formatCurrency(compensation.position_allowance)}</td><td></td></tr>` : ''}
        <tr style="font-weight:bold;">
          <td>Tổng cộng / Total</td>
          <td class="amount-col">${formatCurrency(totalCompensation)}</td>
          <td></td>
        </tr>
      </table>
      <div class="clause">3.1. Hình thức trả lương: ${compensation.payment_method}</div>
      <div class="clause-en">Payment method: ${compensation.payment_method}</div>
    </div>

    <div class="signature-section">
      <div class="signed-line">
        Lập tại / Made at: <strong>${metadata.signed_place || 'Hà Nội'}</strong>, ngày <strong>${signedDateObj.day}</strong> tháng <strong>${signedDateObj.month}</strong> năm <strong>${signedDateObj.year}</strong>
      </div>
      <div class="sig-grid">
        <div class="sig-party">
          <div class="sig-role">Bên A - Người sử dụng lao động</div>
          <div class="sig-role" style="font-weight:normal;font-size:10pt;">Party A - Employer</div>
          <div class="sig-instruction">(Ký tên, đóng dấu / Signature & Company Seal)</div>
          <div class="sig-name">${company.representative}</div>
          <div class="sig-title-line">${company.position}</div>
        </div>
        <div class="sig-party">
          <div class="sig-role">Bên B - Người lao động</div>
          <div class="sig-role" style="font-weight:normal;font-size:10pt;">Party B - Employee</div>
          <div class="sig-instruction">(Ký và ghi rõ họ tên / Signature & Full Name)</div>
          <div class="sig-name">${employee.full_name}</div>
          <div class="sig-title-line">${job.title}</div>
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <span>${company.name} — ${company.address}</span>
      <span>Số: ${metadata.contract_number}</span>
      <span>Trang 1 / 1</span>
    </footer>
  </div>
</body>
</html>`;

    return sanitizeContractHtml(html);
};

const applyTemplate = (templateHtml, data) => {
    let html = templateHtml;
    
    // Flatten data for easier replacement
    const flatData = {
        'CONTRACT_NUMBER': data.metadata.contract_number,
        'SIGNED_DATE': new Date(data.metadata.signed_date).toLocaleDateString('vi-VN'),
        'SIGNED_PLACE': data.metadata.signed_place,
        
        'COMPANY_NAME': data.company.name,
        'COMPANY_NAME_EN': data.company.name_en,
        'COMPANY_ADDRESS': data.company.address,
        'COMPANY_TAX_CODE': data.company.tax_code,
        'COMPANY_REPRESENTATIVE': data.company.representative,
        'COMPANY_POSITION': data.company.position,
        
        'EMPLOYEE_NAME': data.employee.full_name,
        'EMPLOYEE_NAME_EN': data.employee.full_name_en,
        'EMPLOYEE_DOB': data.employee.dob,
        'EMPLOYEE_ID': data.employee.id_number,
        'EMPLOYEE_ADDRESS': data.employee.permanent_address,
        
        'JOB_TITLE': data.job.title,
        'JOB_TITLE_EN': data.job.title_en,
        'DEPARTMENT': data.job.department,
        'START_DATE': new Date(data.job.start_date).toLocaleDateString('vi-VN'),
        'END_DATE': data.job.end_date ? new Date(data.job.end_date).toLocaleDateString('vi-VN') : 'vô thời hạn / indefinite',
        
        'BASE_SALARY': new Intl.NumberFormat('vi-VN').format(data.compensation.basic_salary) + ' VND',
        'BASE_SALARY_WORDS': data.compensation.basic_salary_words_vi,
    };

    // Replace placeholders like {{EMPLOYEE_NAME}}
    Object.entries(flatData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, escapeHtml(value || '...'));
    });

    return sanitizeContractHtml(html);
};

module.exports = {
    generateHtmlContract,
    applyTemplate,
    escapeHtml,
    sanitizeContractHtml,
};
