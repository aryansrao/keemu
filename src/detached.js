const { invoke } = window.__TAURI__.core;

let refreshInterval = null;
let componentType = null;

// Close window function
async function closeWindow() {
  try {
    await invoke('close_current_window');
  } catch (error) {
    console.error('Failed to close window:', error);
    // Fallback method
    try {
      const { getCurrentWebviewWindow } = window.__TAURI__.webviewWindow;
      const webviewWindow = getCurrentWebviewWindow();
      await webviewWindow.close();
    } catch (fallbackError) {
      console.error('Fallback close also failed:', fallbackError);
    }
  }
}

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

function formatNetworkData(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Circular progress animation
function animateCircularProgress(element, percentage) {
  const circle = element;
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference - (percentage / 100) * circumference;
}

// Component renderers
function renderCPU(systemInfo) {
  return `
    <div class="card cpu-card">
      <div class="card-header">
        <h2>CPU MONITOR</h2>
      </div>
      <div class="card-content">
        <div class="gauge-container">
          <div class="circular-progress">
            <svg class="progress-ring" width="160" height="160">
              <circle class="progress-ring-circle" cx="80" cy="80" r="70" stroke="#333" stroke-width="12" fill="transparent"/>
              <circle class="progress-ring-progress" cx="80" cy="80" r="70" stroke="#00ff88" stroke-width="12" fill="transparent" id="cpu-circle"/>
            </svg>
            <div class="progress-text">
              <span id="cpu-percentage" class="percentage large">${systemInfo.cpu_usage.toFixed(1)}%</span>
              <span class="unit">CPU</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMemory(systemInfo) {
  const memoryGb = systemInfo.memory_usage / (1024 * 1024 * 1024);
  const totalMemoryGb = systemInfo.total_memory / (1024 * 1024 * 1024);
  
  return `
    <div class="card memory-card">
      <div class="card-header">
        <h2>MEMORY MONITOR</h2>
      </div>
      <div class="card-content">
        <div class="gauge-container">
          <div class="circular-progress">
            <svg class="progress-ring" width="160" height="160">
              <circle class="progress-ring-circle" cx="80" cy="80" r="70" stroke="#333" stroke-width="12" fill="transparent"/>
              <circle class="progress-ring-progress" cx="80" cy="80" r="70" stroke="#ff0066" stroke-width="12" fill="transparent" id="memory-circle"/>
            </svg>
            <div class="progress-text">
              <span id="memory-percentage" class="percentage large">${systemInfo.memory_percent.toFixed(1)}%</span>
              <span class="unit">RAM</span>
            </div>
          </div>
        </div>
        <div class="memory-details">
          <div class="memory-stat">
            <span class="stat-label">USED</span>
            <span id="memory-used" class="stat-value">${memoryGb.toFixed(1)} GB</span>
          </div>
          <div class="memory-stat">
            <span class="stat-label">TOTAL</span>
            <span id="memory-total" class="stat-value">${totalMemoryGb.toFixed(1)} GB</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStorage(systemInfo) {
  let diskHTML = '';
  systemInfo.disk_usage.forEach(disk => {
    diskHTML += `
      <div class="disk-item">
        <div class="disk-header">
          <span class="disk-name">${disk.mount_point}</span>
          <span class="disk-usage">${disk.usage_percent.toFixed(1)}%</span>
        </div>
        <div class="disk-bar">
          <div class="disk-fill" style="width: ${disk.usage_percent}%"></div>
        </div>
        <div class="metric">
          <span class="label">USED</span>
          <span class="value">${formatBytes(disk.used_space)}</span>
        </div>
        <div class="metric">
          <span class="label">FREE</span>
          <span class="value">${formatBytes(disk.available_space)}</span>
        </div>
      </div>
    `;
  });
  
  return `
    <div class="card disk-card">
      <div class="card-header">
        <h2>STORAGE MONITOR</h2>
      </div>
      <div class="card-content">
        <div class="disk-list">
          ${diskHTML}
        </div>
      </div>
    </div>
  `;
}

function renderOverview(systemInfo) {
  return `
    <div class="card system-overview">
      <div class="card-header">
        <h2>SYSTEM OVERVIEW</h2>
      </div>
      <div class="card-content">
        <div class="metric">
          <span class="label">SYSTEM</span>
          <span class="value">${systemInfo.system_name}</span>
        </div>
        <div class="metric">
          <span class="label">KERNEL</span>
          <span class="value">${systemInfo.kernel_version}</span>
        </div>
        <div class="metric">
          <span class="label">HOST</span>
          <span class="value">${systemInfo.host_name}</span>
        </div>
        <div class="metric">
          <span class="label">UPTIME</span>
          <span class="value">${formatUptime(systemInfo.uptime)}</span>
        </div>
        <div class="metric">
          <span class="label">PROCESSES</span>
          <span class="value">${systemInfo.process_count.toLocaleString()}</span>
        </div>
      </div>
    </div>
  `;
}

function renderNetwork(systemInfo) {
  let networkHTML = '';
  
  systemInfo.network_interfaces.forEach(network => {
    const totalErrors = network.errors_received + network.errors_transmitted;
    
    networkHTML += `
      <div class="network-item">
        <span class="network-name" title="${network.interface_name}">${network.interface_name}</span>
        <span class="network-rx">${formatNetworkData(network.bytes_received)}</span>
        <span class="network-tx">${formatNetworkData(network.bytes_transmitted)}</span>
        <span class="network-errors ${totalErrors > 0 ? 'has-errors' : ''}">${totalErrors.toLocaleString()}</span>
      </div>
    `;
  });
  
  return `
    <div class="card network-card">
      <div class="card-header">
        <h2>NETWORK MONITOR</h2>
      </div>
      <div class="card-content">
        <div class="network-list">
          <div class="network-header">
            <span>INTERFACE</span>
            <span>RX</span>
            <span>TX</span>
            <span>ERRORS</span>
          </div>
          <div class="network-interfaces">
            ${networkHTML}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderNetworkInfo(systemInfo) {
  // Format DNS servers nicely
  let dnsDisplay = 'N/A';
  if (systemInfo.network_details.dns_servers.length > 0) {
    const primaryDns = systemInfo.network_details.dns_servers.slice(0, 2);
    dnsDisplay = primaryDns.join('<br>');
  }

  return `
    <div class="card network-info-card">
      <div class="card-header">
        <h2>NETWORK INFO MONITOR</h2>
      </div>
      <div class="card-content">
        <div class="metric">
          <span class="label">IPv4</span>
          <span class="value">${systemInfo.network_details.ipv4_address}</span>
        </div>
        <div class="metric">
          <span class="label">IPv6</span>
          <span class="value">${systemInfo.network_details.ipv6_address}</span>
        </div>
        <div class="metric">
          <span class="label">MAC</span>
          <span class="value">${systemInfo.network_details.mac_address}</span>
        </div>
        <div class="metric">
          <span class="label">FREQUENCY</span>
          <span class="value">${systemInfo.network_details.frequency}</span>
        </div>
        <div class="metric">
          <span class="label">SIGNAL</span>
          <span class="value">${systemInfo.network_details.signal_strength}</span>
        </div>
        <div class="metric">
          <span class="label">DNS</span>
          <span class="value dns-list">${dnsDisplay}</span>
        </div>
      </div>
    </div>
  `;
}

async function renderProcesses() {
  try {
    const processes = await invoke('get_top_processes');
    let processHTML = '';
    
    processes.forEach(process => {
      processHTML += `
        <div class="process-item">
          <span class="process-name" title="${process.name}">${process.name}</span>
          <span class="process-cpu">${process.cpu_usage.toFixed(1)}%</span>
          <span class="process-memory">${formatBytes(process.memory)}</span>
        </div>
      `;
    });
    
    return `
      <div class="card processes-card">
        <div class="card-header">
          <h2>PROCESS MONITOR</h2>
        </div>
        <div class="card-content">
          <div class="process-list">
            <div class="process-header">
              <span>NAME</span>
              <span>CPU</span>
              <span>MEMORY</span>
            </div>
            <div class="processes">
              ${processHTML}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error fetching processes:', error);
    return '<div class="error">Error loading processes</div>';
  }
}

// Update component data
async function updateComponent() {
  try {
    const content = document.getElementById('detached-content');
    
    if (componentType === 'processes') {
      content.innerHTML = await renderProcesses();
    } else {
      const systemInfo = await invoke('get_system_info');
      
      switch (componentType) {
        case 'cpu':
          content.innerHTML = renderCPU(systemInfo);
          animateCircularProgress(document.getElementById('cpu-circle'), systemInfo.cpu_usage);
          break;
        case 'memory':
          content.innerHTML = renderMemory(systemInfo);
          animateCircularProgress(document.getElementById('memory-circle'), systemInfo.memory_percent);
          break;
        case 'storage':
          content.innerHTML = renderStorage(systemInfo);
          break;
        case 'overview':
          content.innerHTML = renderOverview(systemInfo);
          break;
        case 'network':
          content.innerHTML = renderNetwork(systemInfo);
          break;
        case 'network-info':
          content.innerHTML = renderNetworkInfo(systemInfo);
          break;
      }
    }
  } catch (error) {
    console.error('Error updating component:', error);
  }
}

// Initialize detached window
window.addEventListener("DOMContentLoaded", () => {
  // Get component type from URL
  const urlParams = new URLSearchParams(window.location.search);
  componentType = urlParams.get('component');
  
  if (!componentType) {
    document.getElementById('detached-content').innerHTML = '<div class="error">Invalid component type</div>';
    return;
  }
  
  // Initial load
  updateComponent();
  
  // Set up auto-refresh every 2 seconds
  refreshInterval = setInterval(updateComponent, 2000);
});

// Clean up on window unload
window.addEventListener("beforeunload", () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
