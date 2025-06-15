const { invoke } = window.__TAURI__.core;

let refreshInterval = null;
let isInitialized = false;

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
function animateCircularProgress(element, percentage, animate = true) {
  const circle = element;
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  
  if (animate) {
    circle.style.strokeDashoffset = circumference;
    gsap.to(circle, {
      strokeDashoffset: circumference - (percentage / 100) * circumference,
      duration: 1.5,
      ease: "power2.out"
    });
  } else {
    // For data updates, just set the value without animation
    circle.style.strokeDashoffset = circumference - (percentage / 100) * circumference;
  }
}

// Update system information display
async function updateSystemInfo() {
  try {
    const systemInfo = await invoke('get_system_info');
    
    // Update CPU usage
    document.getElementById('cpu-percentage').textContent = `${systemInfo.cpu_usage.toFixed(1)}%`;
    animateCircularProgress(document.getElementById('cpu-circle'), systemInfo.cpu_usage, !isInitialized);
    
    // Update memory usage
    const memoryGb = systemInfo.memory_usage / (1024 * 1024 * 1024);
    const totalMemoryGb = systemInfo.total_memory / (1024 * 1024 * 1024);
    
    document.getElementById('memory-percentage').textContent = `${systemInfo.memory_percent.toFixed(1)}%`;
    document.getElementById('memory-used').textContent = `${memoryGb.toFixed(1)} GB`;
    document.getElementById('memory-total').textContent = `${totalMemoryGb.toFixed(1)} GB`;
    animateCircularProgress(document.getElementById('memory-circle'), systemInfo.memory_percent, !isInitialized);
    
    // Update system information
    document.getElementById('system-name').textContent = systemInfo.system_name;
    document.getElementById('kernel-version').textContent = systemInfo.kernel_version;
    document.getElementById('host-name').textContent = systemInfo.host_name;
    document.getElementById('uptime').textContent = formatUptime(systemInfo.uptime);
    document.getElementById('process-count').textContent = systemInfo.process_count.toLocaleString();
    
    // Update disk usage
    const diskList = document.getElementById('disk-list');
    
    // Only animate disk creation on first load
    if (!isInitialized) {
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
        
        // Animate disk bar only on first load
        const diskFill = diskItem.querySelector('.disk-fill');
        gsap.to(diskFill, {
          width: `${disk.usage_percent}%`,
          duration: 1,
          delay: index * 0.1,
          ease: "power2.out"
        });
      });
    } else {
      // Just update existing disk data without recreating elements
      const diskItems = diskList.querySelectorAll('.disk-item');
      systemInfo.disk_usage.forEach((disk, index) => {
        if (diskItems[index]) {
          const diskItem = diskItems[index];
          diskItem.querySelector('.disk-name').textContent = disk.mount_point;
          diskItem.querySelector('.disk-usage').textContent = `${disk.usage_percent.toFixed(1)}%`;
          diskItem.querySelector('.disk-fill').style.width = `${disk.usage_percent}%`;
          diskItem.querySelectorAll('.value')[0].textContent = formatBytes(disk.used_space);
          diskItem.querySelectorAll('.value')[1].textContent = formatBytes(disk.available_space);
        }
      });
    }
    
    // Update network interfaces
    const networkInterfaces = document.getElementById('network-interfaces');
    
    if (!isInitialized) {
      // First load - create elements with animation
      networkInterfaces.innerHTML = '';
      
      systemInfo.network_interfaces.forEach((network, index) => {
        const networkItem = document.createElement('div');
        networkItem.className = 'network-item';
        
        const totalErrors = network.errors_received + network.errors_transmitted;
        
        networkItem.innerHTML = `
          <span class="network-name" title="${network.interface_name}">${network.interface_name}</span>
          <span class="network-rx">${formatNetworkData(network.bytes_received)}</span>
          <span class="network-tx">${formatNetworkData(network.bytes_transmitted)}</span>
          <span class="network-errors ${totalErrors > 0 ? 'has-errors' : ''}">${totalErrors.toLocaleString()}</span>
        `;
        
        networkInterfaces.appendChild(networkItem);
        
        // Animate network items only on first load
        gsap.fromTo(networkItem, 
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
    } else {
      // Just update existing network data without recreating elements
      const networkItems = networkInterfaces.querySelectorAll('.network-item');
      
      // Remove excess items if there are fewer interfaces
      while (networkItems.length > systemInfo.network_interfaces.length) {
        networkInterfaces.removeChild(networkItems[networkItems.length - 1]);
      }
      
      systemInfo.network_interfaces.forEach((network, index) => {
        let networkItem = networkItems[index];
        
        if (!networkItem) {
          // Create new item if needed (but don't animate)
          networkItem = document.createElement('div');
          networkItem.className = 'network-item';
          networkInterfaces.appendChild(networkItem);
        }
        
        const totalErrors = network.errors_received + network.errors_transmitted;
        
        // Update content without animation
        networkItem.innerHTML = `
          <span class="network-name" title="${network.interface_name}">${network.interface_name}</span>
          <span class="network-rx">${formatNetworkData(network.bytes_received)}</span>
          <span class="network-tx">${formatNetworkData(network.bytes_transmitted)}</span>
          <span class="network-errors ${totalErrors > 0 ? 'has-errors' : ''}">${totalErrors.toLocaleString()}</span>
        `;
      });
    }
    
    // Update network info
    document.getElementById('ipv4-address').textContent = systemInfo.network_details.ipv4_address;
    document.getElementById('ipv6-address').textContent = systemInfo.network_details.ipv6_address;
    document.getElementById('mac-address').textContent = systemInfo.network_details.mac_address;
    document.getElementById('frequency').textContent = systemInfo.network_details.frequency;
    document.getElementById('signal-strength').textContent = systemInfo.network_details.signal_strength;
    
    // Format DNS servers nicely
    const dnsElement = document.getElementById('dns-servers');
    if (systemInfo.network_details.dns_servers.length > 0) {
      // Take only first 2 DNS servers to avoid clutter
      const primaryDns = systemInfo.network_details.dns_servers.slice(0, 2);
      dnsElement.textContent = primaryDns.join('\n');
      dnsElement.className = 'value dns-list';
      dnsElement.style.whiteSpace = 'pre-line';
    } else {
      dnsElement.textContent = 'N/A';
      dnsElement.className = 'value';
    }
    
  } catch (error) {
    console.error('Error fetching system info:', error);
  }
}
// Update top processes
async function updateTopProcesses() {
  try {
    const processes = await invoke('get_top_processes');
    const processList = document.getElementById('process-list');
    
    if (!isInitialized) {
      // First load - create elements with animation
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
        
        // Animate process items only on first load
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
    } else {
      // Subsequent updates - just update existing data without animation
      const processItems = processList.querySelectorAll('.process-item');
      
      // Remove excess items if there are fewer processes
      while (processItems.length > processes.length) {
        processList.removeChild(processItems[processItems.length - 1]);
      }
      
      processes.forEach((process, index) => {
        let processItem = processItems[index];
        
        if (!processItem) {
          // Create new item if needed (but don't animate)
          processItem = document.createElement('div');
          processItem.className = 'process-item';
          processList.appendChild(processItem);
        }
        
        // Update content without animation
        processItem.innerHTML = `
          <span class="process-name" title="${process.name}">${process.name}</span>
          <span class="process-cpu">${process.cpu_usage.toFixed(1)}%</span>
          <span class="process-memory">${formatBytes(process.memory)}</span>
        `;
      });
    }
    
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
    
    // Mark as initialized after first successful data load
    if (!isInitialized) {
      isInitialized = true;
    }
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
  
  // Set up detach button handlers
  const detachButtons = document.querySelectorAll('.detach-btn');
  detachButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const component = button.getAttribute('data-component');
      if (component) {
        // Prevent multiple clicks
        if (button.disabled) return;
        button.disabled = true;
        
        try {
          // Add visual feedback
          button.style.transform = 'scale(0.95)';
          button.style.opacity = '0.7';
          
          await invoke('create_detached_window', { 
            component: component,
            width: 600.0,
            height: 400.0
          });
          
          // Reset visual feedback
          setTimeout(() => {
            button.style.transform = '';
            button.style.opacity = '';
            button.disabled = false;
          }, 1000);
        } catch (error) {
          console.error('Failed to create detached window:', error);
          // Reset visual feedback on error
          button.style.transform = '';
          button.style.opacity = '';
          button.disabled = false;
        }
      }
    });
  });
});

// Clean up on window unload
window.addEventListener("beforeunload", () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
