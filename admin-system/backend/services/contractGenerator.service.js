/**
 * Contract Generation Service
 * Based on Vietnamese Labor Code 2019 and Bilingual requirements.
 */

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

const numberToVietnameseWords = (number) => {
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const units_en = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  
  // This is a very simplified version for common salary ranges (millions)
  if (number >= 1000000 && number < 100000000) {
    const millions = Math.floor(number / 1000000);
    const vn = `${millions} triệu đồng`;
    const en = `${millions} million VND`;
    return `${number.toLocaleString()} VND (${vn} / ${en})`;
  }
  
  return `${number.toLocaleString()} VND`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  return `${day}/${month}/${year} (ngày ${day} tháng ${month} năm ${year} / ${monthNames[date.getMonth()]} ${day}, ${year})`;
};

const generateMarkdownContract = (data) => {
  const warnings = [];

  // Validation
  if (data.compensation.basic_salary < 4960000) {
    warnings.push('Mức lương cơ bản thấp hơn mức lương tối thiểu vùng 1 (4,960,000 VND). / Basic salary is below regional minimum wage.');
  }
  if (data.contract_type === 'fixed_term' && (!data.job.end_date)) {
    warnings.push('Hợp đồng xác định thời hạn phải có ngày kết thúc. / Fixed-term contract must have an end date.');
  }
  if (data.employee.id_number.length !== 9 && data.employee.id_number.length !== 12) {
    warnings.push('Số định danh cá nhân phải là 9 hoặc 12 số. / ID number must be 9 or 12 digits.');
  }

  let markdown = `---
contract_number: ${data.metadata.contract_number}
contract_type: ${data.contract_type}
status: ${data.status || 'Draft'}
generated_at: ${new Date().toISOString()}
---

`;

  if (data.status === 'Draft' || !data.status) {
    markdown += `> **DỰ THẢO / DRAFT DOCUMENT**\n> *Văn bản này chưa có giá trị pháp lý cho đến khi được ký kết.* / *This document is not legally binding until signed.*\n\n`;
  }

  if (warnings.length > 0) {
    markdown += `> ⚠️ **Cảnh báo / Warning:**\n`;
    warnings.forEach(w => {
      markdown += `> - ${w}\n`;
    });
    markdown += `\n`;
  }

  markdown += `# HỢP ĐỒNG LAO ĐỘNG / EMPLOYMENT CONTRACT
## Số / No.: ${data.metadata.contract_number}

---

## BÊN A — NGƯỜI SỬ DỤNG LAO ĐỘNG / PARTY A — EMPLOYER

| | |
|---|---|
| **Tên công ty / Company name** | ${data.company.name} / ${data.company.name_en} |
| **Địa chỉ / Address** | ${data.company.address} |
| **Mã số thuế / Tax code** | ${data.company.tax_code} |
| **Đại diện bởi / Represented by** | ${data.company.representative} / ${data.company.representative_en} |
| **Chức vụ / Position** | ${data.company.position} / ${data.company.position_en} |

---

## BÊN B — NGƯỜI LAO ĐỘNG / PARTY B — EMPLOYEE

| | |
|---|---|
| **Họ và tên / Full name** | ${data.employee.full_name} / ${data.employee.full_name_en} |
| **Ngày sinh / Date of birth** | ${data.employee.dob} |
| **Giới tính / Gender** | ${data.employee.gender} |
| **Số CCCD / ID No.** | ${data.employee.id_number} |
| **Ngày cấp / Issued date** | ${data.employee.id_issued_date} |
| **Nơi cấp / Issued place** | ${data.employee.id_issued_place} |
| **Địa chỉ / Address** | ${data.employee.permanent_address} |
| **Điện thoại / Phone** | ${data.employee.phone} |

---

## ĐIỀU 1 — LOẠI HỢP ĐỒNG VÀ THỜI HẠN / ARTICLE 1 — CONTRACT TYPE AND TERM

- Loại hợp đồng / Contract type: ${data.contract_type === 'probation' ? 'Thử việc / Probation' : data.contract_type === 'fixed_term' ? 'Xác định thời hạn / Fixed-term' : 'Không xác định thời hạn / Indefinite'}
- Ngày bắt đầu / Start date: ${formatDate(data.job.start_date)}
${data.job.end_date ? `- Ngày kết thúc / End date: ${formatDate(data.job.end_date)}` : ''}

## ĐIỀU 2 — CÔNG VIỆC VÀ ĐỊA ĐIỂM / ARTICLE 2 — JOB AND WORKPLACE

- Chức danh / Job title: ${data.job.title} / ${data.job.title_en}
- Bộ phận / Department: ${data.job.department} / ${data.job.department_en}
- Địa điểm làm việc / Workplace: ${data.job.workplace} / ${data.job.workplace_en}

## ĐIỀU 3 — THỜI GIỜ LÀM VIỆC / ARTICLE 3 — WORKING HOURS

- Giờ làm việc / Working hours: ${data.job.working_hours}
- Ngày làm việc / Working days: ${data.job.working_days}

## ĐIỀU 4 — LƯƠNG VÀ PHỤ CẤP / ARTICLE 4 — SALARY AND ALLOWANCES

- Lương cơ bản / Basic salary: ${numberToVietnameseWords(data.compensation.basic_salary)}
- Phụ cấp chức vụ / Position allowance: ${formatVND(data.compensation.position_allowance)}
- Phụ cấp ăn trưa / Meal allowance: ${formatVND(data.compensation.meal_allowance)}
- Hình thức trả lương / Payment method: ${data.compensation.payment_method}
- Ngày trả lương / Payment date: ${data.compensation.payment_date}

## ĐIỀU 5 — BẢO HIỂM XÃ HỘI / ARTICLE 5 — SOCIAL INSURANCE

${data.compensation.social_insurance ? 
  'Bên A đóng bảo hiểm xã hội cho Bên B theo quy định của pháp luật. / Party A shall pay social insurance for Party B as per law.' : 
  'Hợp đồng này không bao gồm bảo hiểm xã hội (theo loại hình hợp đồng). / This contract does not include social insurance (based on contract type).'}

## ĐIỀU 6 — CHẾ ĐỘ NGHỈ NGƠI / ARTICLE 6 — LEAVE ENTITLEMENTS

- Nghỉ phép năm / Annual leave: ${data.terms.annual_leave_days} ngày/năm (days/year).
- Nghỉ lễ, tết theo quy định / Public holidays as per labor law.

## ĐIỀU 7 — NGHĨA VỤ CÁC BÊN / ARTICLE 7 — OBLIGATIONS OF PARTIES

Các bên cam kết thực hiện đúng các điều khoản trong hợp đồng này và quy định của Bộ luật Lao động 2019. / Both parties commit to complying with the terms of this contract and the provisions of the 2019 Labor Code.

${data.terms.confidentiality ? `
## ĐIỀU 8 — ĐIỀU KHOẢN BÍ MẬT / ARTICLE 8 — CONFIDENTIALITY

Bên B cam kết giữ bí mật thông tin kinh doanh của Bên A. / Party B commits to keeping Party A's business information confidential.
` : ''}

${data.terms.non_compete ? `
## ĐIỀU 9 — ĐIỀU KHOẢN KHÔNG CẠNH TRANH / ARTICLE 9 — NON-COMPETE

Bên B không làm việc cho đối thủ cạnh tranh trong vòng ${data.terms.non_compete_months} tháng sau khi nghỉ việc. / Party B shall not work for competitors for ${data.terms.non_compete_months} months after termination.
` : ''}

## ĐIỀU 10 — CHẤM DỨT HỢP ĐỒNG / ARTICLE 10 — TERMINATION

Theo quy định của Bộ luật Lao động 2019. Thời gian báo trước: ${data.terms.notice_period_days} ngày. / As per Labor Code 2019. Notice period: ${data.terms.notice_period_days} days.

## ĐIỀU 11 — GIẢI QUYẾT TRANH CHẤP / ARTICLE 11 — DISPUTE RESOLUTION

Mọi tranh chấp sẽ được giải quyết thông qua thương lượng hoặc tại Tòa án có thẩm quyền. / Any dispute shall be resolved through negotiation or at the competent Court.

## ĐIỀU 12 — ĐIỀU KHOẢN CHUNG / ARTICLE 12 — GENERAL PROVISIONS

Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau. / This contract is made in 02 copies with equal legal validity.

${(data.terms.additional_clauses || []).map((clause, idx) => `
### Phụ lục ${idx + 1} / Addendum ${idx + 1}
${clause}
`).join('\n')}

---

## CHỮ KÝ / SIGNATURES

Lập tại / Made at: ${data.metadata.signed_place}, ngày / date ${data.metadata.signed_date}

| BÊN A / PARTY A | BÊN B / PARTY B |
|:---:|:---:|
| *(Ký, đóng dấu / Signature & Seal)* | *(Ký / Signature)* |
| | |
| **${data.company.representative}** | **${data.employee.full_name}** |
| ${data.company.position} | ${data.job.title} |
`;

  return markdown;
};

module.exports = {
  generateMarkdownContract
};
