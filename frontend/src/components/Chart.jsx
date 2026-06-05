import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Oct 01", value: 10 },
  { name: "Oct 04", value: 20 },
  { name: "Oct 07", value: 35 },
  { name: "Oct 10", value: 5 },
  { name: "Oct 14", value: 40 },
];

export default function Chart() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm h-[350px]">
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="font-semibold text-lg">Attendance Trend</h2>
          <p className="text-sm text-gray-400">
            Employee check-ins over last 14 days
          </p>
        </div>

        <div className="flex gap-2">
          <button className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-sm">
            Remote
          </button>
          <button className="bg-gray-100 px-3 py-1 rounded-full text-sm">
            Office
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="name" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#4f46e5"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
