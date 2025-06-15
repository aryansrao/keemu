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

// Circular progress animation
function animateCircularProgress(element, percentage) {
  const circle = element;
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;
  
  gsap.to(circle, {
    strokeDashoffset: circumference - (percentage / 100) * circumference,
    duration: 1.5,
    ease: "power2.out"
  });
}

// Update system information display
async function updateSystemInfo() {
  try {
    const systemInfo = await invoke('get_system_info');
    
    // Update CPU usage
    document.getElementById('cpu-percentage').textContent = `${systemInfo.cpu_usage.toFixed(1)}%`;
    animateCircularProgress(document.getElementById('cpu-circle'), systemInfo.cpu_usage);
    
    // Update memory usage
    const memoryGb = systemInfo.memory_usage / (1024 * 1024 * 1024);
    const totalMemoryGb = systemInfo.total_memory / (1024 * 1024 * 1024);
    
    document.getElementById('memory-percentage').textContent = `${systemInfo.memory_percent.toFixed(1)}%`;
    document.getElementById('memory-used').textContent = `${memoryGb.toFixed(1)} GB`;
    document.getElementById('memory-total').textContent = `${totalMemoryGb.toFixed(1)} GB`;
    animateCircularProgress(document.getElementById('memory-circle'), systemInfo.memory_percent);
    
    // Update system information
    document.getElementById('system-name').textContent = systemInfo.system_name;
    document.getElementById('kernel-version').textContent = systemInfo.kernel_version;
    document.getElementById('host-name').textContent = systemInfo.host_name;
    document.getElementById('uptime').textContent = formatUptime(systemInfo.uptime);
    document.getElementById('process-count').textContent = systemInfo.process_count.toLocaleString();
    
    // Update disk usage
    const diskList = document.getElementById('disk-list');
    diskList.innerHTML = '';
    
    systemInfo.disk_usage.forEach((disk, index) => {
      const diskItem = document.createElement('div');
      diskItem.className = 'disk-item';
      
      diskItem.innerHTML = `
        <div class="disk-header">
          <span class="disk-name">${disk.mount_point}</span>
          <span class="disk-usage">${disk.usage_percent.toFixed(1)}%</span>
        </div>
        <div class="disk-bar">
          <div class="disk-fill" style="width: 0%"></div>
        </div>
        <div class="metric">
          <span class="label">USED</span>
          <span class="value">${formatBytes(disk.used_space)}</span>
        </div>
        <div class="metric">
          <span class="label">FREE</span>
          <span class="value">${formatBytes(disk.available_space)}</span>
        </div>
      `;
      
      diskList.appendChild(diskItem);
      
      // Animate disk bar
      const diskFill = diskItem.querySelector('.disk-fill');
      gsap.to(diskFill, {
        width: `${disk.usage_percent}%`,
        duration: 1,
        delay: index * 0.1,
        ease: "power2.out"
      });
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
    
    processes.forEach((process, index) => {
      const processItem = document.createElement('div');
      processItem.className = 'process-item';
      
      processItem.innerHTML = `
        <span class="process-name" title="${process.name}">${process.name}</span>
        <span class="process-cpu">${process.cpu_usage.toFixed(1)}%</span>
        <span class="process-memory">${formatBytes(process.memory)}</span>
      `;
      
      processList.appendChild(processItem);
      
      // Animate process items
      gsap.fromTo(processItem, 
        { opacity: 0, x: -20 },
        { 
          opacity: 1, 
          x: 0, 
          duration: 0.3, 
          delay: index * 0.05,
          ease: "power2.out"
        }
      );
    });
    
  } catch (error) {
    console.error('Error fetching processes:', error);
  }
}

// Refresh all data
async function refreshData() {
  try {
    await Promise.all([
      updateSystemInfo(),
      updateTopProcesses()
    ]);
  } catch (error) {
    console.error('Error refreshing data:', error);
  }
}

// Initialize animations
function initializeAnimations() {
  // Animate cards on load
  gsap.set('[data-fade]', { opacity: 0, y: 30 });
  
  gsap.to('[data-fade]', {
    opacity: 1,
    y: 0,
    duration: 0.8,
    stagger: {
      amount: 0.6,
      from: "start"
    },
    ease: "power2.out"
  });
}

// Initialize the application
window.addEventListener("DOMContentLoaded", () => {
  // Initialize animations
  initializeAnimations();
  
  // Initial data load
  refreshData();
  
  // Set up auto-refresh every 2 seconds
  refreshInterval = setInterval(refreshData, 2000);
});

// Clean up on window unload
window.addEventListener("beforeunload", () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
