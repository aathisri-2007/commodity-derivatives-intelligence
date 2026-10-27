import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

ChartJS.defaults.color = "#78716C";
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.size = 11;

export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index" as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: "top" as const,
      align: "end" as const,
      labels: {
        color: "#57534E",
        font: { family: "'Inter', sans-serif", size: 11, weight: 500 as const },
        boxWidth: 8,
        boxHeight: 8,
        padding: 16,
        usePointStyle: true,
        pointStyle: "rectRounded" as const,
      },
    },
    tooltip: {
      backgroundColor: "#FFFFFF",
      titleColor: "#1C1917",
      bodyColor: "#44403C",
      borderColor: "#E7E5E4",
      borderWidth: 1,
      padding: 12,
      boxPadding: 6,
      titleFont: { family: "'Inter', sans-serif", size: 12, weight: 600 as const },
      bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
      displayColors: true,
      cornerRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    },
  },
  scales: {
    x: {
      border: { display: false },
      grid: { color: "rgba(231, 229, 228, 0.7)", drawTicks: false },
      ticks: {
        color: "#A8A29E",
        font: { family: "'JetBrains Mono', monospace", size: 10 },
        maxTicksLimit: 8,
        padding: 8,
      },
    },
    y: {
      border: { display: false },
      grid: { color: "rgba(231, 229, 228, 0.7)", drawTicks: false },
      ticks: {
        color: "#A8A29E",
        font: { family: "'JetBrains Mono', monospace", size: 10 },
        padding: 10,
        callback: function (value: any) {
          if (typeof value === "number" && Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(0) + "k";
          }
          return value;
        },
      },
    },
  },
};