use everything_sdk::*;

fn main() {
    println!("Testing everything-sdk API");
    
    // 尝试创建 searcher
    let mut searcher = EverythingSearcher::new();
    
    // 设置搜索
    searcher.set_search("test");
    
    // 设置最大结果
    searcher.set_max(10);
    
    // 执行查询
    let results = searcher.query();
    
    println!("Results: {:?}", results);
}
