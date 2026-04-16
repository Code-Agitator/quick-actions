//! everything-sdk API 探索测试

use everything_sdk::ergo::*;

fn main() {
    println!("=== Testing everything-sdk API ===\n");
    
    // 测试 1: 检查全局实例
    println!("Test 1: Get global instance");
    let global_guard = everything_sdk::ergo::global();
    println!("  Global instance obtained\n");
    
    // 测试 2: 创建 searcher
    println!("Test 2: Create searcher from global");
    let mut global_locked = global_guard.lock().unwrap();
    let mut searcher = global_locked.searcher();
    println!("  Searcher created\n");
    
    // 测试 3: 设置搜索字符串
    println!("Test 3: Set search string");
    searcher.set_search("test");
    println!("  Search string set to 'test'\n");
    
    // 测试 4: 设置最大结果数
    println!("Test 4: Set max results");
    searcher.set_max(10);
    println!("  Max results set to 10\n");
    
    // 测试 5: 设置请求标志（使用正确的常量）
    println!("Test 5: Set request flags");
    let flags = RequestFlags::EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME 
        | RequestFlags::EVERYTHING_REQUEST_SIZE 
        | RequestFlags::EVERYTHING_REQUEST_DATE_MODIFIED
        | RequestFlags::EVERYTHING_REQUEST_ATTRIBUTES;
    searcher.set_request_flags(flags);
    println!("  Request flags set\n");
    
    // 测试 6: 执行查询
    println!("Test 6: Execute query");
    let results = searcher.query();
    println!("  Query executed\n");
    
    // 测试 7: 获取结果数量
    println!("Test 7: Get result count");
    let count = results.len();
    println!("  Found {} results\n", count);
    
    // 测试 8: 遍历结果
    println!("Test 8: Iterate results");
    for (i, item) in results.iter().enumerate() {
        if i >= 5 { break; } // 只显示前5个
        
        match item.full_path_name(None) {
            Ok(path) => {
                let is_folder = item.is_folder();
                let size = item.size().unwrap_or(0);
                let date_modified = item.date_modified().unwrap_or(0);
                
                println!("  [{}] {} ({}) - Size: {}, Modified: {}",
                    i + 1,
                    path.display(),
                    if is_folder { "DIR" } else { "FILE" },
                    size,
                    date_modified
                );
            }
            Err(e) => {
                println!("  [{}] Error getting path: {:?}", i + 1, e);
            }
        }
    }
    
    println!("\n=== Test Complete ===");
}
