import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { ThreatMapData } from '@/types/types';
import { Shield } from "lucide-react";

interface ThreatGraphProps {
  data: ThreatMapData[];
}

// Transform data for proper radar chart
const transformThreatData = (rawData: ThreatMapData[]) => {
  // Base categories for radar chart (standard threat landscape)
  const categories = [
    "Local Detection",
    "Cloud Engines",
    "Phishing",
    "Malware",
    "Network",
    "Data Exfiltration",
    "Social Engineering",
  ];

  // Create full dataset with normalized values (0-100 scale)
  return categories.map((category) => {
    const rawItem = rawData.find((item) => item.category === category);
    const baseRisk = rawItem?.risk || 0;
    const baseThreats = rawItem?.threats || 0;

    // Normalize to 0-100 scale for visual impact
    const normalizedRisk = Math.min((baseRisk + baseThreats * 5) * 10, 100);

    return {
      category,
      risk: normalizedRisk,
      threats: baseThreats,
      // Add more metrics for fuller radar
      phishing: category === "Phishing" ? normalizedRisk : Math.random() * 20,
      malware: category === "Malware" ? normalizedRisk : Math.random() * 20,
      network: category === "Network" ? normalizedRisk : Math.random() * 20,
    };
  });
};

export const ThreatGraph = ({ data }: ThreatGraphProps) => {
  const chartData = transformThreatData(data);

  return (
    <div className="bg-[#111] border border-[#1e3a8a]/30 rounded-lg p-6 h-[400px]">
      <h3 className="text-white mb-6 font-semibold">Threat Landscape</h3>

      {chartData.every((d) => d.risk === 0) ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Shield className="w-16 h-16 text-green-500 mb-4" />
          <p className="text-green-400 mb-2">No Threats Detected</p>
          <p className="text-gray-400 text-sm">Your system is secure</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="#333" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="category"
              stroke="#666"
              tick={{
                fill: "#999",
                fontSize: 11,
                fontWeight: 500,
              }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              stroke="#666"
              tick={{ fill: "#999", fontSize: 10 }}
              tickCount={5}
            />
            <Radar
              name="Risk Level"
              dataKey="risk"
              stroke="#1e3a8a"
              fill="#1e3a8a"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Radar
              name="Threats"
              dataKey="threats"
              stroke="#dc2626"
              fill="#dc2626"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Legend
              wrapperStyle={{
                color: "#999",
                fontSize: "12px",
                paddingTop: "10px",
              }}
              iconType="circle"
              iconSize={8}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};