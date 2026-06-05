import React, { useState, useEffect } from "react";
import Tree from "react-d3-tree";
import API from "../api/axiosInstance";
import { User, Mail, Briefcase, Award, Sparkles, X, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

export default function OrgChart() {
  const [treeData, setTreeData] = useState(null);
  const [flatData, setFlatData] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    setLoading(true);
    try {
      const res = await API.get("/employees/org-chart");
      const { tree, flat } = res.data?.data || {};

      const transformNode = (node) => {
        return {
          name: node.name,
          attributes: {
            id: node.id,
            position: node.position,
            department: node.department,
            email: node.email,
            reportsToName: node.reportsToName,
          },
          children: node.children ? node.children.map(transformNode) : [],
        };
      };

      if (tree && tree.length > 0) {
        setTreeData(tree.map(transformNode));
      } else if (flat && flat.length > 0) {
        // Fallback root building if tree is flat
        const root = flat.find((e) => !e.reportsTo);
        if (root) {
          setTreeData([transformNode(root)]);
        }
      }
      setFlatData(flat || []);
    } catch (err) {
      toast.error("Failed to load organizational structure");
    } finally {
      setLoading(false);
    }
  };

  const renderCustomNode = ({ nodeDatum, toggleNode }) => {
    return (
      <g>
        <circle r={8} fill="#4f46e5" stroke="#fff" strokeWidth={2} />
        <foreignObject
          width={180}
          height={75}
          x={-90}
          y={15}
          className="overflow-visible"
        >
          <div
            onClick={() => setSelectedNode(nodeDatum)}
            className="flex flex-col items-center border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 rounded-xl p-2.5 shadow-sm text-center cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all w-44"
          >
            <p className="text-xs font-black text-gray-950 dark:text-white truncate w-full">
              {nodeDatum.name}
            </p>
            <p className="text-[10px] font-semibold text-gray-500 truncate w-full mt-0.5">
              {nodeDatum.attributes?.position}
            </p>
            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mt-1">
              {nodeDatum.attributes?.department}
            </p>
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Company Org Chart
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Visual hierarchy of reporting relationships and team structures.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4 flex-1 h-[65vh] overflow-hidden">
          {/* Tree viewer panel */}
          <div className="lg:col-span-3 border border-gray-150 bg-gray-50/50 rounded-2xl relative overflow-hidden h-full dark:border-gray-800 dark:bg-gray-900/20">
            {treeData ? (
              <Tree
                data={treeData}
                renderCustomNodeElement={renderCustomNode}
                orientation="vertical"
                pathFunc="step"
                nodeSize={{ x: 220, y: 130 }}
                translate={{ x: 350, y: 50 }}
              />
            ) : (
              <p className="text-sm text-gray-500 text-center py-20">No org chart nodes mapped yet.</p>
            )}
          </div>

          {/* Selection detail sidebar */}
          <div className="lg:col-span-1 border border-gray-150 bg-white rounded-2xl p-6 shadow-sm h-full overflow-y-auto dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-950 dark:text-white">{selectedNode.name}</h3>
                      <p className="text-xs text-gray-500">{selectedNode.attributes?.position}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4.5 w-4.5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white font-medium">
                      {selectedNode.attributes?.department} Department
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4.5 w-4.5 text-gray-400" />
                    <a
                      href={`mailto:${selectedNode.attributes?.email}`}
                      className="text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {selectedNode.attributes?.email}
                    </a>
                  </div>
                  {selectedNode.attributes?.reportsToName && (
                    <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-850">
                      <p className="text-gray-500 font-semibold mb-0.5">REPORTS TO</p>
                      <p className="text-gray-900 dark:text-white font-black">
                        {selectedNode.attributes.reportsToName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400 space-y-2 my-auto">
                <Sparkles className="h-8 w-8 mx-auto text-indigo-500" />
                <p className="text-sm font-semibold">Select Org Member</p>
                <p className="text-xs">Click any employee node to view detailed reporting line, department profile, and active OKRs.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
