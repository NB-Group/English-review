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
            
        # 匹配中文和多个英文答案格式: 英文1/英文2/英文3 - 中文
        multi_pattern = r"^(.*?(?:/.*?)+)\s*[-—–]\s*([\u4e00-\u9fa5]+。?\s*)$"
        multi_match = re.search(multi_pattern, text)
        
        if multi_match:
            # 多答案格式
            english_options = [opt.strip() for opt in multi_match.group(1).split('/')]
            chinese = multi_match.group(2).strip()
            
            if all(english_options) and chinese:
                qa_pairs.append({
                    "english": english_options,
                    "chinese": chinese
                })
        else:
            # 尝试常规格式: 英文 - 中文
            regex = r"^\s*(?:\d+\.\s*)?([a-zA-Z\s\(\)\[\]\{\}\,\-\'\"]+\.?)\s*[-—–]\s*([\u4e00-\u9fa5]+。?\s*)(?=(?:(?!\-?错误答案).)*$)"
            match = re.search(regex, text)
            
            if match:
                english = match.group(1).strip()
                chinese = match.group(2).strip()
                
                if english and chinese:
                    qa_pairs.append({
                        "english": [english],  # 单个答案也放入数组中
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
        f.write("// 自动生成的多答案格式问答数据\n")
        f.write("const docxData = ")
        json.dump(all_data, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        f.write("// 导出数据对象\n")
        f.write("if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {\n")
        f.write("  module.exports = { docxData };\n")
        f.write("}\n")
    
    print(f"\n完成! 已将 {len(all_data)} 个文档的内容写入到 {output_js_path}")
    print("新的多答案格式支持：英文1/英文2/英文3 - 中文")

if __name__ == "__main__":
    print("=" * 50)
    print("DOCX转JS多答案格式转换工具")
    print("=" * 50)
    print("支持格式: 'English - 中文' 或 'English1/English2/English3 - 中文'")
    print("=" * 50)
    
    # 目录路径，包含所有docx文件
    files_directory = input("请输入包含docx文件的目录路径: ")
    if not os.path.exists(files_directory):
        print(f"错误: 目录 '{files_directory}' 不存在")
        exit(1)
        
    # JavaScript输出路径
    output_path = input("请输入要生成的JS文件路径 (默认为 docx-data-multi.js): ") or "docx-data-multi.js"
    
    print(f"\n开始处理文件夹: {files_directory}")
    generate_js_file(files_directory, output_path)
    
    print("\n使用说明:")
    print("1. 将生成的 JS 文件放在网站根目录")
    print("2. 在 HTML 文件中引用该文件: <script src=\"./docx-data-multi.js\"></script>")
    print("3. 支持多种正确答案，系统会接受任一答案作为正确答案")
