#!/usr/bin/env node

const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部地址和非IPv4地址
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name: name,
          address: iface.address,
          netmask: iface.netmask,
          cidr: getCIDR(iface.netmask)
        });
      }
    }
  }

  return addresses;
}

function getCIDR(netmask) {
  return netmask.split('.').reduce((acc, octet) => {
    return acc + parseInt(octet).toString(2).padStart(8, '0');
  }, '').split('1').length - 1;
}

function displayIPs() {
  const ips = getLocalIP();
  
  console.log('\n🌐 内网IP地址信息:');
  console.log('='.repeat(50));
  
  if (ips.length === 0) {
    console.log('❌ 未找到可用的内网IP地址');
    return;
  }

  ips.forEach((ip, index) => {
    console.log(`\n📱 网络接口 ${index + 1}: ${ip.name}`);
    console.log(`   IP地址: ${ip.address}`);
    console.log(`   子网掩码: ${ip.netmask}`);
    console.log(`   网络前缀: /${ip.cidr}`);
    console.log(`   🔗 访问地址: http://${ip.address}:5173`);
  });

  console.log('\n📋 使用说明:');
  console.log('1. 确保您的手机和电脑在同一个WiFi网络下');
  console.log('2. 在手机浏览器中输入上面的访问地址');
  console.log('3. 如果无法访问，请检查防火墙设置');
  console.log('4. 建议使用第一个IP地址进行访问');
  
  console.log('\n🚀 启动开发服务器:');
  console.log('   npm run dev');
  
  console.log('\n💡 提示:');
  console.log('- 如果端口5173被占用，Vite会自动使用下一个可用端口');
  console.log('- 确保手机和电脑的网络连接正常');
  console.log('- 某些企业网络可能会阻止设备间通信');
  
  console.log('\n' + '='.repeat(50));
}

// 如果直接运行此脚本
if (require.main === module) {
  displayIPs();
}

module.exports = { getLocalIP, displayIPs }; 