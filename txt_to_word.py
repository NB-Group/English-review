#!/usr/bin/env python3
"""
将错题本文本文件转换为 Word 文档
"""

import re
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.enum.section import WD_SECTION_START
import os
import sys

def parse_error_book(file_path):
    """解析错题本文本文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 解析头部信息
    header_match = re.search(r'英语复习助手 - 错题本\n导出时间: (.+)\n总错题数: (\d+)\n未掌握: (\d+)\n已掌握: (\d+)', content)
    if header_match:
        export_time = header_match.group(1)
        total_errors = header_match.group(2)
        unmastered = header_match.group(3)
        mastered = header_match.group(4)
    else:
        export_time = "未知"
        total_errors = "0"
        unmastered = "0"
        mastered = "0"
    
    # 解析单元和错题
    units = []
    unit_pattern = r'【(.+?)】\n-+\n(.*?)(?=\n【|$)'
    unit_matches = re.finditer(unit_pattern, content, re.DOTALL)
    
    for unit_match in unit_matches:
        unit_name = unit_match.group(1)
        unit_content = unit_match.group(2)
        
        # 解析每个错题
        errors = []
        error_pattern = r'(\d+)\.\s+(.+?)\n\s+正确答案:\s+(.+?)\n\s+你的答案:\s+(.+?)\n\s+时间:\s+(.+?)\n\s+状态:\s+(.+?)(?:\n\s+复习次数:\s+(\d+))?'
        error_matches = re.finditer(error_pattern, unit_content, re.DOTALL)
        
        for error_match in error_matches:
            errors.append({
                'number': error_match.group(1),
                'chinese': error_match.group(2).strip(),
                'correct_answer': error_match.group(3).strip(),
                'your_answer': error_match.group(4).strip(),
                'time': error_match.group(5).strip(),
                'status': error_match.group(6).strip(),
                'review_count': error_match.group(7) if error_match.group(7) else None
            })
        
        if errors:
            units.append({
                'name': unit_name,
                'errors': errors
            })
    
    return {
        'export_time': export_time,
        'total_errors': total_errors,
        'unmastered': unmastered,
        'mastered': mastered,
        'units': units
    }

def create_word_document(data, output_path):
    """创建 Word 文档"""
    doc = Document()
    
    # 设置中文字体
    def set_chinese_font(run, font_name='微软雅黑'):
        run.font.name = font_name
        run._element.rPr.rFonts.set(qn('w:eastAsia'), font_name)
    
    # 标题
    title = doc.add_heading('英语复习助手 - 错题本', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    title.paragraph_format.line_spacing = Pt(16)  # 更紧凑
    title.paragraph_format.space_before = Pt(0)
    title.paragraph_format.space_after = Pt(0)
    for run in title.runs:
        set_chinese_font(run)
        run.font.size = Pt(16)
        run.font.bold = True
    
    # 元信息
    info_para = doc.add_paragraph()
    info_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    info_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    info_para.paragraph_format.line_spacing = Pt(10)  # 更紧凑
    info_para.paragraph_format.space_before = Pt(0)
    info_para.paragraph_format.space_after = Pt(0)
    info_run = info_para.add_run(f'总错题数: {data["total_errors"]}  |  ')
    set_chinese_font(info_run)
    info_run.font.size = Pt(10)
    
    info_run = info_para.add_run(f'未掌握: {data["unmastered"]}  |  ')
    set_chinese_font(info_run)
    info_run.font.size = Pt(10)
    info_run.font.color.rgb = RGBColor(255, 0, 0)  # 红色
    
    info_run = info_para.add_run(f'已掌握: {data["mastered"]}')
    set_chinese_font(info_run)
    info_run.font.size = Pt(10)
    info_run.font.color.rgb = RGBColor(0, 128, 0)  # 绿色
    
    # 分隔线
    sep_top = doc.add_paragraph('=' * 50)
    sep_top.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    sep_top.paragraph_format.line_spacing = Pt(8)
    sep_top.paragraph_format.space_before = Pt(0)
    sep_top.paragraph_format.space_after = Pt(0)
    
    # 从此处开始，使用连续分节并设置为双栏
    two_col_section = doc.add_section(WD_SECTION_START.CONTINUOUS)
    sect_pr = two_col_section._sectPr
    cols = sect_pr.xpath('./w:cols')
    if cols:
        cols = cols[0]
    else:
        cols = OxmlElement('w:cols')
        sect_pr.append(cols)
    cols.set(qn('w:num'), '2')       # 两栏
    cols.set(qn('w:space'), '720')   # 栏间距 720 twips ≈ 0.5 英寸
    # 如需显示分隔线，可取消下一行注释
    # cols.set(qn('w:sep'), '1')
    
    # 遍历每个单元
    for unit in data['units']:
        # 单元标题
        unit_heading = doc.add_heading(unit['name'], level=1)
        unit_heading.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
        unit_heading.paragraph_format.line_spacing = Pt(12)  # 更紧凑
        unit_heading.paragraph_format.space_before = Pt(0)
        unit_heading.paragraph_format.space_after = Pt(0)
        for run in unit_heading.runs:
            set_chinese_font(run)
            run.font.size = Pt(12)
            run.font.bold = True
            run.font.color.rgb = RGBColor(0, 0, 128)  # 深蓝色
        
        # 分隔线
        sep = doc.add_paragraph('-' * 50)
        sep.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
        sep.paragraph_format.line_spacing = Pt(8)
        sep.paragraph_format.space_before = Pt(0)
        sep.paragraph_format.space_after = Pt(0)
        
        # 遍历每个错题
        for error in unit['errors']:
            # 题目编号和中文
            question_para = doc.add_paragraph()
            question_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
            question_para.paragraph_format.line_spacing = Pt(10)  # 更紧凑
            question_para.paragraph_format.space_before = Pt(0)
            question_para.paragraph_format.space_after = Pt(0)
            question_run = question_para.add_run(f"{error['number']}. {error['chinese']}")
            set_chinese_font(question_run)
            question_run.font.size = Pt(10)
            question_run.font.bold = True
            
            # 正确答案
            correct_para = doc.add_paragraph()
            correct_para.paragraph_format.left_indent = Inches(0.5)
            correct_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
            correct_para.paragraph_format.line_spacing = Pt(9)  # 更紧凑
            correct_para.paragraph_format.space_before = Pt(0)
            correct_para.paragraph_format.space_after = Pt(0)
            correct_run = correct_para.add_run(f"   正确答案: {error['correct_answer']}")
            set_chinese_font(correct_run)
            correct_run.font.size = Pt(9)
            correct_run.font.color.rgb = RGBColor(0, 128, 0)  # 绿色
            
            # 你的答案
            your_para = doc.add_paragraph()
            your_para.paragraph_format.left_indent = Inches(0.5)
            your_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
            your_para.paragraph_format.line_spacing = Pt(9)  # 更紧凑
            your_para.paragraph_format.space_before = Pt(0)
            your_para.paragraph_format.space_after = Pt(0)
            your_run = your_para.add_run(f"   你的答案: {error['your_answer']}")
            set_chinese_font(your_run)
            your_run.font.size = Pt(9)
            your_run.font.color.rgb = RGBColor(255, 0, 0)  # 红色
            
            # 元信息：仅显示复习次数（如果有）
            if error['review_count']:
                meta_para = doc.add_paragraph()
                meta_para.paragraph_format.left_indent = Inches(0.5)
                meta_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
                meta_para.paragraph_format.line_spacing = Pt(8)  # 更紧凑
                meta_para.paragraph_format.space_before = Pt(0)
                meta_para.paragraph_format.space_after = Pt(0)
                review_run = meta_para.add_run(f"   复习次数: {error['review_count']}")
                set_chinese_font(review_run)
                review_run.font.size = Pt(8)
                review_run.font.color.rgb = RGBColor(128, 128, 128)
            # 移除额外空行以进一步压缩版式
    
    # 保存文档
    doc.save(output_path)
    print(f"✅ Word 文档已生成: {output_path}")

def main():
    """主函数"""
    if len(sys.argv) < 2:
        # 如果没有提供参数，使用默认路径
        input_file = r'g:\Download\错题本_2025-11-11.txt'
        if not os.path.exists(input_file):
            print("❌ 错误: 请提供错题本文本文件路径")
            print("用法: python txt_to_word.py <输入文件路径> [输出文件路径]")
            return
    else:
        input_file = sys.argv[1]
    
    if not os.path.exists(input_file):
        print(f"❌ 错误: 文件不存在: {input_file}")
        return
    
    # 确定输出文件路径
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    else:
        # 默认输出到同目录，文件名改为 .docx
        base_name = os.path.splitext(input_file)[0]
        output_file = base_name + '.docx'
    
    print(f"📖 正在读取: {input_file}")
    try:
        data = parse_error_book(input_file)
        print(f"✓ 解析完成: {len(data['units'])} 个单元, {data['total_errors']} 道错题")
        
        print(f"📝 正在生成 Word 文档...")
        create_word_document(data, output_file)
        
        print(f"🎉 完成!")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

