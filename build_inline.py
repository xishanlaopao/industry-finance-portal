#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""内联构建：index.dev.html → index.html + 北斗·产融智航系统-单文件演示版.html
   CSS 与 6 个 js 内联；config/nav.js、data/jxmap.js、data/mock.js 保持外链；logo 转 base64"""
import base64, re, pathlib

root = pathlib.Path(__file__).parent
html = (root / 'index.dev.html').read_text(encoding='utf-8')

def inline_css(m):
    css = (root / m.group(1)).read_text(encoding='utf-8')
    return '<style>\n' + css + '\n</style>'

def inline_js(m):
    js = (root / m.group(1)).read_text(encoding='utf-8')
    return '<script>\n' + js + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="(css/[^"?]+)\?v=\d+">', inline_css, html)
html = re.sub(r'<script src="(js/[^"?]+)\?v=\d+"></script>', inline_js, html)

b64 = base64.b64encode((root / 'assets/logo.png').read_bytes()).decode()
html = html.replace('src="assets/logo.png"', 'src="data:image/png;base64,' + b64 + '"')

for out in ('index.html', '北斗·产融智航系统-单文件演示版.html'):
    (root / out).write_text(html, encoding='utf-8')
    print('built:', out)
