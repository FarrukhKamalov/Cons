import React from 'react';
import NetworkDashboard from './components/NetworkDashboard';
import Simulation from './components/Simulation';

function App() {
  const [page, setPage] = React.useState<'constructor' | 'simulation'>('constructor');

  return (
    <div>
      <div className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-8 h-12">
            <button
              onClick={() => setPage('constructor')}
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                page === 'constructor'
                  ? 'border-white text-white'
                  : 'border-transparent text-indigo-200 hover:border-indigo-300 hover:text-white'
              }`}
            >
              Network Constructor
            </button>
            <button
              onClick={() => setPage('simulation')}
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                page === 'simulation'
                  ? 'border-white text-white'
                  : 'border-transparent text-indigo-200 hover:border-indigo-300 hover:text-white'
              }`}
            >
              Simulation
            </button>
          </div>
        </div>
      </div>
      {page === 'constructor' ? <NetworkDashboard /> : <Simulation />}
    </div>
  );
}

export default App;