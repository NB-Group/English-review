# PythonAnywhere 部署（免费档）

## 打包（本机已跑通，重打：调整 web/ 后重跑）
    cd deploy/pythonanywhere
    rm -rf english-review english-review.zip
    mkdir -p english-review/web english-review/data
    cp app_wsgi.py english-review/
    cp -r ../../web/dist english-review/web/dist
    cp -r ../../data/kaogang english-review/data/kaogang
    cd english-review && zip -qr ../english-review.zip . && cd ..

## 上线五步
1. 注册 https://www.pythonanywhere.com （免费账号）
2. Files 页签上传 english-review.zip，然后开一个 Bash console：
   `unzip english-review.zip -d ~/english-review && rm english-review.zip`
3. Web 页签 → Add a new web app → Manual configuration → Python 3.10
4. WSGI configuration file 指向 `/home/<用户名>/english-review/app_wsgi.py`
   （把 PA 生成的默认内容整个替换为：`from app_wsgi import application`，
    并确保 working directory / sys.path 含 `/home/<用户名>/english-review`，
    最简单做法：WSGI 文件开头加两行）
5. Save & Reload → `https://<用户名>.pythonanywhere.com`

## 可选
- 注册口令（推荐，全校发放）：在 `~/english-review/.env` 写 `REGISTER_CODE=口令`
- 迁移已有账号：把本机 `local_accounts/*.json` 上传到 `~/english-review/local_accounts/`
- 注意：免费档外网白名单不含 challenges.cloudflare.com → Turnstile 在 PA 上不可用，
  人机门槛用注册口令替代；免费档每 3 个月要登录一次保持活跃
