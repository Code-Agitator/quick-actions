use std::collections::HashMap;
use serde::{Deserialize, Serialize};

/// 进程信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu: f64,
    pub memory: u64,
    pub status: String,
    pub user: String,
    pub start_time: String,
    pub command_line: String,
    pub threads: u32,
    pub handles: u32,
    pub ports: Option<Vec<u16>>,
    pub files: Option<Vec<String>>,
}

/// 列出所有进程
#[tauri::command]
pub fn process_list() -> Result<Vec<ProcessInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        list_processes_windows()
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 根据 PID 获取进程详情
#[tauri::command]
pub fn process_get(pid: u32) -> Result<Option<ProcessInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        get_process_by_pid_windows(pid)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 根据名称搜索进程
#[tauri::command]
pub fn process_search_by_name(name: String) -> Result<Vec<ProcessInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        search_by_name_windows(&name)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 根据端口查找进程
#[tauri::command]
pub fn process_find_by_port(port: u16) -> Result<Vec<ProcessInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        find_by_port_windows(port)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 根据文件路径查找占用该文件的进程
#[tauri::command]
pub fn process_find_by_file(file_path: String) -> Result<Vec<ProcessInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        find_by_file_windows(&file_path)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 终止进程
#[tauri::command]
pub fn process_kill(pid: u32) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        kill_process_windows(pid)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 优雅地终止进程
#[tauri::command]
pub fn process_graceful_kill(pid: u32) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        graceful_kill_windows(pid)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 获取进程的 CPU 和内存使用率
#[tauri::command]
pub fn process_get_stats(pid: u32) -> Result<HashMap<String, f64>, String> {
    #[cfg(target_os = "windows")]
    {
        get_process_stats_windows(pid)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 获取进程打开的文件句柄
#[tauri::command]
pub fn process_get_open_files(pid: u32) -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        get_open_files_windows(pid)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

/// 获取进程监听的端口
#[tauri::command]
pub fn process_get_listening_ports(pid: u32) -> Result<Vec<u16>, String> {
    #[cfg(target_os = "windows")]
    {
        get_listening_ports_windows(pid)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Process management is only supported on Windows".to_string())
    }
}

// ==================== Windows 实现 ====================

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::*;
    use std::process::Command;

    /// 列出所有 Windows 进程
    pub fn list_processes_windows() -> Result<Vec<ProcessInfo>, String> {
        // 使用 tasklist 命令获取进程列表
        let output = Command::new("tasklist")
            .args(&["/FO", "CSV", "/NH"])
            .output()
            .map_err(|e| format!("Failed to execute tasklist: {}", e))?;

        if !output.status.success() {
            return Err("tasklist command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut processes = Vec::new();

        for line in stdout.lines() {
            if let Some(process) = parse_tasklist_line(line) {
                processes.push(process);
            }
        }

        Ok(processes)
    }

    /// 解析 tasklist 输出行
    fn parse_tasklist_line(line: &str) -> Option<ProcessInfo> {
        // CSV 格式: "Image Name","PID","Session Name","Session#","Mem Usage"
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 5 {
            return None;
        }

        let name = parts[0].trim_matches('"').to_string();
        let pid = parts[1].trim_matches('"').parse::<u32>().ok()?;
        let memory_str = parts[4].trim_matches('"').replace(",", "").replace(" K", "");
        let memory = memory_str.parse::<u64>().ok().unwrap_or(0) * 1024; // 转换为字节

        Some(ProcessInfo {
            pid,
            name,
            cpu: 0.0,
            memory,
            status: "Running".to_string(),
            user: "Unknown".to_string(),
            start_time: String::new(),
            command_line: String::new(),
            threads: 0,
            handles: 0,
            ports: None,
            files: None,
        })
    }

    /// 根据 PID 获取进程详情
    pub fn get_process_by_pid_windows(pid: u32) -> Result<Option<ProcessInfo>, String> {
        let processes = list_processes_windows()?;
        Ok(processes.into_iter().find(|p| p.pid == pid))
    }

    /// 根据名称搜索进程
    pub fn search_by_name_windows(name: &str) -> Result<Vec<ProcessInfo>, String> {
        let processes = list_processes_windows()?;
        let name_lower = name.to_lowercase();
        
        Ok(processes.into_iter()
            .filter(|p| p.name.to_lowercase().contains(&name_lower))
            .collect())
    }

    /// 根据端口查找进程
    pub fn find_by_port_windows(port: u16) -> Result<Vec<ProcessInfo>, String> {
        // 使用 netstat 命令查找占用端口的进程
        let output = Command::new("netstat")
            .args(&["-ano"])
            .output()
            .map_err(|e| format!("Failed to execute netstat: {}", e))?;

        if !output.status.success() {
            return Err("netstat command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut pids = Vec::new();

        // 解析 netstat 输出，查找指定端口
        for line in stdout.lines() {
            if line.contains(&format!(":{}", port)) && (line.contains("LISTENING") || line.contains("ESTABLISHED")) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if let Some(last_part) = parts.last() {
                    if let Ok(pid) = last_part.parse::<u32>() {
                        pids.push(pid);
                    }
                }
            }
        }

        // 去重
        pids.sort();
        pids.dedup();

        // 获取进程信息
        let all_processes = list_processes_windows()?;
        let result = all_processes.into_iter()
            .filter(|p| pids.contains(&p.pid))
            .collect();

        Ok(result)
    }

    /// 根据文件路径查找占用该文件的进程
    pub fn find_by_file_windows(file_path: &str) -> Result<Vec<ProcessInfo>, String> {
        // 使用 PowerShell 命令查找占用文件的进程
        let ps_command = format!(
            r#"Get-Process | Where-Object {{ $_.Modules.FileName -like "*{}*" }} | Select-Object Id,ProcessName"#,
            file_path.replace("\\", "\\\\")
        );

        let output = Command::new("powershell")
            .args(&["-Command", &ps_command])
            .output()
            .map_err(|e| format!("Failed to execute powershell: {}", e))?;

        if !output.status.success() {
            return Err("PowerShell command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut pids = Vec::new();

        // 解析 PowerShell 输出
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                if let Ok(pid) = parts[0].parse::<u32>() {
                    pids.push(pid);
                }
            }
        }

        // 获取进程信息
        let all_processes = list_processes_windows()?;
        let result = all_processes.into_iter()
            .filter(|p| pids.contains(&p.pid))
            .collect();

        Ok(result)
    }

    /// 终止进程
    pub fn kill_process_windows(pid: u32) -> Result<bool, String> {
        let output = Command::new("taskkill")
            .args(&["/F", "/PID", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to execute taskkill: {}", e))?;

        Ok(output.status.success())
    }

    /// 优雅地终止进程
    pub fn graceful_kill_windows(pid: u32) -> Result<bool, String> {
        let output = Command::new("taskkill")
            .args(&["/PID", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to execute taskkill: {}", e))?;

        Ok(output.status.success())
    }

    /// 获取进程统计信息
    pub fn get_process_stats_windows(_pid: u32) -> Result<HashMap<String, f64>, String> {
        // 简化实现，返回默认值
        let mut stats = HashMap::new();
        stats.insert("cpu".to_string(), 0.0);
        stats.insert("memory".to_string(), 0.0);
        
        Ok(stats)
    }

    /// 获取进程打开的文件
    pub fn get_open_files_windows(_pid: u32) -> Result<Vec<String>, String> {
        // 需要使用 Sysinternals handle.exe 或更高级的 API
        // 这里返回空列表
        Ok(Vec::new())
    }

    /// 获取进程监听的端口
    pub fn get_listening_ports_windows(pid: u32) -> Result<Vec<u16>, String> {
        let output = Command::new("netstat")
            .args(&["-ano"])
            .output()
            .map_err(|e| format!("Failed to execute netstat: {}", e))?;

        if !output.status.success() {
            return Err("netstat command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut ports = Vec::new();

        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 5 {
                if let Some(last_part) = parts.last() {
                    if *last_part == pid.to_string() {
                        if let Some(local_addr) = parts.get(1) {
                            if let Some(port_str) = local_addr.split(':').last() {
                                if let Ok(port) = port_str.parse::<u16>() {
                                    ports.push(port);
                                }
                            }
                        }
                    }
                }
            }
        }

        ports.sort();
        ports.dedup();

        Ok(ports)
    }
}

#[cfg(target_os = "windows")]
use windows_impl::*;
