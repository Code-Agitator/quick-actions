export default {
  id: 'command-runner',
  name: '命令执行器',
  keywords: ['cmd', '>', 'run'],

  async execute(query, api) {
    if (!query.startsWith('>')) return [];

    const command = query.slice(1).trim();
    if (!command) return [];

    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    return [{
      title: `执行: ${command}`,
      description: '点击运行命令',
      icon: '⚡',
      action: async () => {
        try {
          const output = await api.shell.execute(cmd, args);
          await api.notification.show('命令执行成功', output.slice(0, 100));
          await api.clipboard.writeText(output);
        } catch (error) {
          await api.notification.show('命令执行失败', error.toString());
        }
      }
    }];
  }
};
