use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks, Networks};
use tauri::Manager;
use std::process::Command;

#[derive(Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub total_memory: u64,
    pub memory_percent: f32,
    pub disk_usage: Vec<DiskInfo>,
    pub network_interfaces: Vec<NetworkInfo>,
    pub network_details: NetworkInterfaceDetails,
    pub process_count: usize,
    pub uptime: u64,
    pub system_name: String,
    pub kernel_version: String,
    pub host_name: String,
}

#[derive(Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub used_space: u64,
    pub usage_percent: f32,
}

#[derive(Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64,
}

#[derive(Serialize, Deserialize)]
pub struct NetworkInfo {
    pub interface_name: String,
    pub bytes_received: u64,
    pub bytes_transmitted: u64,
    pub packets_received: u64,
    pub packets_transmitted: u64,
    pub errors_received: u64,
    pub errors_transmitted: u64,
}

#[derive(Serialize, Deserialize)]
pub struct NetworkInterfaceDetails {
    pub ipv4_address: String,
    pub ipv6_address: String,
    pub mac_address: String,
    pub frequency: String,
    pub signal_strength: String,
    pub dns_servers: Vec<String>,
}

fn get_network_interface_details() -> NetworkInterfaceDetails {
    // Get network info using system commands (macOS/Linux compatible)
    if cfg!(target_os = "macos") {
        if let Ok(output) = Command::new("ifconfig").output() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            return parse_macos_network_info(&output_str);
        }
    } else if cfg!(target_os = "linux") {
        // Basic Linux support
        return NetworkInterfaceDetails {
            ipv4_address: get_linux_ipv4(),
            ipv6_address: get_linux_ipv6(),
            mac_address: get_linux_mac(),
            frequency: "N/A".to_string(),
            signal_strength: "N/A".to_string(),
            dns_servers: get_linux_dns(),
        };
    } else if cfg!(target_os = "windows") {
        // Basic Windows support
        return NetworkInterfaceDetails {
            ipv4_address: get_windows_ipv4(),
            ipv6_address: get_windows_ipv6(),
            mac_address: get_windows_mac(),
            frequency: "N/A".to_string(),
            signal_strength: "N/A".to_string(),
            dns_servers: get_windows_dns(),
        };
    }
    
    // Fallback
    NetworkInterfaceDetails {
        ipv4_address: "N/A".to_string(),
        ipv6_address: "N/A".to_string(),
        mac_address: "N/A".to_string(),
        frequency: "N/A".to_string(),
        signal_strength: "N/A".to_string(),
        dns_servers: vec![],
    }
}

fn parse_macos_network_info(output: &str) -> NetworkInterfaceDetails {
    let mut ipv4_address = String::new();
    let mut ipv6_address = String::new();
    let mut mac_address = String::new();
    let mut frequency = "N/A".to_string();
    let mut signal_strength = "N/A".to_string();
    let mut dns_servers = Vec::new();
    
    // Parse ifconfig output for active interfaces
    for line in output.lines() {
        let line = line.trim();
        
        // Get IPv4 address
        if line.contains("inet ") && !line.contains("127.0.0.1") && !line.contains("inet6") {
            if let Some(inet_part) = line.split("inet ").nth(1) {
                if let Some(ip_part) = inet_part.split_whitespace().next() {
                    if ipv4_address.is_empty() {
                        ipv4_address = ip_part.to_string();
                    }
                }
            }
        }
        
        // Get IPv6 address
        if line.contains("inet6 ") && !line.contains("::1") && !line.contains("fe80") {
            if let Some(inet6_part) = line.split("inet6 ").nth(1) {
                if let Some(ip6_part) = inet6_part.split_whitespace().next() {
                    if ipv6_address.is_empty() {
                        ipv6_address = ip6_part.to_string();
                    }
                }
            }
        }
        
        // Get MAC address
        if line.contains("ether ") && mac_address.is_empty() {
            if let Some(ether_part) = line.split("ether ").nth(1) {
                if let Some(mac_part) = ether_part.split_whitespace().next() {
                    mac_address = mac_part.to_string();
                }
            }
        }
    }
    
    // Get DNS servers
    if let Ok(dns_output) = Command::new("scutil").args(&["--dns"]).output() {
        let dns_str = String::from_utf8_lossy(&dns_output.stdout);
        for line in dns_str.lines() {
            if line.trim().starts_with("nameserver[") {
                if let Some(dns_part) = line.split(" : ").nth(1) {
                    dns_servers.push(dns_part.trim().to_string());
                }
            }
        }
    }
    
    // Get WiFi info (frequency and signal strength)
    if let Ok(wifi_output) = Command::new("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport")
        .args(&["-I"]).output() {
        let wifi_str = String::from_utf8_lossy(&wifi_output.stdout);
        for line in wifi_str.lines() {
            let line = line.trim();
            if line.contains("channel: ") {
                if let Some(freq_part) = line.split("channel: ").nth(1) {
                    frequency = format!("{} GHz", freq_part.trim());
                }
            }
            if line.contains("agrCtlRSSI: ") {
                if let Some(signal_part) = line.split("agrCtlRSSI: ").nth(1) {
                    signal_strength = format!("{} dBm", signal_part.trim());
                }
            }
        }
    }
    
    NetworkInterfaceDetails {
        ipv4_address: if ipv4_address.is_empty() { "N/A".to_string() } else { ipv4_address },
        ipv6_address: if ipv6_address.is_empty() { "N/A".to_string() } else { ipv6_address },
        mac_address: if mac_address.is_empty() { "N/A".to_string() } else { mac_address },
        frequency,
        signal_strength,
        dns_servers,
    }
}

// Placeholder functions for other platforms
fn get_linux_ipv4() -> String { "N/A".to_string() }
fn get_linux_ipv6() -> String { "N/A".to_string() }
fn get_linux_mac() -> String { "N/A".to_string() }
fn get_linux_dns() -> Vec<String> { vec![] }

fn get_windows_ipv4() -> String { "N/A".to_string() }
fn get_windows_ipv6() -> String { "N/A".to_string() }
fn get_windows_mac() -> String { "N/A".to_string() }
fn get_windows_dns() -> Vec<String> { vec![] }

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // Calculate CPU usage
    let cpu_usage = sys.global_cpu_info().cpu_usage();
    
    // Memory information
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let memory_percent = (used_memory as f32 / total_memory as f32) * 100.0;
    
    // Disk information
    let disks = Disks::new_with_refreshed_list();
    let disk_usage: Vec<DiskInfo> = disks.iter().map(|disk| {
        let total = disk.total_space();
        let available = disk.available_space();
        let used = total - available;
        let usage_percent = if total > 0 { (used as f32 / total as f32) * 100.0 } else { 0.0 };
        
        DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total_space: total,
            available_space: available,
            used_space: used,
            usage_percent,
        }
    }).collect();
    
    // Process count
    let process_count = sys.processes().len();
    
    // Network information
    let networks = Networks::new_with_refreshed_list();
    let network_interfaces: Vec<NetworkInfo> = networks.iter().map(|(interface_name, data)| {
        NetworkInfo {
            interface_name: interface_name.clone(),
            bytes_received: data.total_received(),
            bytes_transmitted: data.total_transmitted(),
            packets_received: data.total_packets_received(),
            packets_transmitted: data.total_packets_transmitted(),
            errors_received: data.total_errors_on_received(),
            errors_transmitted: data.total_errors_on_transmitted(),
        }
    }).collect();
    
    // Network interface details
    let network_details = get_network_interface_details();
    
    // System information
    let system_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let kernel_version = System::kernel_version().unwrap_or_else(|| "Unknown".to_string());
    let host_name = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    let uptime = System::uptime();
    
    Ok(SystemInfo {
        cpu_usage,
        memory_usage: used_memory,
        total_memory,
        memory_percent,
        disk_usage,
        network_interfaces,
        network_details,
        process_count,
        uptime,
        system_name,
        kernel_version,
        host_name,
    })
}

#[tauri::command]
async fn get_top_processes() -> Result<Vec<ProcessInfo>, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let mut processes: Vec<ProcessInfo> = sys.processes()
        .iter()
        .map(|(pid, process)| ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string(),
            cpu_usage: process.cpu_usage(),
            memory: process.memory(),
        })
        .collect();
    
    // Sort by CPU usage (descending) and take top 10
    processes.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap());
    processes.truncate(10);
    
    Ok(processes)
}

#[tauri::command]
async fn create_detached_window(
    app: tauri::AppHandle,
    component: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let window_id = format!("detached_{}", component);
    
    if app.get_webview_window(&window_id).is_some() {
        return Err("Window already exists".to_string());
    }
    
    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_id,
        tauri::WebviewUrl::App(format!("detached.html?component={}", component).into())
    )
    .title("")
    .inner_size(width, height)
    .min_inner_size(300.0, 200.0)
    .resizable(true)
    .decorations(true)
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn close_current_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_drag(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_system_info, 
            get_top_processes, 
            create_detached_window,
            close_current_window,
            start_drag
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
