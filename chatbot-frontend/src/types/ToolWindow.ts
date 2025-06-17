export type ToolWindowId = 
  | 'hyperparameter_tuning'
  | 'documentation_explorer';

export interface ToolWindow {
  id: ToolWindowId;
  name: string;
  description: string;
  icon: string;
}

export const TOOL_WINDOWS: ToolWindow[] = [
  {
    id: 'hyperparameter_tuning',
    name: 'Hyperparameter Tuning',
    description: 'Fine-tune LLM parameters',
    icon: 'Sliders'
  },
  {
    id: 'documentation_explorer',
    name: 'Documentation Explorer',
    description: 'Browse and search documentation',
    icon: 'BookOpen'
  }
];
