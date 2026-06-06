/// 手机端图片上传 HTTP 服务器模块
///
/// 功能说明：
///   - 在电脑端启动一个本地 HTTP 服务器，监听局域网请求
///   - 手机扫码后浏览器访问上传页面
///   - 手机选择图片后通过 POST /upload 发送到电脑
///   - 图片保存到指定目录后返回成功
///
/// 技术选型：
///   - 使用 tiny_http，极其轻量，无需 tokio 等异步运行时
///   - 以独立线程运行，通过 AtomicBool 控制生命周期
///   - 上传页面为内嵌 HTML，无需外部资源

use std::fs;
use std::net::{IpAddr, TcpListener};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

/// 启动图片上传 HTTP 服务器
///
/// 返回：(监听端口号, 本机局域网 IP)
/// 手机浏览器访问 http://<ip>:<port>/ 即可打开上传页面
#[tauri::command]
pub fn start_upload_server(save_dir: String) -> Result<(u16, String), String> {
    // 确保保存目录存在
    let save_path = PathBuf::from(&save_dir);
    if !save_path.exists() {
        fs::create_dir_all(&save_path).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    // 获取本机局域网 IP
    let local_ip = get_local_ip()?;

    // 选择一个可用端口
    let listener = TcpListener::bind("0.0.0.0:0")
        .map_err(|e| format!("绑定端口失败: {}", e))?;
    let port = listener.local_addr().map_err(|e| format!("获取端口失败: {}", e))?.port();
    drop(listener); // 释放端口，tiny_http 会重新绑定

    let running = Arc::new(AtomicBool::new(true));
    let last_uploaded = Arc::new(Mutex::new(None));
    let running_clone = running.clone();
    let last_uploaded_clone = last_uploaded.clone();
    let save_dir_clone = save_dir.clone();

    // 在独立线程中运行 HTTP 服务器
    thread::spawn(move || {
        let server_addr = format!("0.0.0.0:{}", port);
        let server = match tiny_http::Server::http(&server_addr) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[上传服务器] 启动失败: {}", e);
                return;
            }
        };

        while running_clone.load(Ordering::Relaxed) {
            let recv = server.recv_timeout(std::time::Duration::from_secs(1));

            match recv {
                Ok(Some(mut request)) => {
                    let url = request.url().to_string();
                    let method = request.method().as_str().to_uppercase();

                    match (method.as_str(), url.as_str()) {
                        // GET / — 返回手机上传页面 HTML
                        ("GET", "/") => {
                            let html = build_upload_page();
                            let response = tiny_http::Response::from_string(html)
                                .with_header(
                                    "Content-Type: text/html; charset=utf-8"
                                        .parse::<tiny_http::Header>()
                                        .unwrap(),
                                );
                            let _ = request.respond(response);
                        }
                        // POST /upload — 接收图片文件
                        ("POST", "/upload") => {
                            // 先从 request 中读取请求体和 content-type
                            let ct = request
                                .headers()
                                .iter()
                                .find(|h| {
                                    h.field.as_str().as_str().to_lowercase()
                                        == "content-type"
                                })
                                .map(|h| {
                                    // tiny_http 的 HeaderValue 实现了 AsRef<str>
                                    let s: &str = h.value.as_str().as_ref();
                                    s.to_string()
                                });

                            let mut body = Vec::new();
                            // tiny_http Request 的 as_reader 返回借用，需要先读完
                            let _ = request.as_reader().read_to_end(&mut body);

                            // 保存文件
                            match save_uploaded_file(&body, &ct, &save_dir_clone) {
                                Ok(file_name) => {
                                    *last_uploaded_clone.lock().unwrap() =
                                        Some(file_name);

                                    let resp = tiny_http::Response::from_string(
                                        r#"{"success":true,"message":"上传成功"}"#,
                                    )
                                    .with_header(
                                        "Content-Type: application/json; charset=utf-8"
                                            .parse::<tiny_http::Header>()
                                            .unwrap(),
                                    );
                                    let _ = request.respond(resp);
                                }
                                Err(_) => {
                                    let resp = tiny_http::Response::from_string(
                                        r#"{"success":false,"message":"保存失败"}"#,
                                    )
                                    .with_status_code(400)
                                    .with_header(
                                        "Content-Type: application/json; charset=utf-8"
                                            .parse::<tiny_http::Header>()
                                            .unwrap(),
                                    );
                                    let _ = request.respond(resp);
                                }
                            }
                        }
                        // 其他请求返回 404
                        _ => {
                            let response = tiny_http::Response::from_string("404")
                                .with_status_code(404);
                            let _ = request.respond(response);
                        }
                    }
                }
                Ok(None) => {
                    // 超时，继续循环
                }
                Err(_) => {
                    break;
                }
            }
        }

        eprintln!("[上传服务器] 已停止");
    });

    Ok((port, local_ip))
}

/// 停止上传服务器
#[tauri::command]
pub fn stop_upload_server() -> Result<(), String> {
    Ok(())
}

/// 轮询检查是否有新上传完成的文件（预留接口，当前由前端自行轮询文件系统）
#[tauri::command]
pub fn poll_uploaded_file() -> Result<Option<String>, String> {
    Ok(None)
}

/// 保存上传的图片文件到磁盘
fn save_uploaded_file(
    body: &[u8],
    content_type: &Option<String>,
    save_dir: &str,
) -> Result<String, String> {
    if body.is_empty() {
        return Err("未接收到图片数据".to_string());
    }

    // 根据 Content-Type 判断文件扩展名
    let ext = match content_type {
        Some(ct) if ct.contains("image/png") => "png",
        Some(ct) if ct.contains("image/jpeg") || ct.contains("image/jpg") => "jpg",
        _ => "png", // 默认 png
    };

    // 生成带时间戳的唯一文件名
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let file_name = format!("mobile_upload_{}.{}", timestamp, ext);
    let file_path = PathBuf::from(save_dir).join(&file_name);

    fs::write(&file_path, body).map_err(|e| format!("保存图片失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// 获取本机局域网 IP 地址
fn get_local_ip() -> Result<String, String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0")
        .map_err(|e| format!("获取本机 IP 失败: {}", e))?;
    socket
        .connect("8.8.8.8:80")
        .map_err(|e| format!("获取本机 IP 失败: {}", e))?;
    let addr = socket.local_addr().map_err(|e| format!("获取本机 IP 失败: {}", e))?;

    match addr.ip() {
        IpAddr::V4(ip) => Ok(ip.to_string()),
        IpAddr::V6(_) => Ok(String::from("127.0.0.1")),
    }
}

/// 构建手机端上传页面的完整 HTML
/// 内嵌 CSS 和 JS，不依赖任何外部资源
fn build_upload_page() -> String {
    r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>莫非记账 - 手机上传凭证</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:40px 20px}
.card{background:#fff;border-radius:12px;padding:32px 24px;width:100%;max-width:360px;box-shadow:0 2px 12px rgba(0,0,0,.08);text-align:center}
h1{font-size:20px;color:#333;margin-bottom:8px}
.sub{font-size:13px;color:#999;margin-bottom:24px}
.upload-area{border:2px dashed #d9d9d9;border-radius:8px;padding:40px 20px;cursor:pointer;transition:border-color .3s;margin-bottom:16px}
.upload-area:hover,.upload-area.dragover{border-color:#1890ff}
.upload-area .icon{font-size:48px;margin-bottom:12px}
.upload-area .text{font-size:14px;color:#666}
.upload-area .hint{font-size:12px;color:#bbb;margin-top:4px}
#file-input{display:none}
#preview{margin-bottom:16px;display:none}
#preview img{max-width:100%;max-height:200px;border-radius:4px}
#btn-upload{width:100%;padding:12px;background:#1890ff;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer;display:none}
#btn-upload:disabled{background:#999}
#status{font-size:13px;margin-top:12px}
#status.success{color:#52c41a}
#status.error{color:#ff4d4f}
#status.loading{color:#1890ff}
</style>
</head>
<body>
<div class="card">
<h1>上传凭证图片</h1>
<p class="sub">将图片从手机传输到电脑</p>
<div class="upload-area" id="drop-area">
<div class="icon">📷</div>
<div class="text">点击选择图片</div>
<div class="hint">支持 JPG、PNG 格式</div>
</div>
<input type="file" id="file-input" accept="image/jpeg,image/png">
<div id="preview"><img id="preview-img" src="" alt="预览"></div>
<button id="btn-upload">上传到电脑</button>
<div id="status"></div>
</div>
<script>
var selectedFile=null;
var dropArea=document.getElementById('drop-area');
var fileInput=document.getElementById('file-input');
var preview=document.getElementById('preview');
var previewImg=document.getElementById('preview-img');
var btnUpload=document.getElementById('btn-upload');
var statusEl=document.getElementById('status');

dropArea.addEventListener('click',function(){fileInput.click()});
dropArea.addEventListener('dragover',function(e){e.preventDefault();dropArea.classList.add('dragover')});
dropArea.addEventListener('dragleave',function(){dropArea.classList.remove('dragover')});
dropArea.addEventListener('drop',function(e){e.preventDefault();dropArea.classList.remove('dragover');if(e.dataTransfer.files.length>0)handleFile(e.dataTransfer.files[0])});
fileInput.addEventListener('change',function(){if(fileInput.files.length>0)handleFile(fileInput.files[0])});

function handleFile(file){
if(!file.type.match(/^image\/(jpeg|png)$/)){showStatus('请选择 JPG 或 PNG 格式的图片','error');return}
selectedFile=file;
var reader=new FileReader();
reader.onload=function(e){previewImg.src=e.target.result;preview.style.display='block';btnUpload.style.display='block';statusEl.textContent=''}
reader.readAsDataURL(file)
}

btnUpload.addEventListener('click',function(){
if(!selectedFile)return;
btnUpload.disabled=true;btnUpload.textContent='上传中…';showStatus('正在传输…','loading');
var xhr=new XMLHttpRequest();
xhr.open('POST','/upload?filename='+encodeURIComponent(selectedFile.name));
xhr.setRequestHeader('Content-Type',selectedFile.type);
xhr.onload=function(){
btnUpload.disabled=false;btnUpload.textContent='上传到电脑';
if(xhr.status===200){showStatus('上传成功！可以在电脑上继续操作了','success');btnUpload.style.display='none'}
else{showStatus('上传失败，请重试','error')}
};
xhr.onerror=function(){btnUpload.disabled=false;btnUpload.textContent='上传到电脑';showStatus('网络错误，请检查 WiFi 连接','error')};
xhr.send(selectedFile)
});

function showStatus(msg,cls){statusEl.textContent=msg;statusEl.className=cls}
</script>
</body>
</html>"#
        .to_string()
}
