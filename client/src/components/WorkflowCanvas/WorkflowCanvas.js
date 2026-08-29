import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './CustomNodes';
import { useWorkflowStore } from '../../store/workflowStore';

function CanvasInternal() {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    clearSelectedNode,
  } = useWorkflowStore();

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const category = event.dataTransfer.getData('application/reactflow/category') || 'action';

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, category, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onNodeClick = useCallback(
    (_, node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    clearSelectedNode();
  }, [clearSelectedNode]);

  return (
    <div
      className="w-full h-full flex-1 relative bg-background"
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#06b6d4', strokeWidth: 2 },
        }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border-slate-700 !fill-slate-300 !rounded-xl !shadow-xl [&>button]:!border-slate-800 hover:[&>button]:!bg-slate-800" />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.category === 'trigger') return '#38bdf8';
            if (n.data?.nodeType === 'gmail') return '#f87171';
            if (n.data?.nodeType === 'slack') return '#34d399';
            if (n.data?.nodeType === 'llm') return '#c084fc';
            return '#64748b';
          }}
          className="!bg-slate-950/80 !border-slate-800 !rounded-xl overflow-hidden"
          maskColor="rgba(9, 13, 22, 0.75)"
        />
      </ReactFlow>
    </div>
  );
}

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInternal />
    </ReactFlowProvider>
  );
}
