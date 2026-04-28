import { motion } from 'framer-motion';
import { IoTimeOutline, IoSettingsOutline, IoTerminalOutline, IoDocumentTextOutline } from 'react-icons/io5';

interface QuickItem {
  id: string;
  title: string;
  icon?: React.ElementType;
  action: () => void;
}

interface QuickButtonsProps {
  onExecute: (item: QuickItem) => void;
}

export const QuickButtons = ({ onExecute }: QuickButtonsProps) => {
  // 示例按钮数据
  const quickItems: QuickItem[] = [
    { 
      id: 'history', 
      title: '最近使用', 
      icon: IoTimeOutline,
      action: () => console.log('Open History')
    },
    { 
      id: 'settings', 
      title: '设置', 
      icon: IoSettingsOutline,
      action: () => console.log('Open Settings')
    },
    { 
      id: 'terminal', 
      title: '终端', 
      icon: IoTerminalOutline,
      action: () => console.log('Open Terminal')
    },
    { 
      id: 'docs', 
      title: '文档', 
      icon: IoDocumentTextOutline,
      action: () => console.log('Open Docs')
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-2"
    >
      {quickItems.map((item: QuickItem, index: number) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onExecute(item)}
            className={`
              group w-10 h-10 rounded-full flex items-center justify-center
              bg-gradient-to-br from-white/90 to-gray-100/90 dark:from-gray-800/80 dark:to-gray-700/80
              shadow-[2px_2px_8px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.15)]
              dark:shadow-[2px_2px_8px_rgba(0,0,0,0.4),-2px_-2px_8px_rgba(255,255,255,0.05)]
              border border-gray-200/50 dark:border-gray-600/30
              hover:shadow-[0_0_15px_rgba(255,255,255,0.4),0_0_30px_rgba(255,255,255,0.1)]
              dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.15),0_0_30px_rgba(255,255,255,0.05)]
              hover:border-gray-300/70 dark:hover:border-gray-500/50
              transition-all duration-200 ease-out
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {Icon && <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-200" />}
          </motion.button>
        );
      })}
    </motion.div>
  );
};
