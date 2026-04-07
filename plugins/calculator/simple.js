/**
 * 极简计算器 - 确保能显示
 */
export default {
  id: 'calculator-simple',
  name: '计算器',
  keywords: ['calc', '计算'],
  
  render({ query, onResult }) {
    console.log('=== Simple Calculator Render ===');
    
    const container = document.createElement('div');
    container.className = 'p-8';
    
    const title = document.createElement('h1');
    title.className = 'text-2xl font-bold mb-4';
    title.textContent = '🧮 简易计算器';
    container.appendChild(title);
    
    const display = document.createElement('div');
    display.id = 'display';
    display.className = 'bg-white p-4 rounded-lg text-right text-2xl mb-4';
    display.textContent = '0';
    container.appendChild(display);
    
    const buttons = document.createElement('div');
    buttons.className = 'grid grid-cols-4 gap-2';
    
    const btns = ['7','8','9','/','4','5','6','*','1','2','3','-','0','=','+','C'];
    let current = '0';
    
    btns.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'p-4 bg-blue-500 text-white rounded hover:bg-blue-600';
      btn.textContent = label;
      
      btn.onclick = () => {
        if (label >= '0' && label <= '9') {
          current = current === '0' ? label : current + label;
        } else if (['+','-','*','/'].includes(label)) {
          current += ' ' + label + ' ';
        } else if (label === '=') {
          try {
            current = String(eval(current));
          } catch {
            current = 'Error';
          }
        } else if (label === 'C') {
          current = '0';
        }
        display.textContent = current;
      };
      
      buttons.appendChild(btn);
    });
    
    container.appendChild(buttons);
    
    console.log('Container:', container);
    console.log('Children count:', container.children.length);
    
    return container;
  },
  
  async execute(query) {
    if (!/[\d+\-*/().]/.test(query)) return [];
    try {
      const result = Function('"use strict"; return (' + query.replace(/[^0-9+\-*/().]/g, '') + ')')();
      return [{
        title: `= ${result}`,
        description: query,
        action: () => navigator.clipboard.writeText(String(result))
      }];
    } catch {
      return [];
    }
  }
};
