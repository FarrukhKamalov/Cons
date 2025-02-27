import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import { Activity, Play, RotateCcw, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Transaction, Block, SimulationState } from '../types';
import { generateHash } from '../utils/cryptoUtils';

const initialState: SimulationState = {
  blocks: [],
  transactions: [],
  nodes: [],
  edges: [],
  currentBlockHeight: 0,
};

const transactionTypes = [
  'Asset Transfer',
  'Smart Contract Deploy',
  'Smart Contract Invoke',
  'Configuration Update',
  'Channel Create',
];

const CustomNode = ({ data }: { data: any }) => (
  <div className={`px-4 py-2 shadow-md rounded-lg ${data.className}`}>
    <div className="flex items-center">
      {data.icon}
      <div className="ml-2">
        <div className="text-sm font-bold">{data.label}</div>
        {data.details && <div className="text-xs text-gray-500">{data.details}</div>}
      </div>
    </div>
  </div>
);

const nodeTypes = {
  custom: CustomNode,
};

export default function Simulation() {
  const [state, setState] = useState<SimulationState>(initialState);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [newTransaction, setNewTransaction] = useState({
    sender: '',
    receiver: '',
    type: transactionTypes[0],
  });
  const [simulationStatus, setSimulationStatus] = useState<string>('');

  const resetSimulation = () => {
    setState(initialState);
    setNodes([]);
    setEdges([]);
    setSimulationStatus('');
  };

  const createBlock = (transactions: Transaction[]): Block => {
    const previousBlock = state.blocks[state.blocks.length - 1];
    const height = state.currentBlockHeight + 1;
    const timestamp = Date.now();
    const previousHash = previousBlock?.hash || '0'.repeat(64);
    const blockData = `${height}${previousHash}${timestamp}${JSON.stringify(transactions)}`;
    const hash = generateHash(blockData);

    return {
      height,
      hash,
      timestamp,
      transactions,
      previousHash,
    };
  };

  const simulateTransactionFlow = async (transaction: Transaction) => {
    const steps = [
      {
        message: "1. Client submits transaction proposal",
        edges: [
          {
            id: `proposal-${transaction.id}`,
            source: transaction.sender,
            target: `${transaction.sender}-peer0`,
            animated: true,
            style: { stroke: '#60A5FA' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          {
            id: `proposal-backup-${transaction.id}`,
            source: transaction.sender,
            target: `${transaction.sender}-peer1`,
            animated: true,
            style: { stroke: '#60A5FA' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
        ]
      },
      {
        message: "2. Peers execute transaction and return endorsement",
        edges: [
          {
            id: `endorsement-${transaction.id}`,
            source: `${transaction.sender}-peer0`,
            target: transaction.sender,
            animated: true,
            style: { stroke: '#34D399' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          {
            id: `endorsement-backup-${transaction.id}`,
            source: `${transaction.sender}-peer1`,
            target: transaction.sender,
            animated: true,
            style: { stroke: '#34D399' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
        ]
      },
      {
        message: "3. Client sends endorsed transaction to orderer",
        edges: [
          {
            id: `ordering-${transaction.id}`,
            source: transaction.sender,
            target: 'orderer1',
            animated: true,
            style: { stroke: '#F472B6' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
        ]
      },
      {
        message: "4. Orderer creates block and distributes to all peers",
        edges: [
          {
            id: `distribution-1-${transaction.id}`,
            source: 'orderer1',
            target: `${transaction.sender}-peer0`,
            animated: true,
            style: { stroke: '#A78BFA' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          {
            id: `distribution-2-${transaction.id}`,
            source: 'orderer1',
            target: `${transaction.sender}-peer1`,
            animated: true,
            style: { stroke: '#A78BFA' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          {
            id: `distribution-3-${transaction.id}`,
            source: 'orderer1',
            target: `${transaction.receiver}-peer0`,
            animated: true,
            style: { stroke: '#A78BFA' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          {
            id: `distribution-4-${transaction.id}`,
            source: 'orderer1',
            target: `${transaction.receiver}-peer1`,
            animated: true,
            style: { stroke: '#A78BFA' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
        ]
      },
      {
        message: "5. Peers validate and commit block to their ledger",
        edges: [
          {
            id: `commit-${transaction.id}`,
            source: transaction.sender,
            target: transaction.receiver,
            animated: true,
            style: { stroke: '#10B981' },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
        ]
      }
    ];

    for (const step of steps) {
      setSimulationStatus(step.message);
      setEdges(prev => [...prev, ...step.edges]);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setEdges(prev => prev.filter(edge => !step.edges.find(e => e.id === edge.id)));
    }

    setSimulationStatus('Transaction completed successfully');
    
    const finalEdge = {
      id: `final-${transaction.id}`,
      source: transaction.sender,
      target: transaction.receiver,
      style: { stroke: '#10B981' },
      markerEnd: { type: MarkerType.ArrowClosed },
    };

    setEdges(prev => [...prev, finalEdge]);
  };

  const submitTransaction = () => {
    if (!newTransaction.sender || !newTransaction.receiver) {
      return;
    }

    const transaction: Transaction = {
      id: generateHash(Date.now().toString()),
      sender: newTransaction.sender,
      receiver: newTransaction.receiver,
      type: newTransaction.type,
      timestamp: Date.now(),
      blockHeight: state.currentBlockHeight + 1,
      status: 'pending',
    };

    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, transaction],
    }));

    simulateTransactionFlow(transaction).then(() => {
      const block = createBlock([transaction]);
      setState(prev => ({
        ...prev,
        blocks: [...prev.blocks, block],
        transactions: prev.transactions.map(tx =>
          tx.id === transaction.id ? { ...tx, status: 'committed' } : tx
        ),
        currentBlockHeight: prev.currentBlockHeight + 1,
      }));
    });

    setNewTransaction({
      sender: '',
      receiver: '',
      type: transactionTypes[0],
    });
  };

  // Initialize network nodes
  useEffect(() => {
    const initialNodes: Node[] = [
      // Organizations
      {
        id: 'org1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: 'Organization 1',
          className: 'bg-blue-50 border-2 border-blue-200',
          icon: <div className="w-4 h-4 rounded-full bg-blue-500" />,
        },
      },
      {
        id: 'org2',
        type: 'custom',
        position: { x: 500, y: 100 },
        data: {
          label: 'Organization 2',
          className: 'bg-blue-50 border-2 border-blue-200',
          icon: <div className="w-4 h-4 rounded-full bg-blue-500" />,
        },
      },
      // Peers for Org1
      {
        id: 'org1-peer0',
        type: 'custom',
        position: { x: 50, y: 250 },
        data: {
          label: 'Peer 0',
          details: 'Organization 1',
          className: 'bg-green-50 border-2 border-green-200',
          icon: <div className="w-4 h-4 rounded-full bg-green-500" />,
        },
      },
      {
        id: 'org1-peer1',
        type: 'custom',
        position: { x: 150, y: 250 },
        data: {
          label: 'Peer 1',
          details: 'Organization 1',
          className: 'bg-green-50 border-2 border-green-200',
          icon: <div className="w-4 h-4 rounded-full bg-green-500" />,
        },
      },
      // Peers for Org2
      {
        id: 'org2-peer0',
        type: 'custom',
        position: { x: 450, y: 250 },
        data: {
          label: 'Peer 0',
          details: 'Organization 2',
          className: 'bg-green-50 border-2 border-green-200',
          icon: <div className="w-4 h-4 rounded-full bg-green-500" />,
        },
      },
      {
        id: 'org2-peer1',
        type: 'custom',
        position: { x: 550, y: 250 },
        data: {
          label: 'Peer 1',
          details: 'Organization 2',
          className: 'bg-green-50 border-2 border-green-200',
          icon: <div className="w-4 h-4 rounded-full bg-green-500" />,
        },
      },
      // Orderer
      {
        id: 'orderer1',
        type: 'custom',
        position: { x: 300, y: 400 },
        data: {
          label: 'Orderer',
          className: 'bg-purple-50 border-2 border-purple-200',
          icon: <div className="w-4 h-4 rounded-full bg-purple-500" />,
        },
      },
    ];

    // Initial edges connecting organizations to their peers
    const initialEdges: Edge[] = [
      // Org1 to its peers
      {
        id: 'org1-peer0-connection',
        source: 'org1',
        target: 'org1-peer0',
        type: 'smoothstep',
        style: { stroke: '#93C5FD' },
      },
      {
        id: 'org1-peer1-connection',
        source: 'org1',
        target: 'org1-peer1',
        type: 'smoothstep',
        style: { stroke: '#93C5FD' },
      },
      // Org2 to its peers
      {
        id: 'org2-peer0-connection',
        source: 'org2',
        target: 'org2-peer0',
        type: 'smoothstep',
        style: { stroke: '#93C5FD' },
      },
      {
        id: 'org2-peer1-connection',
        source: 'org2',
        target: 'org2-peer1',
        type: 'smoothstep',
        style: { stroke: '#93C5FD' },
      },
    ];

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Network Simulation
              </span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={resetSimulation}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Simulation
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transaction Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">New Transaction</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sender
                </label>
                <select
                  value={newTransaction.sender}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, sender: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Sender</option>
                  <option value="org1">Organization 1</option>
                  <option value="org2">Organization 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Receiver
                </label>
                <select
                  value={newTransaction.receiver}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, receiver: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Receiver</option>
                  <option value="org1">Organization 1</option>
                  <option value="org2">Organization 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Transaction Type
                </label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {transactionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={submitTransaction}
                disabled={!newTransaction.sender || !newTransaction.receiver}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4 mr-2" />
                Submit Transaction
              </button>
            </div>
            {simulationStatus && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-700">{simulationStatus}</p>
              </div>
            )}
          </div>

          {/* Network Visualization */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="h-[600px]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Block Height
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sender
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receiver
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.blockHeight}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.sender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.receiver}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'committed'
                            ? 'bg-green-100 text-green-800'
                            : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.status === 'committed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {tx.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {tx.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}