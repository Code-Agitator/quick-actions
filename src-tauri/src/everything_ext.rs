//! Everything 扩展命令模块
//! 提供高级搜索、文件预览、类型筛选等功能

use tauri::AppHandle;
use std::fs;
use std::path::Path;
use chardetng::EncodingDetector;
use std::collections::HashMap;
use std::sync::Mutex;

// 简单的内存缓存（最多缓存 50 个搜索结果）
struct SearchCache {
    cache: HashMap<String, (Vec<SearchResultExtended>, std::time::Instant)>,
    max_size: usize,
}

impl SearchCache {
    fn new() -> Self {
        Self {
            cache: HashMap::new(),
            max_size: 50,
        }
    }

    fn get(&self, key: &str) -> Option<&Vec<SearchResultExtended>> {
        if let Some((results, timestamp)) = self.cache.get(key) {
            // 缓存有效期 5 秒
            if timestamp.elapsed().as_secs() < 5 {
                return Some(results);
            }
        }
        None
    }

    fn insert(&mut self, key: String, results: Vec<SearchResultExtended>) {
        // 如果缓存已满，删除最旧的一个
        if self.cache.len() >= self.max_size {
            if let Some(oldest_key) = self.cache.keys()
                .min_by_key(|k| self.cache.get(*k).unwrap().1)
                .cloned()
            {
                self.cache.remove(&oldest_key);
            }
        }
        self.cache.insert(key, (results, std::time::Instant::now()));
    }
}

// 全局缓存实例
lazy_static::lazy_static! {
    static ref SEARCH_CACHE: Mutex<SearchCache> = Mutex::new(SearchCache::new());
}

/// 文件类型过滤器
#[derive(Debug, serde::Deserialize, Clone)]
pub enum FileFilter {
    All,           // 全部
    Folder,        // 文件夹
    Excel,         // Excel 文件
    Word,          // Word 文件
    PPT,           // PowerPoint 文件
    PDF,           // PDF 文件
    Image,         // 图片
    Video,         // 视频
    Audio,         // 音频
    Archive,       // 压缩文件
}

impl FileFilter {
    /// 生成 Everything 查询后缀
    pub fn to_query_suffix(&self) -> String {
        match self {
            FileFilter::All => String::new(),
            FileFilter::Folder => " folder:".to_string(),
            FileFilter::Excel => " ext:xlsx;xls;xlsm;csv".to_string(),
            FileFilter::Word => " ext:docx;doc;rtf;txt".to_string(),
            FileFilter::PPT => " ext:pptx;ppt;ppsx".to_string(),
            FileFilter::PDF => " ext:pdf".to_string(),
            FileFilter::Image => " ext:jpg;jpeg;png;gif;bmp;ico;svg;webp;tiff".to_string(),
            FileFilter::Video => " ext:mp4;avi;mkv;mov;wmv;flv;webm".to_string(),
            FileFilter::Audio => " ext:mp3;wav;flac;aac;ogg;wma;m4a".to_string(),
            FileFilter::Archive => " ext:zip;rar;7z;tar;gz;bz2;xz".to_string(),
        }
    }
}

/// 排序选项
#[derive(Debug, serde::Deserialize, Clone)]
pub enum SortBy {
    NameAsc,
    NameDesc,
    DateAsc,
    DateDesc,
    SizeAsc,
    SizeDesc,
}

/// 搜索结果项（扩展版）
#[derive(Debug, serde::Serialize, Clone)]
pub struct SearchResultExtended {
    pub name: String,
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub date_modified: String,
    pub extension: String,
    pub is_folder: bool,
    pub file_type: String,
}

/// 文件预览结果
#[derive(Debug, serde::Serialize)]
pub struct FilePreview {
    pub content: String,
    pub encoding: String,
    pub size: u64,
    pub lines: u64,
    pub truncated: bool,
    pub mime_type: String,
}

/// 文件详细信息
#[derive(Debug, serde::Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub size_formatted: String,
    pub created: String,
    pub modified: String,
    pub accessed: String,
    pub is_file: bool,
    pub is_dir: bool,
    pub extension: String,
    pub mime_type: String,
}

/// 执行高级搜索（使用 Everything SDK）
#[tauri::command]
pub async fn everything_search_extended(
    _app: AppHandle,
    _plugin_id: String,
    query: String,
    filter: FileFilter,
    sort_by: SortBy,
    max_results: u32,
) -> Result<Vec<SearchResultExtended>, String> {
    use everything_sdk::{RequestFlags, SortType};
    
    // 生成缓存键
    let cache_key = format!("{}|{:?}|{:?}|{}", query, filter, sort_by, max_results);
    
    // 尝试从缓存获取
    if let Some(cached_results) = SEARCH_CACHE.lock().unwrap().get(&cache_key) {
        println!("[Everything SDK] Cache hit for: '{}'", query);
        return Ok(cached_results.clone());
    }
    
    println!("[Everything SDK] Searching: '{}' with filter: {:?}", query, filter);

    // 构建查询
    let mut full_query = query.clone();
    full_query.push_str(&filter.to_query_suffix());

    // 使用全局 searcher（处理 PoisonError）
    let global_guard = everything_sdk::global();
    let mut global_locked = global_guard.lock().unwrap_or_else(|e| e.into_inner());
    let mut searcher = global_locked.searcher();
    
    // 设置搜索字符串
    searcher.set_search(&full_query);
    
    // 设置请求标志（使用 FULL_PATH_AND_FILE_NAME 以支持 full_path_name() 方法）
    searcher.set_request_flags(
        RequestFlags::EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME | 
        RequestFlags::EVERYTHING_REQUEST_SIZE | 
        RequestFlags::EVERYTHING_REQUEST_DATE_MODIFIED |
        RequestFlags::EVERYTHING_REQUEST_ATTRIBUTES
    );
    
    // 设置最大结果数
    searcher.set_max(max_results);
    
    // 设置排序类型
    let sort_type = match sort_by {
        SortBy::NameAsc => SortType::EVERYTHING_SORT_NAME_ASCENDING,
        SortBy::NameDesc => SortType::EVERYTHING_SORT_NAME_DESCENDING,
        SortBy::DateAsc => SortType::EVERYTHING_SORT_DATE_MODIFIED_ASCENDING,
        SortBy::DateDesc => SortType::EVERYTHING_SORT_DATE_MODIFIED_DESCENDING,
        SortBy::SizeAsc => SortType::EVERYTHING_SORT_SIZE_ASCENDING,
        SortBy::SizeDesc => SortType::EVERYTHING_SORT_SIZE_DESCENDING,
    };
    searcher.set_sort(sort_type);
    
    // 执行查询
    let results = searcher.query();
    
    // 获取结果数量
    let count = results.len();
    
    println!("[Everything SDK] Found {} results", count);
    
    let mut search_results: Vec<SearchResultExtended> = Vec::new();
    
    // 遍历结果
    let mut success_count = 0;
    let mut error_count = 0;
    for (idx, item) in results.iter().enumerate() {
        match item.full_path_name(None) {
            Ok(full_path) => {
                success_count += 1;
                let filename = full_path.to_string_lossy().to_string();
            let path_obj = Path::new(&filename);
            let name = path_obj.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            let extension = path_obj.extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default();
            
            // 从 Item 中直接获取文件大小和日期
            let size = item.size().unwrap_or(0);
            let is_folder = item.is_folder();
            
            // 获取修改时间（Everything SDK 返回的是 Windows FILETIME，需要转换）
            let date_modified = item.date_modified()
                .ok()
                .and_then(|filetime| {
                    // Windows FILETIME 是自 1601-01-01 以来的 100 纳秒间隔数
                    // Unix epoch 是 1970-01-01，相差 11644473600 秒
                    const WINDOWS_EPOCH_TO_UNIX_EPOCH: u64 = 11644473600;
                    
                    // 将 100 纳秒转换为秒
                    let seconds_since_windows_epoch = filetime / 10_000_000;
                    
                    // 检查是否有效
                    if seconds_since_windows_epoch < WINDOWS_EPOCH_TO_UNIX_EPOCH {
                        return None;
                    }
                    
                    // 转换为 Unix 时间戳
                    let unix_timestamp = seconds_since_windows_epoch - WINDOWS_EPOCH_TO_UNIX_EPOCH;
                    
                    // 转换为 DateTime
                    chrono::DateTime::<chrono::Utc>::from_timestamp(unix_timestamp as i64, 0)
                        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                })
                .unwrap_or_default();

            // 判断文件类型
            let file_type = determine_file_type(&extension, is_folder);

            search_results.push(SearchResultExtended {
                name,
                filename: filename.clone(),
                path: filename,
                size,
                date_modified,
                extension,
                is_folder,
                file_type,
            });
            }
            Err(e) => {
                error_count += 1;
                if idx < 3 {  // 只记录前3个错误
                    println!("[Everything SDK] Error getting path for item {}: {:?}", idx, e);
                }
            }
        }
    }
    
    println!("[Everything SDK] Processed {} items: {} success, {} errors", 
        results.len(), success_count, error_count);

    // 存入缓存
    SEARCH_CACHE.lock().unwrap().insert(cache_key, search_results.clone());

    println!("[Everything SDK] Returning {} results", search_results.len());
    if !search_results.is_empty() {
        println!("[Everything SDK] First result: name={}, filename={}, is_folder={}", 
            search_results[0].name, search_results[0].filename, search_results[0].is_folder);
    }

    Ok(search_results)
}

/// 预览文件内容
#[tauri::command]
pub async fn preview_file_content(
    _app: AppHandle,
    plugin_id: String,
    file_path: String,
    max_size: Option<u64>,
) -> Result<FilePreview, String> {
    println!("[Everything Extended] Previewing file: {}", file_path);

    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err("File not found".to_string());
    }

    if !path.is_file() {
        return Err("Not a file".to_string());
    }

    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;

    let file_size = metadata.len();
    let max_size = max_size.unwrap_or(100_000); // 默认最大 100KB

    // 读取文件内容（限制大小）
    let read_size = std::cmp::min(file_size, max_size) as usize;
    let mut buffer = vec![0u8; read_size];

    use std::io::Read;
    let mut file = fs::File::open(path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    file.read_exact(&mut buffer)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // 检测编码
    let mut detector = EncodingDetector::new();
    detector.feed(&buffer, true);
    let encoding = detector.guess(None, true);
    let encoding_name = encoding.name().to_string();

    // 解码为字符串
    let content = encoding.decode_without_bom_handling(&buffer);
    let (cow_str, _) = content;
    let decoded = cow_str.to_string();

    // 计算行数
    let lines = decoded.lines().count() as u64;
    let truncated = file_size > max_size;

    // 判断 MIME 类型
    let extension = path.extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default()
        .to_lowercase();
    
    let mime_type = match extension.as_str() {
        "txt" | "md" | "json" | "xml" | "yaml" | "yml" | "js" | "ts" | "py" | "rs" | "go" => "text/plain",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "csv" => "text/csv",
        "log" => "text/plain",
        "cfg" | "ini" | "conf" => "text/plain",
        _ => "application/octet-stream",
    }.to_string();

    Ok(FilePreview {
        content: decoded,
        encoding: encoding_name,
        size: file_size,
        lines,
        truncated,
        mime_type,
    })
}

/// 获取文件详细信息
#[tauri::command]
pub async fn get_file_info(
    _app: AppHandle,
    _plugin_id: String,
    file_path: String,
) -> Result<FileInfo, String> {
    println!("[Everything Extended] Getting file info: {}", file_path);

    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err("File not found".to_string());
    }

    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;

    let name = path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let extension = path.extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();

    // 格式化文件大小
    let size = metadata.len();
    let size_formatted = format_size(size);

    // 获取时间戳并格式化
    fn format_time(system_time: std::time::SystemTime) -> String {
        use std::time::UNIX_EPOCH;
        let duration = system_time.duration_since(UNIX_EPOCH)
            .unwrap_or_default();
        let secs = duration.as_secs();
        
        // 简单的日期格式化
        let days = secs / 86400;
        let hours = (secs % 86400) / 3600;
        let minutes = (secs % 3600) / 60;
        let seconds = secs % 60;
        
        format!("{}d {}h {}m {}s", days, hours, minutes, seconds)
    }

    let created = metadata.created()
        .map(format_time)
        .unwrap_or_default();

    let modified = metadata.modified()
        .map(format_time)
        .unwrap_or_default();

    let accessed = metadata.accessed()
        .map(format_time)
        .unwrap_or_default();

    // 判断 MIME 类型
    let mime_type = guess_mime_type(&extension);

    Ok(FileInfo {
        name,
        path: file_path,
        size,
        size_formatted,
        created,
        modified,
        accessed,
        is_file: metadata.is_file(),
        is_dir: metadata.is_dir(),
        extension,
        mime_type,
    })
}

/// 判断文件类型
fn determine_file_type(extension: &str, is_folder: bool) -> String {
    if is_folder {
        return "folder".to_string();
    }

    match extension.to_lowercase().as_str() {
        "xlsx" | "xls" | "xlsm" | "csv" => "excel",
        "docx" | "doc" | "rtf" | "txt" => "word",
        "pptx" | "ppt" | "ppsx" => "ppt",
        "pdf" => "pdf",
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "ico" | "svg" | "webp" | "tiff" => "image",
        "mp4" | "avi" | "mkv" | "mov" | "wmv" | "flv" | "webm" => "video",
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "wma" | "m4a" => "audio",
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" => "archive",
        _ => "file",
    }.to_string()
}

/// 格式化文件大小
fn format_size(size: u64) -> String {
    if size < 1024 {
        format!("{} B", size)
    } else if size < 1024 * 1024 {
        format!("{:.2} KB", size as f64 / 1024.0)
    } else if size < 1024 * 1024 * 1024 {
        format!("{:.2} MB", size as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB", size as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}

/// 猜测 MIME 类型
fn guess_mime_type(extension: &str) -> String {
    match extension.to_lowercase().as_str() {
        "txt" | "md" | "log" => "text/plain",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" => "application/javascript",
        "ts" => "application/typescript",
        "json" => "application/json",
        "xml" => "application/xml",
        "pdf" => "application/pdf",
        "doc" | "docx" => "application/msword",
        "xls" | "xlsx" => "application/vnd.ms-excel",
        "ppt" | "pptx" => "application/vnd.ms-powerpoint",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "mp3" => "audio/mpeg",
        "mp4" => "video/mp4",
        "zip" => "application/zip",
        "rar" => "application/x-rar-compressed",
        "7z" => "application/x-7z-compressed",
        _ => "application/octet-stream",
    }.to_string()
}

/// 打开文件或文件夹
#[tauri::command]
pub async fn plugin_everything_open(
    _app: AppHandle,
    _plugin_id: String,
    file_path: String,
) -> Result<(), String> {
    println!("[Everything Open] Opening: {}", file_path);
    
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open: {}", e))?;
    }
    
    Ok(())
}
