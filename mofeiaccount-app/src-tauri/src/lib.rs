use std::fs;
use std::path::PathBuf;

/// 读取文件二进制内容，返回 base64 编码字符串和对应的 MIME 类型
/// 用于前端 <img> 标签通过 data:image/...;base64,... 直接内联显示凭证图片
#[tauri::command]
fn read_file_base64(path: String) -> Result<(String, String), String> {
    // 读取文件二进制
    let data = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 根据文件扩展名判断 MIME 类型
    let path_lower = path.to_lowercase();
    let mime = if path_lower.ends_with(".png") {
        "image/png".to_string()
    } else if path_lower.ends_with(".jpg") || path_lower.ends_with(".jpeg") {
        "image/jpeg".to_string()
    } else {
        // 未知格式默认当作 png 处理
        "image/png".to_string()
    };

    // 使用 base64 引擎编码二进制数据
    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&data);

    Ok((mime, encoded))
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn write_file_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    // 确保父目录存在
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    fs::write(&path, &data).map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
fn check_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
fn make_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("创建目录失败: {}", e))
}

#[tauri::command]
fn copy_file_cmd(src: String, dest: String) -> Result<(), String> {
    // 确保目标目录存在
    if let Some(parent) = PathBuf::from(&dest).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    fs::copy(&src, &dest).map_err(|e| format!("复制文件失败: {}", e))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      read_file_base64,   // 新增：凭证图片读取命令
      read_file_bytes,
      write_file_bytes,
      check_exists,
      make_dir,
      copy_file_cmd,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
