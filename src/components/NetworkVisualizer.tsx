import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NetworkConfig, Organization, Orderer } from '../types';
import { toPng } from 'html-to-image';

interface NetworkVisualizerProps {
  config: NetworkConfig;
  onNodeClick: (nodeId: string, type: 'org' | 'peer' | 'orderer') => void;
}

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

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function NetworkVisualizer({ config, onNodeClick }: NetworkVisualizerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let yOffset = 0;

    // Add organizations and their peers
    config.organizations.forEach((org, orgIndex) => {
      const orgNode: Node = {
        id: `org-${org.id}`,
        type: 'custom',
        position: { x: 200, y: yOffset },
        data: {
          label: org.name,
          details: `MSP: ${org.mspID}`,
          className: 'bg-blue-50 border-2 border-blue-200',
          icon: <div className="w-4 h-4 rounded-full bg-blue-500" />,
        },
      };
      newNodes.push(orgNode);

      // Add peers for this organization
      org.peers.forEach((peer, peerIndex) => {
        const peerNode: Node = {
          id: `peer-${peer.id}`,
          type: 'custom',
          position: { x: 500, y: yOffset + (peerIndex * 100) },
          data: {
            label: peer.name,
            details: `Port: ${peer.port}`,
            className: 'bg-green-50 border-2 border-green-200',
            icon: <div className="w-4 h-4 rounded-full bg-green-500" />,
          },
        };
        newNodes.push(peerNode);

        // Connect org to peer
        newEdges.push({
          id: `${orgNode.id}-${peerNode.id}`,
          source: orgNode.id,
          target: peerNode.id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#93C5FD' },
        });
      });

      yOffset += Math.max(org.peers.length * 100, 150);
    });

    // Add orderers
    config.orderers.forEach((orderer, index) => {
      const ordererNode: Node = {
        id: `orderer-${orderer.id}`,
        type: 'custom',
        position: { x: 800, y: 100 + (index * 100) },
        data: {
          label: orderer.name,
          details: `Type: ${orderer.type}`,
          className: 'bg-purple-50 border-2 border-purple-200',
          icon: <div className="w-4 h-4 rounded-full bg-purple-500" />,
        },
      };
      newNodes.push(ordererNode);

      // Connect all orgs to orderer
      config.organizations.forEach(org => {
        newEdges.push({
          id: `org-${org.id}-orderer-${orderer.id}`,
          source: `org-${org.id}`,
          target: `orderer-${orderer.id}`,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#C4B5FD' },
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [config, setNodes, setEdges]);

  const exportToPng = useCallback(() => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (element) {
      toPng(element, {
        backgroundColor: '#ffffff',
        width: element.offsetWidth * 2,
        height: element.offsetHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left',
        },
      })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = 'network-diagram.png';
          link.href = dataUrl;
          link.click();
        })
        .catch((error) => {
          console.error('Error exporting diagram:', error);
        });
    }
  }, []);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    const [type, id] = node.id.split('-');
    onNodeClick(id, type as 'org' | 'peer' | 'orderer');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Network Visualization</h2>
        <button
          onClick={exportToPng}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          Export as PNG
        </button>
      </div>
      <div className="h-[600px] border rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}