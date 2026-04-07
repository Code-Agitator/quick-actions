/**
 * 高级计算器插件 - Hero UI 版本
 * 使用原生 JavaScript 创建 UI，通过 Hero UI CDN 加载组件
 */
export default {
  id: 'calculator-pro',
  name: '高级计算器',
  version: '2.0.0',
  description: '功能完整的高级计算器，支持基础运算、百分比、历史记录等',
  icon: '🧮',
  keywords: ['calc', '计算', '数学', '+', '-', '*', '/', '科学计算'],
  
  /**
   * 渲染计算器 UI（使用原生 JavaScript + Hero UI）
   */
  render({ query, onResult }) {
    // 主容器 - 可滚动，限制最大高度
    const container = document.createElement('div');
    container.className = 'min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8';
    
    // 内容包装器 - 限制宽度并居中
    const mainContent = document.createElement('div');
    mainContent.className = 'max-w-md mx-auto space-y-4';
    
    // 标题
    const header = document.createElement('div');
    header.className = 'text-center mb-6';
    header.innerHTML = `
      <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
        🧮 高级计算器
      </h1>
      <p class="text-gray-600 dark:text-gray-400 text-sm">
        支持基础运算和历史记录
      </p>
    `;
    
    // 计算器卡片容器
    const cardContainer = document.createElement('div');
    cardContainer.className = 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6';
    
    // 显示屏
    const displayContainer = document.createElement('div');
    displayContainer.className = 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 mb-4 shadow-inner';
    displayContainer.innerHTML = `
      <div id="expression-display" class="text-right text-sm text-gray-500 dark:text-gray-400 h-6 mb-2 overflow-x-auto whitespace-nowrap scrollbar-hide"></div>
      <div id="result-display" class="text-right text-5xl font-bold text-gray-900 dark:text-white overflow-x-auto whitespace-nowrap scrollbar-hide">0</div>
    `;
    
    // 功能按钮区域
    const functionButtons = document.createElement('div');
    functionButtons.className = 'flex gap-2 mb-4';
    functionButtons.innerHTML = `
      <button id="show-history-btn" class="flex-1 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
        📜 历史
      </button>
      <div class="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg">
        <span id="history-count">0</span> 条记录
      </div>
    `;
    
    // 历史记录区域
    const historySection = document.createElement('div');
    historySection.id = 'history-section';
    historySection.className = 'hidden bg-gray-50 dark:bg-gray-700 rounded-xl p-4 max-h-48 overflow-y-auto mb-4';
    
    // 按钮网格
    const buttonsGrid = document.createElement('div');
    buttonsGrid.className = 'grid grid-cols-4 gap-3';
    
    // 按钮配置 - 简化 class 名
    const buttonConfigs = [
      { label: 'AC', type: 'clear-all', className: 'h-14 text-lg font-bold bg-red-500 hover:bg-red-600 text-white rounded shadow' },
      { label: 'C', type: 'clear', className: 'h-14 text-lg font-bold bg-gray-300 hover:bg-gray-400 text-gray-800 rounded shadow' },
      { label: '⌫', type: 'backspace', className: 'h-14 text-lg font-bold bg-gray-300 hover:bg-gray-400 text-gray-800 rounded shadow' },
      { label: '÷', type: 'operator', value: '/', className: 'h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white rounded shadow' },
      
      { label: '7', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '8', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '9', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '×', type: 'operator', value: '*', className: 'h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white rounded shadow' },
      
      { label: '4', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '5', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '6', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '−', type: 'operator', value: '-', className: 'h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white rounded shadow' },
      
      { label: '1', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '2', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '3', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '+', type: 'operator', value: '+', className: 'h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white rounded shadow' },
      
      { label: '±', type: 'sign', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '0', type: 'number', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '%', type: 'percent', className: 'h-14 text-lg font-bold bg-white hover:bg-gray-100 text-gray-900 rounded shadow' },
      { label: '=', type: 'equals', className: 'h-14 text-lg font-bold bg-green-500 hover:bg-green-600 text-white rounded shadow' },
    ];
    
    // 状态管理
    let currentInput = '0';
    let previousInput = '';
    let operator = null;
    let shouldResetDisplay = false;
    let history = [];
    let showHistory = false;
    
    // DOM 元素引用
    const expressionDisplay = () => document.getElementById('expression-display');
    const resultDisplay = () => document.getElementById('result-display');
    const historySectionEl = () => document.getElementById('history-section');
    const historyCountEl = () => document.getElementById('history-count');
    
    // 更新显示
    function updateDisplay() {
      if (expressionDisplay()) {
        expressionDisplay().textContent = previousInput + (operator ? ` ${operator}` : '');
      }
      if (resultDisplay()) {
        resultDisplay().textContent = currentInput;
      }
    }
    
    // 更新历史记录显示
    function updateHistory() {
      if (historyCountEl()) {
        historyCountEl().textContent = history.length;
      }
      
      if (historySectionEl()) {
        if (showHistory && history.length > 0) {
          historySectionEl().classList.remove('hidden');
          historySectionEl().innerHTML = `
            <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">计算历史</div>
            ${history.map(item => `
              <div class="text-sm text-gray-700 dark:text-gray-300 py-1 border-b border-gray-200 dark:border-gray-600 last:border-0">
                ${item}
              </div>
            `).join('')}
          `;
        } else {
          historySectionEl().classList.add('hidden');
        }
      }
    }
    
    // 输入数字
    function inputNumber(num) {
      if (shouldResetDisplay) {
        currentInput = num;
        shouldResetDisplay = false;
      } else {
        currentInput = currentInput === '0' ? num : currentInput + num;
      }
      updateDisplay();
    }
    
    // 输入小数点
    function inputDecimal() {
      if (shouldResetDisplay) {
        currentInput = '0.';
        shouldResetDisplay = false;
      } else if (!currentInput.includes('.')) {
        currentInput += '.';
      }
      updateDisplay();
    }
    
    // 输入运算符
    function inputOperator(op) {
      if (operator && !shouldResetDisplay) {
        calculate();
      }
      previousInput = currentInput;
      operator = op;
      shouldResetDisplay = true;
      updateDisplay();
    }
    
    // 清除所有
    function clearAll() {
      currentInput = '0';
      previousInput = '';
      operator = null;
      shouldResetDisplay = false;
      history = [];
      updateDisplay();
      updateHistory();
    }
    
    // 清除当前
    function clear() {
      currentInput = '0';
      shouldResetDisplay = false;
      updateDisplay();
    }
    
    // 退格
    function backspace() {
      if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
      } else {
        currentInput = '0';
      }
      updateDisplay();
    }
    
    // 正负号切换
    function toggleSign() {
      currentInput = String(parseFloat(currentInput) * -1);
      updateDisplay();
    }
    
    // 百分比
    function percent() {
      currentInput = String(parseFloat(currentInput) / 100);
      updateDisplay();
    }
    
    // 计算
    function calculate() {
      if (!operator || shouldResetDisplay) return;
      
      try {
        const prev = parseFloat(previousInput);
        const current = parseFloat(currentInput);
        let result;
        
        switch (operator) {
          case '+':
            result = prev + current;
            break;
          case '-':
            result = prev - current;
            break;
          case '*':
            result = prev * current;
            break;
          case '/':
            if (current === 0) {
              alert('不能除以零！');
              clearAll();
              return;
            }
            result = prev / current;
            break;
          default:
            return;
        }
        
        // 处理浮点数精度问题
        result = Math.round(result * 1000000000) / 1000000000;
        
        // 添加到历史记录
        const historyEntry = `${previousInput} ${operator} ${currentInput} = ${result}`;
        history.unshift(historyEntry);
        if (history.length > 10) history.pop();
        
        currentInput = String(result);
        previousInput = '';
        operator = null;
        shouldResetDisplay = true;
        updateDisplay();
        updateHistory();
        
        // 如果有回调，返回结果
        if (onResult) {
          onResult({
            expression: `${previousInput} ${operator} ${currentInput}`,
            result: result
          });
        }
      } catch (error) {
        currentInput = 'Error';
        shouldResetDisplay = true;
        updateDisplay();
      }
    }
    
    // 切换历史记录显示
    function toggleHistory() {
      showHistory = !showHistory;
      updateHistory();
    }
    
    // 创建按钮并绑定事件
    console.log('Creating buttons...', buttonConfigs.length);
    buttonConfigs.forEach((config, index) => {
      const button = document.createElement('button');
      button.className = config.className;
      button.textContent = config.label;
      console.log(`Button ${index}: ${config.label}`);
      
      button.onclick = () => {
        console.log('Button clicked:', config.label);
        switch (config.type) {
          case 'number':
            inputNumber(config.label);
            break;
          case 'operator':
            inputOperator(config.value);
            break;
          case 'clear-all':
            clearAll();
            break;
          case 'clear':
            clear();
            break;
          case 'backspace':
            backspace();
            break;
          case 'equals':
            calculate();
            break;
          case 'decimal':
            inputDecimal();
            break;
          case 'sign':
            toggleSign();
            break;
          case 'percent':
            percent();
            break;
        }
      };
      
      buttonsGrid.appendChild(button);
      console.log('Button appended to grid');
    });
    console.log('Buttons grid children count:', buttonsGrid.children.length);
    
    // 绑定历史记录按钮事件
    setTimeout(() => {
      const historyBtn = document.getElementById('show-history-btn');
      if (historyBtn) {
        historyBtn.onclick = toggleHistory;
      }
    }, 0);
    
    // 组装 DOM - 重要：确保所有子元素都正确添加
    cardContainer.appendChild(displayContainer);
    cardContainer.appendChild(functionButtons);
    cardContainer.appendChild(historySection);
    cardContainer.appendChild(buttonsGrid);  // 确保按钮网格被添加
    
    mainContent.appendChild(header);
    mainContent.appendChild(cardContainer);
    container.appendChild(mainContent);
    
    console.log('Calculator UI rendered successfully!');
    console.log('Buttons created:', buttonConfigs.length);
    console.log('Container:', container);
    
    // 添加键盘支持
    document.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') inputNumber(e.key);
      else if (['+', '-', '*', '/'].includes(e.key)) inputOperator(e.key);
      else if (e.key === '.') inputDecimal();
      else if (e.key === 'Enter' || e.key === '=') calculate();
      else if (e.key === 'Escape') clearAll();
      else if (e.key === 'Backspace') backspace();
    });
    
    return container;
  },
  
  /**
   * 用于搜索模式的快速计算
   */
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
