import os
import json
import docx
import re

def extract_qa_pairs(doc_path):
    doc = docx.Document(doc_path)
    qa_pairs = []
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
            
        # 匹配英文-中文对
        regex = r"^\s*(?:\d+\.\s*)?([a-zA-Z\s\(\)\[\]\{\}\,\-\'\"]+\.?)([\u4e00-\u9fa5]+。?\s*)(?=(?:(?!\-?错误答案).)*$)"
        match = re.search(regex, text)
        
        if match:
            english = match.group(1).strip()
            chinese = match.group(2).strip()
            
            if english and chinese:
                qa_pairs.append({
                    "english": english,
                    "chinese": chinese
                })
    
    return qa_pairs

def generate_js_file(files_dir, output_js_path):
    all_data = {}
    
    # 遍历目录下的所有docx文件
    for file_name in os.listdir(files_dir):
        if file_name.endswith(".docx"):
            file_path = os.path.join(files_dir, file_name)
            try:
                qa_pairs = extract_qa_pairs(file_path)
                if qa_pairs:
                    # 使用文件名(不含扩展名)作为键
                    doc_name = os.path.splitext(file_name)[0]
                    all_data[doc_name] = qa_pairs
                    print(f"成功处理文件: {file_name}, 包含 {len(qa_pairs)} 个问答对")
                else:
                    print(f"警告: 文件 {file_name} 中未找到有效的问答对")
            except Exception as e:
                print(f"处理文件 {file_name} 时出错: {e}")
    
    # 生成JavaScript文件
    with open(output_js_path, "w", encoding="utf-8") as f:
        f.write("// 自动生成的问答数据\n")
        f.write("const docxData = ")
        json.dump(all_data, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        f.write("// 导出数据对象\n")
        f.write("if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {\n")
        f.write("  module.exports = { docxData };\n")
        f.write("}\n")
    
    print(f"\n完成! 已将 {len(all_data)} 个文档的内容写入到 {output_js_path}")

if __name__ == "__main__":
    # 目录路径，包含所有docx文件
    files_directory = input("请输入包含docx文件的目录路径: ")
    # JavaScript输出路径
    output_path = input("请输入要生成的JS文件路径 (默认为 docx-data.js): ") or "docx-data.js"
    
    generate_js_file(files_directory, output_path)
