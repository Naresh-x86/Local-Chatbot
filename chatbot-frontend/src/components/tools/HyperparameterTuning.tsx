import React, { useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from '../ChatHeader';
import { Sliders, Save } from 'lucide-react';

const HyperparameterTuning: React.FC = () => {
  const { theme } = useTheme();
  const [params, setParams] = useState({
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    presencePenalty: 0.5,
    frequencyPenalty: 0.5,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Sliders className={theme === 'dark' ? "h-5 w-5 text-neutral-200" : "h-5 w-5 text-gray-700"} />
        <h2 className={theme === 'dark' ? "text-lg font-semibold text-neutral-200" : "text-lg font-semibold text-gray-900"}>
          Hyperparameter Tuning
        </h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className={theme === 'dark' ? "text-neutral-300" : "text-gray-700"}>Temperature</Label>
          <div className="py-2">
            <Slider
              value={[params.temperature]}
              max={2}
              step={0.1}
              className={`w-full ${
                theme === 'dark'
                  ? '[&_[data-orientation=horizontal]]:bg-neutral-700 [&_[role=slider]]:bg-neutral-200 [&_[role=slider]]:border-neutral-300 [&_[role=slider]]:hover:bg-neutral-100 [&_[data-orientation=horizontal]>.relative>.absolute]:bg-neutral-400'
                  : '[&_[data-orientation=horizontal]]:bg-gray-200 [&_[role=slider]]:bg-neutral-800 [&_[role=slider]]:border-neutral-900 [&_[role=slider]]:hover:bg-neutral-700 [&_[data-orientation=horizontal]>.relative>.absolute]:bg-gray-600'
              }`}
              onValueChange={([value]) => setParams(p => ({ ...p, temperature: value }))}
            />
          </div>
          <span className={theme === 'dark' ? "text-sm text-neutral-400" : "text-sm text-gray-600"}>
            {params.temperature} - Controls randomness
          </span>
        </div>

        <div className="space-y-2">
          <Label className={theme === 'dark' ? "text-neutral-300" : "text-gray-700"}>Top P</Label>
          <div className="py-2">
            <Slider
              value={[params.topP]}
              max={1}
              step={0.05}
              className={`w-full ${
                theme === 'dark'
                  ? '[&_[data-orientation=horizontal]]:bg-neutral-700 [&_[role=slider]]:bg-neutral-200 [&_[role=slider]]:border-neutral-300 [&_[role=slider]]:hover:bg-neutral-100 [&_[data-orientation=horizontal]>.relative>.absolute]:bg-neutral-400'
                  : '[&_[data-orientation=horizontal]]:bg-gray-200 [&_[role=slider]]:bg-neutral-800 [&_[role=slider]]:border-neutral-900 [&_[role=slider]]:hover:bg-neutral-700 [&_[data-orientation=horizontal]>.relative>.absolute]:bg-gray-600'
              }`}
              onValueChange={([value]) => setParams(p => ({ ...p, topP: value }))}
            />
          </div>
          <span className={theme === 'dark' ? "text-sm text-neutral-400" : "text-sm text-gray-600"}>
            {params.topP} - Nucleus sampling
          </span>
        </div>

        <div className="space-y-2">
          <Label className={theme === 'dark' ? "text-neutral-300" : "text-gray-700"}>Max Tokens</Label>
          <Input
            type="number"
            value={params.maxTokens}
            onChange={(e) => setParams(p => ({ ...p, maxTokens: parseInt(e.target.value) }))}
            className={theme === 'dark' ? "bg-neutral-800 border-neutral-700 text-gray-200" : "bg-white border-gray-200"}
          />
        </div>

        <Button 
          className={theme === 'dark' ? "w-full bg-neutral-800 hover:bg-neutral-700" : "w-full bg-neutral-800 hover:bg-neutral-700"}
          onClick={() => console.log('Saving parameters:', params)}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Parameters
        </Button>
      </div>
    </div>
  );
};

export default HyperparameterTuning;
