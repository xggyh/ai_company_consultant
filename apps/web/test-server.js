import http from "node:http";

const html = `<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8"><title>AI Advisor</title></head>
  <body>
    <button aria-label="开始咨询">开始咨询</button>
    <input placeholder="请输入你的业务问题" />
    <button aria-label="发送">发送</button>
    <div id="result"></div>
    <script>
      const sendBtn = document.querySelector('button[aria-label="发送"]');
      sendBtn.addEventListener('click', () => {
        document.getElementById('result').textContent = '方案概述';
      });
    </script>
  </body>
</html>`;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(4173, "127.0.0.1");
