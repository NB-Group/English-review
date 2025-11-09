#!/usr/bin/env python3
"""
简单的HTTP服务器，用于测试英语复习助手应用
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加CORS头，允许跨域请求
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

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




