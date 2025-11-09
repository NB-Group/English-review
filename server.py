#!/usr/bin/env python3
"""
简单的HTTP服务器，用于测试英语复习助手应用
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json
import urllib.parse

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加CORS头，允许跨域请求
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        """处理OPTIONS请求（CORS预检）"""
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        """处理GET请求"""
        # 处理API请求：扫描单元文件
        if self.path == '/api/scan-units':
            self.handle_scan_units()
        else:
            # 默认的静态文件服务
            super().do_GET()
    
    def handle_scan_units(self):
        """扫描data目录下的所有单元文件"""
        try:
            units = {}
            data_dir = os.path.join(os.path.dirname(__file__), 'data')
            
            if not os.path.exists(data_dir):
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({}).encode('utf-8'))
                return
            
            # 年级映射：中文目录名 -> 数字年级
            grade_map = {
                '七年级': '7',
                '八年级': '8',
                '九年级': '9'
            }
            
            # 学期映射：中文目录名 -> 英文代码
            semester_map = {
                '上册': 'Up',
                '下册': 'Down'
            }
            
            # 扫描所有年级目录
            for grade_dir in os.listdir(data_dir):
                grade_path = os.path.join(data_dir, grade_dir)
                if not os.path.isdir(grade_path):
                    continue
                
                grade_num = grade_map.get(grade_dir)
                if not grade_num:
                    continue
                
                units[grade_num] = {}
                
                # 扫描学期目录
                for semester_dir in os.listdir(grade_path):
                    semester_path = os.path.join(grade_path, semester_dir)
                    if not os.path.isdir(semester_path):
                        continue
                    
                    semester_code = semester_map.get(semester_dir)
                    if not semester_code:
                        continue
                    
                    unit_list = []
                    # 扫描单元文件
                    for filename in os.listdir(semester_path):
                        if filename.endswith('.js'):
                            unit_name = filename[:-3]  # 去掉.js后缀
                            unit_list.append(unit_name)
                    
                    # 按单元名称排序
                    unit_list.sort()
                    units[grade_num][semester_code] = unit_list
            
            # 返回JSON响应
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(units, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            print(f"扫描单元文件时出错: {e}")
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

def start_server():
    """启动HTTP服务器"""
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"服务器启动成功！")
            print(f"访问地址: http://127.0.0.1:{PORT}")
            print(f"按 Ctrl+C 停止服务器")

            # 自动打开浏览器
            try:
                webbrowser.open(f"http://127.0.0.1:{PORT}")
            except:
                pass

            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"端口 {PORT} 已被占用，请尝试其他端口")
        else:
            print(f"启动服务器失败: {e}")

if __name__ == "__main__":
    # 检查是否有可用的端口
    for port in range(8080, 8090):
        try:
            with socketserver.TCPServer(("", port), MyHTTPRequestHandler) as httpd:
                print(f"找到可用端口: {port}")
                PORT = port
                break
        except OSError:
            continue

    start_server()






