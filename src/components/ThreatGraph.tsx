import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { ThreatMapData } from '@/lib/types';

interface ThreatGraphProps {
  data: ThreatMapData[];
}

export const ThreatGraph = ({ data }: ThreatGraphProps) => {
  return (
    <div className="bg-[#111] border border-[#1e3a8a]/30 rounded-lg p-6">
      <h3 className="text-white mb-6">Threat Landscape</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#333" />
          <PolarAngleAxis
            dataKey="category"
            stroke="#666"
            tick={{ fill: '#999', fontSize: 12 }}
          />
          <PolarRadiusAxis stroke="#666" tick={{ fill: '#999' }} />
          <Radar
            name="Risk Level"
            dataKey="risk"
            stroke="#1e3a8a"
            fill="#1e3a8a"
            fillOpacity={0.6}
          />
          <Legend
            wrapperStyle={{ color: '#999' }}
            iconType="circle"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
