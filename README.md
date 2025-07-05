#  Keemu System Monitor

A modern, real-time system monitoring application built with Tauri, providing comprehensive insights into your system's performance and resource usage.

##  Features

- **Real-time Monitoring**: Live updates of CPU, memory, and disk usage
- **Process Management**: View top processes by CPU usage
- **System Information**: Display hostname, OS, kernel version, and uptime
- **Modern UI**: Beautiful glass-morphism design with responsive layout
- **Cross-platform**: Built with Tauri for optimal performance on macOS, Windows, and Linux

##  Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable version)
- [Tauri CLI](https://tauri.app/develop/getting-started/) - Install with: `cargo install tauri-cli`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aryansrao/keemu
   cd keemu
   ```

2. Run in development mode:
   ```bash
   cargo tauri dev
   ```

3. Build for production:
   ```bash
   cargo tauri build
   ```

##  System Metrics

- **CPU Usage**: Real-time CPU utilization percentage
- **Memory Usage**: RAM consumption with total/used breakdown
- **Disk Usage**: Storage utilization for all mounted drives
- **Process List**: Top 10 processes by CPU usage
- **System Info**: Hostname, OS version, kernel, and uptime

##  Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Rust with Tauri framework
- **System Info**: sysinfo crate for cross-platform system monitoring
- **UI Design**: Glass-morphism with CSS gradients and backdrop filters



## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
