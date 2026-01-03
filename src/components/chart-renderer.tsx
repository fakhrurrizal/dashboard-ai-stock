import React, { useRef } from "react";
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
import { BarChart3, Download } from "lucide-react";
import { domToPng } from "modern-screenshot";

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
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!chartRef.current) return;

    try {
      const dataUrl = await domToPng(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        filter: (node: Node) => {
          if (node instanceof HTMLElement) {
            return !node.classList.contains("download-ignore");
          }
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal mendownload chart:", err);
    }
  };

  return (
    <div
      ref={chartRef}
      className="bg-white rounded-[2rem] p-8 mb-6 shadow-sm border border-gray-100 relative group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-xl">
            <BarChart3 className="text-orange-500" size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <button
          onClick={handleDownload}
          className="download-ignore p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all duration-200"
          title="Download PNG"
        >
          <Download size={20} />
        </button>
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
              activeDot={{ r: 7, strokeWidth: 0 }}
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
              cursor={{ fill: "#fdf2f0" }}
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
