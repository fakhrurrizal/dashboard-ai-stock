import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface ChartConfig {
  title: string;
  type: "line" | "bar";
  data: ChartDataPoint[];
}

export default function ChartRenderer({ title, type, data }: ChartConfig) {
  return (
    <div className="bg-white rounded-[2rem] p-8 mb-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-50 rounded-xl">
          <BarChart3 className="text-orange-500" size={24} />
        </div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        {type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: "none",
                boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
              }}
            />
            <Legend iconType="circle" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#ee4d2d"
              strokeWidth={4}
              dot={{ fill: "#ee4d2d", r: 5 }}
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: "none",
                boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
              }}
            />
            <Legend iconType="circle" />
            <Bar
              dataKey="value"
              fill="#ee4d2d"
              radius={[8, 8, 0, 0]}
              barSize={40}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
