const { invoke } = window.__TAURI__.core;

let refreshInterval = null;

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function getProgressBarClass(percentage) {
  if (percentage >= 90) return 'danger';
  if (percentage >= 70) return 'warning';
  return '';
}

function getStatusIndicator(percentage) {
  if (percentage >= 90) return 'status-danger';
  if (percentage >= 70) return 'status-warning';
  return 'status-good';
}

// Update system information display
async function updateSystemInfo() {
  try {
    const systemInfo = await invoke('get_system_info');
    
    // Update CPU usage
    document.getElementById('cpu-usage').textContent = `${systemInfo.cpu_usage.toFixed(1)}%`;
    const cpuProgress = document.getElementById('cpu-progress');
    cpuProgress.style.width = `${systemInfo.cpu_usage}%`;
    cpuProgress.className = `progress-fill ${getProgressBarClass(systemInfo.cpu_usage)}`;
    
    // Update memory usage
    const memoryGb = systemInfo.memory_usage / (1024 * 1024 * 1024);
    const totalMemoryGb = systemInfo.total_memory / (1024 * 1024 * 1024);
    document.getElementById('memory-usage').textContent = 
      `${memoryGb.toFixed(1)} GB / ${totalMemoryGb.toFixed(1)} GB`;
    
    const memoryProgress = document.getElementById('memory-progress');
    memoryProgress.style.width = `${systemInfo.memory_percent}%`;
    memoryProgress.className = `progress-fill ${getProgressBarClass(systemInfo.memory_percent)}`;
    
    // Update system information
    document.getElementById('hostname').textContent = systemInfo.host_name;
    document.getElementById('os-name').textContent = systemInfo.system_name;
    document.getElementById('kernel-version').textContent = systemInfo.kernel_version;
    document.getElementById('uptime').textContent = formatUptime(systemInfo.uptime);
    document.getElementById('process-count').textContent = systemInfo.process_count.toLocaleString();
    
    // Update disk usage
    const diskList = document.getElementById('disk-list');
    diskList.innerHTML = '';
    
    systemInfo.disk_usage.forEach(disk => {
      const diskItem = document.createElement('div');
      diskItem.className = 'disk-item';
      
      const diskHeader = document.createElement('div');
      diskHeader.className = 'disk-header';
      diskHeader.innerHTML = `
        <span>
          <span class="status-indicator ${getStatusIndicator(disk.usage_percent)}"></span>
          ${disk.mount_point}
        </span>
        <span>${disk.usage_percent.toFixed(1)}%</span>
      `;
      
      const diskProgress = document.createElement('div');
      diskProgress.className = 'progress-bar';
      diskProgress.innerHTML = `
        <div class="progress-fill ${getProgressBarClass(disk.usage_percent)}" 
             style="width: ${disk.usage_percent}%"></div>
      `;
      
      const diskInfo = document.createElement('div');
      diskInfo.className = 'metric';
      diskInfo.innerHTML = `
        <span class="metric-label">Used: ${formatBytes(disk.used_space)}</span>
        <span class="metric-value">Free: ${formatBytes(disk.available_space)}</span>
      `;
      
      diskItem.appendChild(diskHeader);
      diskItem.appendChild(diskProgress);
      diskItem.appendChild(diskInfo);
      diskList.appendChild(diskItem);
    });
    
  } catch (error) {
    console.error('Error fetching system info:', error);
  }
}

// Update top processes
async function updateTopProcesses() {
  try {
    const processes = await invoke('get_top_processes');
    const processList = document.getElementById('process-list');
    
    processList.innerHTML = '';
    
    processes.forEach(process => {
      const processItem = document.createElement('div');
      processItem.className = 'process-item';
      
      processItem.innerHTML = `
        <span>${process.pid}</span>
        <span title="${process.name}">${process.name}</span>
        <span>${process.cpu_usage.toFixed(1)}%</span>
        <span>${formatBytes(process.memory)}</span>
      `;
      
      processList.appendChild(processItem);
    });
    
  } catch (error) {
    console.error('Error fetching processes:', error);
  }
}

// Refresh all data
async function refreshData() {
  const loadingSpinner = document.getElementById('loading');
  const refreshBtn = document.getElementById('refresh-btn');
  
  loadingSpinner.style.display = 'inline-block';
  refreshBtn.disabled = true;
  
  try {
    await Promise.all([
      updateSystemInfo(),
      updateTopProcesses()
    ]);
  } catch (error) {
    console.error('Error refreshing data:', error);
  } finally {
    loadingSpinner.style.display = 'none';
    refreshBtn.disabled = false;
  }
}

// Initialize the application
window.addEventListener("DOMContentLoaded", () => {
  const refreshBtn = document.getElementById('refresh-btn');
  
  // Set up refresh button
  refreshBtn.addEventListener('click', refreshData);
  
  // Initial data load
  refreshData();
  
  // Set up auto-refresh every 5 seconds
  refreshInterval = setInterval(refreshData, 5000);
});

// Clean up on window unload
window.addEventListener("beforeunload", () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
