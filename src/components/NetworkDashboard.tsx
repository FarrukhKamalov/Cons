import React from 'react';
import { Activity, Users, Server, Plus, Download, Settings, Trash2, Edit2, X, Check, FileJson, FileText, Archive, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { NetworkConfig, Organization, Orderer, YAMLConfig, NetworkTemplate } from '../types';
import { generateYAMLConfigs } from '../utils/yamlGenerator';
import { validateNetworkConfig, ValidationResult } from '../utils/networkValidator';
import { generateNetworkDocumentation } from '../utils/documentationGenerator';
import { generateNetworkScript } from '../utils/networkScripts';
import { NETWORK_TEMPLATES } from '../types';
import NetworkVisualizer from './NetworkVisualizer';

export default function NetworkDashboard() {
  const [config, setConfig] = React.useState<NetworkConfig>({
    organizations: [],
    orderers: [],
    channelName: '',
    consortium: 'SampleConsortium',
    networkVersion: '2.0',
    stateDatabase: 'CouchDB'
  });

  const [editingOrg, setEditingOrg] = React.useState<string | null>(null);
  const [editingPeer, setEditingPeer] = React.useState<{orgId: string, peerId: string} | null>(null);
  const [editingOrderer, setEditingOrderer] = React.useState<string | null>(null);
  const [newOrgName, setNewOrgName] = React.useState('');
  const [yamlPreview, setYamlPreview] = React.useState<YAMLConfig | null>(null);
  const [notification, setNotification] = React.useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<NetworkTemplate | null>(null);
  const [validationResults, setValidationResults] = React.useState<ValidationResult[]>([]);
  const [showValidation, setShowValidation] = React.useState(false);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleNodeClick = (nodeId: string, type: 'org' | 'peer' | 'orderer') => {
    switch (type) {
      case 'org':
        setEditingOrg(nodeId);
        break;
      case 'orderer':
        setEditingOrderer(nodeId);
        break;
      case 'peer':
        const org = config.organizations.find(o => o.peers.some(p => p.id === nodeId));
        if (org) {
          setEditingPeer({ orgId: org.id, peerId: nodeId });
        }
        break;
    }
  };

  const checkConfiguration = () => {
    const results = validateNetworkConfig(config);
    setValidationResults(results);
    setShowValidation(true);
    
    const hasErrors = results.some(result => result.status === 'error');
    if (hasErrors) {
      showNotification('Configuration has critical issues that need to be addressed', 'error');
    } else if (results.length > 0) {
      showNotification('Configuration has warnings that should be reviewed', 'warning');
    } else {
      showNotification('Configuration looks good!', 'success');
    }
  };

  const applyTemplate = (template: NetworkTemplate) => {
    setSelectedTemplate(template);
    
    const newOrgs: Organization[] = template.organizations.map(org => ({
      id: crypto.randomUUID(),
      name: org.name,
      domain: `${org.name.toLowerCase().replace(/\s+/g, '')}.example.com`,
      mspID: `${org.name.replace(/\s+/g, '')}MSP`,
      peers: Array.from({ length: org.peerCount }, (_, i) => ({
        id: crypto.randomUUID(),
        name: `peer${i}`,
        port: 7051 + i,
        status: 'pending',
        couchDBPort: 5984 + i,
        chaincodePort: 7052 + i
      })),
      type: org.type,
      country: 'US',
      state: 'California',
      locality: 'San Francisco'
    }));

    const newOrderers: Orderer[] = Array.from({ length: template.ordererCount }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `orderer${i}`,
      domain: 'orderer.example.com',
      port: 7050 + i,
      status: 'pending',
      type: 'etcdraft',
      batchTimeout: '2s',
      batchSize: {
        maxMessageCount: 500,
        absoluteMaxBytes: 10485760,
        preferredMaxBytes: 2097152
      }
    }));

    setConfig({
      organizations: newOrgs,
      orderers: newOrderers,
      channelName: template.channelName,
      consortium: 'SampleConsortium',
      networkVersion: '2.0',
      template: template,
      stateDatabase: template.stateDatabase
    });

    showNotification(`Applied ${template.name} template successfully`, 'success');
  };

  const addOrganization = () => {
    if (!newOrgName.trim()) {
      showNotification('Organization name is required', 'error');
      return;
    }

    const newOrg: Organization = {
      id: crypto.randomUUID(),
      name: newOrgName.trim(),
      domain: `${newOrgName.toLowerCase().replace(/\s+/g, '')}.example.com`,
      mspID: `${newOrgName.replace(/\s+/g, '')}MSP`,
      peers: [],
      country: 'US',
      state: 'California',
      locality: 'San Francisco'
    };

    setConfig(prev => ({
      ...prev,
      organizations: [...prev.organizations, newOrg]
    }));
    setNewOrgName('');
    showNotification(`Organization ${newOrg.name} added successfully`, 'success');
  };

  const updateOrganization = (orgId: string, updates: Partial<Organization>) => {
    setConfig(prev => ({
      ...prev,
      organizations: prev.organizations.map(org =>
        org.id === orgId ? { ...org, ...updates } : org
      )
    }));
    showNotification('Organization updated successfully', 'success');
  };

  const deleteOrganization = (orgId: string) => {
    setConfig(prev => ({
      ...prev,
      organizations: prev.organizations.filter(org => org.id !== orgId)
    }));
    showNotification('Organization deleted successfully', 'success');
  };

  const addPeer = (orgId: string) => {
    const org = config.organizations.find(o => o.id === orgId);
    if (!org) return;

    const newPeer = {
      id: crypto.randomUUID(),
      name: `peer${org.peers.length}`,
      port: 7051 + org.peers.length,
      status: 'pending' as const,
      couchDBPort: 5984 + org.peers.length,
      chaincodePort: 7052 + org.peers.length
    };

    setConfig(prev => ({
      ...prev,
      organizations: prev.organizations.map(o =>
        o.id === orgId
          ? { ...o, peers: [...o.peers, newPeer] }
          : o
      )
    }));
    showNotification(`Peer ${newPeer.name} added to ${org.name}`, 'success');
  };

  const updatePeer = (orgId: string, peerId: string, updates: Partial<Peer>) => {
    setConfig(prev => ({
      ...prev,
      organizations: prev.organizations.map(org =>
        org.id === orgId
          ? {
              ...org,
              peers: org.peers.map(peer =>
                peer.id === peerId ? { ...peer, ...updates } : peer
              )
            }
          : org
      )
    }));
    setEditingPeer(null);
    showNotification('Peer updated successfully', 'success');
  };

  const deletePeer = (orgId: string, peerId: string) => {
    setConfig(prev => ({
      ...prev,
      organizations: prev.organizations.map(org =>
        org.id === orgId
          ? { ...org, peers: org.peers.filter(peer => peer.id !== peerId) }
          : org
      )
    }));
    showNotification('Peer deleted successfully', 'success');
  };

  const addOrderer = () => {
    const newOrderer: Orderer = {
      id: crypto.randomUUID(),
      name: `orderer${config.orderers.length}`,
      domain: 'orderer.example.com',
      port: 7050 + config.orderers.length,
      status: 'pending',
      type: 'etcdraft',
      batchTimeout: '2s',
      batchSize: {
        maxMessageCount: 500,
        absoluteMaxBytes: 10485760,
        preferredMaxBytes: 2097152
      }
    };

    setConfig(prev => ({
      ...prev,
      orderers: [...prev.orderers, newOrderer]
    }));
    showNotification(`Orderer ${newOrderer.name} added successfully`, 'success');
  };

  const updateOrderer = (ordererId: string, updates: Partial<Orderer>) => {
    setConfig(prev => ({
      ...prev,
      orderers: prev.orderers.map(orderer =>
        orderer.id === ordererId ? { ...orderer, ...updates } : orderer
      )
    }));
    setEditingOrderer(null);
    showNotification('Orderer updated successfully', 'success');
  };

  const deleteOrderer = (ordererId: string) => {
    setConfig(prev => ({
      ...prev,
      orderers: prev.orderers.filter(orderer => orderer.id !== ordererId)
    }));
    showNotification('Orderer deleted successfully', 'success');
  };

  const generateConfigs = () => {
    if (config.organizations.length === 0) {
      showNotification('Add at least one organization before generating configs', 'error');
      return;
    }
    const configs = generateYAMLConfigs(config);
    setYamlPreview(configs);
    showNotification('Configuration files generated successfully', 'success');
  };

  const downloadJSON = () => {
    const content = JSON.stringify(config, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Network configuration downloaded as JSON', 'success');
  };

  const downloadAll = async () => {
    if (!yamlPreview) {
      showNotification('Generate configurations first', 'error');
      return;
    }

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add configuration files
      zip.file('configtx.yaml', yamlPreview.configtx);
      zip.file('crypto-config.yaml', yamlPreview.cryptoConfig);
      zip.file('docker-compose.yaml', yamlPreview.dockerCompose);
      zip.file('network-config.json', JSON.stringify(config, null, 2));
      
      // Add documentation
      const documentation = generateNetworkDocumentation(config);
      zip.file('NETWORK.md', documentation);
      
      // Add network management script
      const networkScript = generateNetworkScript();
      zip.file('network.sh', networkScript);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'network-configs.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('All configuration files downloaded as ZIP', 'success');
    } catch (error) {
      console.error('Error creating zip file:', error);
      showNotification('Failed to create zip file', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white z-50 transition-opacity duration-300`}>
          {notification.message}
        </div>
      )}

      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Fabric Network Constructor
              </span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={checkConfiguration}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Check Configuration
              </button>
              <button
                onClick={generateConfigs}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Generate Configs
              </button>
              <button
                onClick={downloadJSON}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
              >
                <FileJson className="h-4 w-4 mr-2" />
                Download JSON
              </button>
              <button
                onClick={downloadAll}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
              >
                <Archive className="h-4 w-4 mr-2" />
                Download All
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Validation Results */}
        {showValidation && validationResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration Check Results</h2>
            <div className="space-y-4">
              {validationResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start p-4 rounded-lg ${
                    result.status === 'error'
                      ? 'bg-red-50'
                      : result.status === 'warning'
                      ? 'bg-yellow-50'
                      : 'bg-green-50'
                  }`}
                >
                  {result.status === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : result.status === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  )}
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      result.status === 'error'
                        ? 'text-red-800'
                        : result.status === 'warning'
                        ? 'text-yellow-800'
                        : 'text-green-800'
                    }`}>
                      {result.message}
                    </p>
                    {result.fix && (
                      <p className={`text-sm mt-1 ${
                        result.status === 'error'
                          ? 'text-red-600'
                          : result.status === 'warning'
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        Suggestion: {result.fix}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Network Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NETWORK_TEMPLATES.map(template => (
              <div
                key={template.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors duration-200 ${
                  selectedTemplate?.id === template.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'hover:border-indigo-300'
                }`}
                onClick={() => applyTemplate(template)}
              >
                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div>Channel: {template.channelName}</div>
                  <div>Organizations: {template.organizations.length}</div>
                  <div>Peers per Org: {template.organizations[0].peerCount}</div>
                  <div>Orderers: {template.ordererCount}</div>
                  <div>State DB: {template.stateDatabase}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Network Visualization */}
        <NetworkVisualizer config={config} onNodeClick={handleNodeClick} />

        {/* Organizations and Orderers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Organizations Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-indigo-600" />
                <h2 className="ml-2 text-lg font-medium text-gray-900">Organizations</h2>
              </div>
              <button
                onClick={addOrganization}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Org
              </button>
            </div>
            
            <div className="space-y-4">
              {config.organizations.map(org => (
                <div key={org.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    {editingOrg === org.id ? (
                      <input
                        type="text"
                        value={org.name}
                        onChange={(e) => updateOrganization(org.id, { name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <h3 className="text-sm font-medium text-gray-900">{org.name}</h3>
                    )}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => addPeer(org.id)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Peer
                      </button>
                      <button
                        onClick={() => setEditingOrg(editingOrg === org.id ? null : org.id)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteOrganization(org.id)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <div>Domain: {org.domain}</div>
                    <div>MSP ID: {org.mspID}</div>
                    <div className="mt-2">
                      <strong>Peers ({org.peers.length}):</strong>
                      <div className="ml-2 space-y-1">
                        {org.peers.map(peer => (
                          <div key={peer.id} className="flex items-center justify-between py-1">
                            {editingPeer?.orgId === org.id && editingPeer?.peerId === peer.id ? (
                              <div className="flex items-center space-x-2 flex-grow">
                                <input
                                  type="text"
                                  value={peer.name}
                                  onChange={(e) => updatePeer(org.id, peer.id, { name: e.target.value })}
                                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
                                />
                                <input
                                  type="number"
                                  value={peer.port}
                                  onChange={(e) => updatePeer(org.id, peer.id, { port: parseInt(e.target.value) })}
                                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
                                />
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => setEditingPeer(null)}
                                    className="p-1 text-gray-400 hover:text-gray-500"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => updatePeer(org.id, peer.id, { name: peer.name, port: peer.port })}
                                    className="p-1 text-green-600 hover:text-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span>{peer.name}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-400">Port: {peer.port}</span>
                                  <button
                                    onClick={() => setEditingPeer({ orgId: org.id, peerId: peer.id })}
                                    className="p-1 text-gray-400 hover:text-gray-500"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => deletePeer(org.id, peer.id)}
                                    className="p-1 text-red-400 hover:text-red-500"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orderers Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Server className="h-6 w-6 text-indigo-600" />
                <h2 className="ml-2 text-lg font-medium text-gray-900">Orderers</h2>
              </div>
              <button
                onClick={addOrderer}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Orderer
              </button>
            </div>

            <div className="space-y-4">
              {config.orderers.map(orderer => (
                <div key={orderer.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    {editingOrderer === orderer.id ? (
                      <div className="flex items-center space-x-2 flex-grow">
                        <input
                          type="text"
                          value={orderer.name}
                          onChange={(e) => updateOrderer(orderer.id, { name: e.target.value })}
                          className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
                        />
                        <input
                          type="number"
                          value={orderer.port}
                          onChange={(e) => updateOrderer(orderer.id, { port: parseInt(e.target.value) })}
                          className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
                        />
                        <select
                          value={orderer.type}
                          onChange={(e) => updateOrderer(orderer.id, { type: e.target.value as 'solo' | 'etcdraft' })}
                          className="block w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
                        >
                          <option value="solo">Solo</option>
                          <option value="etcdraft">Raft</option>
                        </select>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => setEditingOrderer(null)}
                            className="p-1 text-gray-400 hover:text-gray-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateOrderer(orderer.id, {
                              name: orderer.name,
                              port: orderer.port,
                              type: orderer.type
                            })}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium text-gray-900">{orderer.name}</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingOrderer(orderer.id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteOrderer(orderer.id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <div>Domain: {orderer.domain}</div>
                    <div>Port: {orderer.port}</div>
                    <div>Type: {orderer.type}</div>
                    <div>Batch Timeout: {orderer.batchTimeout}</div>
                    <div className="mt-1">Batch Size:</div>
                    <div className="ml-2">
                      <div>Max Message Count: {orderer.batchSize?.maxMessageCount}</div>
                      <div>Absolute Max Bytes: {orderer.batchSize?.absoluteMaxBytes}</div>
                      <div>Preferred Max Bytes: {orderer.batchSize?.preferredMaxBytes}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* YAML Preview Section */}
        {yamlPreview && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb- 6">
            <h2 className="text-lg font-medium text-gray-900">Generated Configurations</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  const blob = new Blob([yamlPreview.configtx], { type: 'text/yaml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'configtx.yaml';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showNotification('configtx.yaml downloaded successfully', 'success');
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <Download className="h-4 w-4 mr-1" />
                configtx.yaml
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([yamlPreview.cryptoConfig], { type: 'text/yaml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'crypto-config.yaml';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showNotification('crypto-config.yaml downloaded successfully', 'success');
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <Download className="h-4 w-4 mr-1" />
                crypto-config.yaml
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([yamlPreview.dockerCompose], { type: 'text/yaml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'docker-compose.yaml';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showNotification('docker-compose.yaml downloaded successfully', 'success');
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <Download className="h-4 w-4 mr-1" />
                docker-compose.yaml
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">configtx.yaml</h3>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {yamlPreview.configtx}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">crypto-config.yaml</h3>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {yamlPreview.cryptoConfig}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">docker-compose.yaml</h3>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {yamlPreview.dockerCompose}
              </pre>
            </div>
          </div>
        </div>
      )}
    </main>
  </div>
  );
}