#!/usr/bin/env python3
"""
现有数据转换脚本
将旧的docx-data.js转换为新的分年级分单元文件结构
"""

import json
import os
import re

def parse_unit_name(unit_key):
    """解析单元名称"""
    # 假设格式为 "U1-1", "U1-2" 等
    match = re.match(r'U(\d+)-(\d+)', unit_key)
    if match:
        unit_num = match.group(1)
        section_num = match.group(2)
        return f"U{unit_num}-{section_num}"
    return unit_key

def determine_grade_and_semester(unit_key):
    """根据单元名称确定年级和学期"""
    # 这是一个简化的映射，实际应该根据具体的单元名称来判断
    unit_mapping = {
        # 七年级上册
        'U1-1': ('七年级', '上册'),
        'U1-2': ('七年级', '上册'),
        'U1-3': ('七年级', '上册'),
        'U2-1': ('七年级', '上册'),
        'U2-2': ('七年级', '上册'),

        # 七年级下册
        'U3-1': ('七年级', '下册'),
        'U3-2': ('七年级', '下册'),
        'U3-3': ('七年级', '下册'),
        'U4-1': ('七年级', '下册'),
        'U4-2': ('七年级', '下册'),
        'U4-3': ('七年级', '下册'),
        'U5-1': ('七年级', '下册'),
        'U5-2': ('七年级', '下册'),
        'U5-3': ('七年级', '下册'),
        'U6-1': ('七年级', '下册'),
        'U6-2': ('七年级', '下册'),
        'U6-3': ('七年级', '下册'),

        # 八年级上册
        'U1-1': ('八年级', '上册'),
        'U1-2': ('八年级', '上册'),
        'U1-3': ('八年级', '上册'),
        'U2-1': ('八年级', '上册'),
        'U2-2': ('八年级', '上册'),
        'U3-1': ('八年级', '上册'),
        'U3-2': ('八年级', '上册'),
        'U3-3': ('八年级', '上册'),
        'U4-1': ('八年级', '上册'),
        'U4-2': ('八年级', '上册'),
        'U4-3': ('八年级', '上册'),

        # 八年级下册
        'U5-1': ('八年级', '下册'),
        'U5-2': ('八年级', '下册'),
    }

    return unit_mapping.get(unit_key, ('七年级', '上册'))

def convert_data():
    """转换数据结构"""
    try:
        # 读取现有的数据文件
        with open('js/data/docx-data.js', 'r', encoding='utf-8') as f:
            content = f.read()

        # 提取数据部分
        start = content.find('export const docxData = {')
        end = content.rfind('};')

        if start == -1 or end == -1:
            print("无法找到数据定义")
            return

        data_str = content[start:end + 1]

        # 解析JavaScript对象为Python字典
        # 由于这是JavaScript语法，我们需要先清理一下
        data_str = data_str.replace('export const docxData = ', '')
        data_str = data_str.rstrip(';')

        # 简单的JSON转换（可能需要手动调整）
        # 将JavaScript对象语法转换为JSON
        data_str = re.sub(r'(\w+):', r'"\1":', data_str)  # 给键加引号
        data_str = re.sub(r',\s*}', '}', data_str)  # 移除最后的逗号
        data_str = re.sub(r',\s*]', ']', data_str)  # 移除数组最后的逗号

        try:
            data = eval(data_str)  # 注意：这不是安全的做法，实际应该用更好的JSON解析
        except:
            print("无法解析数据，尝试手动转换")
            return

        # 确保输出目录存在
        os.makedirs('data', exist_ok=True)

        # 转换每个单元
        for unit_key, questions in data.items():
            if not isinstance(questions, list):
                continue

            grade, semester = determine_grade_and_semester(unit_key)
            unit_name = parse_unit_name(unit_key)

            # 准备新格式的数据
            unit_data = {
                "title": f"{grade} {semester} {unit_name}",
                "vocabulary": [],
                "wordForms": []
            }

            # 转换词汇数据
            for question in questions:
                if isinstance(question, dict) and 'english' in question and 'chinese' in question:
                    vocabulary_item = {
                        "english": question['english'] if isinstance(question['english'], list) else [question['english']],
                        "chinese": question['chinese']
                    }
                    unit_data["vocabulary"].append(vocabulary_item)

            # 创建文件
            output_dir = f"data/{grade}/{semester}"
            os.makedirs(output_dir, exist_ok=True)

            filename = f"{unit_name}.js"
            filepath = os.path.join(output_dir, filename)

            # 生成文件内容
            file_content = f"""export const unitData = {json.dumps(unit_data, ensure_ascii=False, indent=2)};"""

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(file_content)

            print(f"已转换: {filepath}")

        print("数据转换完成!")

    except Exception as e:
        print(f"转换过程中出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("开始转换现有数据...")
    convert_data()
    print("转换完成!")




