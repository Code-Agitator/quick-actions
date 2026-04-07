/**
 * 简化版计算器 - 用于调试
 */
export default {
  id: 'calculator-test',
  name: '计算器 (测试版)',
  keywords: ['calc', '计算', 'test'],
  
  render({ query, onResult }) {
    // 主容器 - 固定高度，可滚动
    const container = document.createElement('div');
    container.className = 'min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8';
    
    console.log('=== Calculator Test Render Start ===');
    console.log('Container created:', container);
    
    // 内容包装器 - 限制最大宽度
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'max-w-md mx-auto space-y-4';
    
    // 标题
    const header = document.createElement('h1');
    header.className = 'text-2xl md:text-3xl font-bold text-center mb-4 text-gray-900';
    header.textContent = '🧮 计算器测试版';
    contentWrapper.appendChild(header);
    console.log('Header added');
    
    // 显示屏 - 固定大小
    const display = document.createElement('div');
    display.id = 'display';
    display.className = 'bg-white rounded-2xl p-4 md:p-6 text-right text-3xl md:text-4xl font-bold shadow-lg min-h-[80px] md:min-h-[100px] flex items-center justify-end overflow-x-auto';
    display.textContent = '0';
    contentWrapper.appendChild(display);
    console.log('Display added');
    
    // 按钮网格 - 响应式列数
    const buttonGrid = document.createElement('div');
    buttonGrid.className = 'grid grid-cols-4 gap-2 md:gap-3';
    console.log('Button grid created:', buttonGrid);
    
    // 创建测试按钮
    const testButtons = [
      { label: '7', value: '7' },
      { label: '8', value: '8' },
      { label: '9', value: '9' },
      { label: '÷', value: '/' },
      { label: '4', value: '4' },
      { label: '5', value: '5' },
      { label: '6', value: '6' },
      { label: '×', value: '*' },
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '+', value: '+' },
      { label: '0', value: '0' },
      { label: '=', value: '=' },
      { label: '-', value: '-' },
      { label: 'C', value: 'C' },
    ];
    
    let currentInput = '0';
    
    testButtons.forEach((btn, index) => {
      const button = document.createElement('button');
      // 减小按钮高度，使用响应式尺寸
      button.className = 'h-12 md:h-16 text-lg md:text-xl font-semibold bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-all active:scale-95 shadow-sm';
      button.textContent = btn.label;
      
      button.onclick = () => {
        console.log('Button clicked:', btn.label);
        if (btn.value >= '0' && btn.value <= '9') {
          currentInput = currentInput === '0' ? btn.value : currentInput + btn.value;
        } else if (['+', '-', '*', '/'].includes(btn.value)) {
          currentInput += ' ' + btn.value + ' ';
        } else if (btn.value === '=') {
          try {
            const result = Function('"use strict"; return (' + currentInput.replace(/×/g, '*').replace(/÷/g, '/') + ')')();
            currentInput = String(result);
          } catch (e) {
            currentInput = 'Error';
          }
        } else if (btn.value === 'C') {
          currentInput = '0';
        }
        
        display.textContent = currentInput;
      };
      
      buttonGrid.appendChild(button);
      console.log(`Button ${index} (${btn.label}) appended`);
    });
    
    console.log('Total buttons created:', buttonGrid.children.length);
    contentWrapper.appendChild(buttonGrid);
    console.log('Button grid added to content wrapper');
    
    container.appendChild(contentWrapper);
    console.log('Content wrapper added to container');
    
    console.log('=== Calculator Test Render End ===');
    console.log('Final container:', container);
    console.log('Container children:', container.children.length);
    
    return container;
  },
  
  async execute(query) {
    if (!/[\d+\-*/().]/.test(query)) return [];
    
    try {
      const sanitized = query.replace(/[^0-9+\-*/().]/g, '');
      const result = Function('"use strict"; return (' + sanitized + ')')();
      
      return [{
        title: `= ${result}`,
        description: `${query} 的计算结果`,
        action: () => navigator.clipboard.writeText(String(result))
      }];
    } catch {
      return [];
    }
  }
};
