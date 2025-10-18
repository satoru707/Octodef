import { CheckCircle2, AlertCircle, Loader2, Circle } from 'lucide-react';
import { AgentStatus } from '../lib/types';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AgentProgressBarProps {
  agent: AgentStatus;
}

export const AgentProgressBar = ({ agent }: AgentProgressBarProps) => {
  const getStatusIcon = () => {
    switch (agent.status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-[#065f46]" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-[#1e3a8a] animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getProgressColor = () => {
    if (agent.status === 'error') return 'bg-red-500';
    if (agent.status === 'complete') return 'bg-[#065f46]';
    return 'bg-[#1e3a8a]';
  };

  return (
    <div className="bg-[#111] border border-[#1e3a8a]/20 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
          <div className="flex-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="text-white truncate cursor-help">{agent.name}</h4>
                </TooltipTrigger>
                <TooltipContent className="bg-[#111] border-[#333] text-white max-w-xs">
                  <p>{agent.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-sm text-gray-400 truncate">{agent.description}</p>
          </div>
        </div>
        <span className="text-sm text-gray-400 flex-shrink-0">
          {agent.progress}%
        </span>
      </div>

      <Progress
        value={agent.progress}
        className="h-2 bg-black"
        indicatorClassName={getProgressColor()}
      />

      {agent.result && agent.status === 'complete' && (
        <p className="text-sm text-gray-300 mt-2">{agent.result}</p>
      )}
    </div>
  );
};
