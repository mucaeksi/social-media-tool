export type AgentControl = { id: string; label: string; kind: "link" | "button" | "tab" | "field"; clickable: boolean; writable: boolean };
export type AgentObservation = { id: string; url: string; title: string; text: string; controls: AgentControl[] };
export type AgentDecision = { action: "click" | "type" | "scroll-up" | "scroll-down" | "switch-tab" | "profile" | "done" | "ask"; elementId: string; accountId: string; text: string; message: string };
export const firefoxAgent: {
  version: string; maxSteps: number; lifetime: number;
  safeURL(value: string, platform: string): string | null;
  decision(value: unknown, observation: AgentObservation, tabs: { accountId: string }[]): AgentDecision;
};
