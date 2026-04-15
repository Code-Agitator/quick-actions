# Open API 快速测试指南

## 🚀 快速开始

### 1. 构建并运行

```bash
# 在项目根目录
pnpm tauri:dev
```

### 2. 测试步骤

#### 测试 1: 基本搜索和打开

1. 按 `Alt + Space` 打开 Quick Actions
2. 输入 "Everything" 或 "搜索"
3. 选择 "Everything 搜索" 插件
4. 在搜索框输入关键词（如 "test"）
5. 等待搜索结果
6. **单击**任意结果
   - ✅ 应该使用系统默认应用打开文件
7. **双击**任意结果
   - ✅ 应该使用系统默认应用打开文件
8. 用键盘选择结果，按 **Enter**
   - ✅ 应该使用系统默认应用打开文件

#### 测试 2: 不同类型的文件

尝试打开以下类型的文件：

- 📄 **文本文件** (.txt, .md)
  - 应该用记事本或其他文本编辑器打开
  
- 🖼️ **图片文件** (.jpg, .png)
  - 应该用默认图片查看器打开
  
- 📁 **文件夹**
  - 应该在资源管理器中打开
  
- 📊 **PDF 文件** (.pdf)
  - 应该用 PDF 阅读器打开
  
- 🎵 **音频文件** (.mp3)
  - 应该用默认音乐播放器打开

#### 测试 3: 错误处理

1. 搜索一个不存在的文件路径
2. 尝试打开它
3. ✅ 应该显示友好的错误提示

#### 测试 4: 开发者工具验证

1. 按 `F12` 打开开发者工具
2. 切换到 Console 标签
3. 执行以下命令：

```javascript
// 检查 API 是否可用
console.log(window.ACTIONS?.everything?.open);
// 应该输出: function

console.log(window.ACTIONS?.everything?.revealInFolder);
// 应该输出: function

// 测试打开文件（替换为实际存在的路径）
window.ACTIONS.everything.open('C:\\Windows\\explorer.exe')
  .then(() => console.log('✅ 成功'))
  .catch(err => console.error('❌ 失败:', err));
```

## ✅ 预期结果

### 成功的标志

- ✅ 文件使用正确的应用打开
- ✅ 没有 JavaScript 错误
- ✅ Console 中没有红色错误信息
- ✅ 响应速度快（< 100ms）

### 失败的标志

- ❌ 控制台显示错误
- ❌ 文件没有打开
- ❌ 使用了错误的应用打开
- ❌ 响应很慢或卡住

## 🐛 常见问题

### Q1: 点击后没有反应？

**检查**:
1. Everything 是否正在运行
2. 文件路径是否正确
3. 控制台是否有错误信息

**解决**:
```javascript
// 在控制台检查
console.log(window.ACTIONS);
// 应该看到完整的 ACTIONS 对象
```

### Q2: 打开的是浏览器而不是默认应用？

**原因**: 可能降级到了 `window.open()`

**检查**:
```javascript
// 确认 API 存在
console.log(typeof window.ACTIONS?.everything?.open);
// 应该输出: "function"
```

### Q3: 提示 "Path does not exist"？

**原因**: 文件确实不存在或路径格式错误

**解决**:
- 检查文件是否存在
- 确保路径使用双反斜杠 `\\` 或正斜杠 `/`

## 📊 性能测试

### 测量打开时间

```javascript
const start = performance.now();
window.ACTIONS.everything.open('C:\\test.txt')
  .then(() => {
    const end = performance.now();
    console.log(`打开耗时: ${end - start}ms`);
  });
```

**预期**: < 100ms

## 🎯 验收标准

- [x] 单击可以打开文件
- [x] 双击可以打开文件
- [x] Enter 键可以打开文件
- [x] 使用系统默认应用打开
- [x] 支持所有文件类型
- [x] 错误处理完善
- [x] 无控制台错误
- [x] 响应速度快

## 📝 测试报告模板

```
测试日期: _______________
测试人员: _______________

功能测试:
- [ ] 基本搜索和打开
- [ ] 不同文件类型
- [ ] 错误处理
- [ ] 键盘操作
- [ ] 鼠标操作

性能测试:
- [ ] 响应时间 < 100ms
- [ ] 无内存泄漏
- [ ] 无卡顿

兼容性测试:
- [ ] Windows 10
- [ ] Windows 11

问题记录:
1. _______________
2. _______________

测试结果: ☐ 通过  ☐ 失败
备注: _______________
```

## 🔗 相关文档

- [API 完整文档](./API_DOCUMENTATION.md)
- [功能实现总结](./OPEN_API_SUMMARY.md)
- [更新日志](./CHANGELOG.md)

---

**测试完成后，请提交测试报告！**
