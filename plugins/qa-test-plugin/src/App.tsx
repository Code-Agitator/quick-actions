import React from 'react';

interface AppProps {
  query?: string;
  onResult?: (result: any) => void;
}

const App: React.FC<AppProps> = ({ query, onResult }) => {
  const [count, setCount] = React.useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Hello from qa-test-plugin! 👋
        </h1>
        
        <p className="text-lg text-gray-600 mb-6">
          This is a standalone React plugin for Quick Actions.
        </p>
        
        {query && (
          <div className="mb-4 p-4 bg-white rounded-lg shadow">
            <p className="text-gray-700">
              <strong>Search Query:</strong> {query}
            </p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Interactive Demo</h2>
          <p className="text-gray-600 mb-4">
            Count: <span className="font-mono text-2xl text-blue-600">{count}</span>
          </p>
          
          <button
            onClick={() => setCount(count + 1)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Click Me! 🎉
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <p className="text-sm text-yellow-800">
            💡 <strong>Tip:</strong> You can use any React features here, 
            including hooks, context, and third-party libraries!
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
