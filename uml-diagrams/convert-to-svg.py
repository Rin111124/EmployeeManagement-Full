#!/usr/bin/env python3
"""
Script chuyển đổi Mermaid diagrams sang SVG/PNG
Yêu cầu: npm install -g @mermaid-js/mermaid-cli
"""

import os
import subprocess
import sys
from pathlib import Path

def convert_mermaid_to_svg(md_file):
    """Chuyển đổi file markdown chứa mermaid diagram sang SVG"""
    
    # Kiểm tra file tồn tại
    if not Path(md_file).exists():
        print(f"❌ File không tồn tại: {md_file}")
        return False
    
    # Tạo tên output file
    output_file = md_file.replace('.md', '.svg')
    
    try:
        # Sử dụng mermaid-cli để chuyển đổi
        cmd = ['mmdc', '-i', md_file, '-o', output_file]
        print(f"🔄 Chuyển đổi: {md_file} → {output_file}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print(f"✅ Thành công: {output_file}")
            return True
        else:
            print(f"❌ Lỗi: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ mermaid-cli không được cài đặt!")
        print("Cài đặt: npm install -g @mermaid-js/mermaid-cli")
        return False
    except subprocess.TimeoutExpired:
        print(f"⏱️ Timeout khi xử lý {md_file}")
        return False
    except Exception as e:
        print(f"❌ Lỗi không xác định: {e}")
        return False

def main():
    """Chuyển đổi tất cả file markdown chứa mermaid"""
    
    diagram_files = [
        '02-usecase-tong-quat.md',
        '03-usecase-chi-tiet.md',
        '04-activity-diagram.md',
        '05-sequence-diagram.md',
        '06-class-diagram.md',
        '08-deployment-diagram.md'
    ]
    
    # Tạo thư mục output nếu chưa tồn tại
    svg_dir = Path('uml-diagrams/images')
    svg_dir.mkdir(parents=True, exist_ok=True)
    
    print("🚀 Bắt đầu chuyển đổi Mermaid diagrams...")
    print("-" * 50)
    
    success_count = 0
    for diagram_file in diagram_files:
        file_path = Path('uml-diagrams') / diagram_file
        
        if file_path.exists():
            output_path = svg_dir / diagram_file.replace('.md', '.svg')
            
            # Chuyển đổi
            md_content = file_path.read_text(encoding='utf-8')
            
            # Trích xuất mermaid code từ markdown
            if '```mermaid' in md_content:
                try:
                    start_idx = md_content.find('```mermaid') + 10
                    end_idx = md_content.find('```', start_idx)
                    mermaid_code = md_content[start_idx:end_idx].strip()
                    
                    # Lưu mermaid code tạm thời
                    temp_mermaid = f'temp_{diagram_file.replace(\".md\", \".mmd\")}'
                    with open(temp_mermaid, 'w', encoding='utf-8') as f:
                        f.write(mermaid_code)
                    
                    # Chuyển đổi sang SVG
                    cmd = ['mmdc', '-i', temp_mermaid, '-o', str(output_path)]
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                    
                    if result.returncode == 0:
                        print(f"✅ {diagram_file} → {output_path.name}")
                        success_count += 1
                    else:
                        print(f"❌ Lỗi chuyển đổi {diagram_file}: {result.stderr}")
                    
                    # Xóa file tạm
                    Path(temp_mermaid).unlink()
                    
                except Exception as e:
                    print(f"❌ Lỗi xử lý {diagram_file}: {e}")
    
    print("-" * 50)
    print(f"✨ Hoàn thành: {success_count}/{len(diagram_files)} file")
    print(f"📁 Ảnh được lưu tại: {svg_dir}")

if __name__ == '__main__':
    main()
