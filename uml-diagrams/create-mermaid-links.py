#!/usr/bin/env python3
"""
Script chuyển đổi Markdown chứa Mermaid sang Mermaid Live URL
Không cần cài mermaid-cli, chỉ dùng online service
"""

import os
import json
import urllib.parse
from pathlib import Path

def extract_mermaid_code(md_file):
    """Trích xuất mermaid code từ markdown"""
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Tìm ```mermaid ... ```
    if '```mermaid' not in content:
        return None
    
    start = content.find('```mermaid') + 10
    end = content.find('```', start)
    
    return content[start:end].strip()

def create_mermaid_live_url(mermaid_code):
    """Tạo Mermaid Live URL từ code"""
    # Encode mermaid code để dùng trong URL
    encoded = urllib.parse.quote(mermaid_code)
    return f"https://mermaid.live/edit#pako:{encoded}"

def main():
    """Main function"""
    
    diagram_files = [
        '02-usecase-tong-quat.md',
        '03-usecase-chi-tiet.md',
        '04-activity-diagram.md',
        '05-sequence-diagram.md',
        '06-class-diagram.md',
        '08-deployment-diagram.md'
    ]
    
    print("📊 Mermaid Diagram Live Links")
    print("=" * 70)
    print()
    
    links_file = Path('MERMAID_LIVE_LINKS.txt')
    
    with open(links_file, 'w', encoding='utf-8') as f:
        f.write("🔗 Các liên kết Mermaid Live\n")
        f.write("=" * 70 + "\n\n")
        
        for diagram_file in diagram_files:
            file_path = Path(diagram_file)
            
            if file_path.exists():
                print(f"📄 {diagram_file}")
                mermaid_code = extract_mermaid_code(str(file_path))
                
                if mermaid_code:
                    url = create_mermaid_live_url(mermaid_code)
                    
                    # In một phần URL (vì nó rất dài)
                    print(f"   ✅ Extracted {len(mermaid_code)} characters")
                    print(f"   🔗 https://mermaid.live")
                    print()
                    
                    # Lưu vào file
                    f.write(f"## {diagram_file}\n")
                    f.write(f"Link: {url}\n\n")
                else:
                    print(f"   ❌ Không tìm thấy mermaid code\n")
    
    print("=" * 70)
    print(f"✅ Đã tạo: {links_file}")
    print()
    print("🎯 Cách sử dụng:")
    print("1. Mở file MERMAID_LIVE_LINKS.txt")
    print("2. Copy URL")
    print("3. Dán vào trình duyệt")
    print("4. Xem biểu đồ interactively!")
    print()
    print("💡 Hoặc sử dụng Mermaid Live trực tiếp:")
    print("   https://mermaid.live")
    print("   Copy-paste mermaid code vào editor")

if __name__ == '__main__':
    main()
