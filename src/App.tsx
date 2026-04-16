/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Code2, 
  Eye, 
  Layout, 
  Play, 
  RotateCcw, 
  Download, 
  Settings as SettingsIcon,
  Maximize2,
  Minimize2,
  Layers,
  FileCode,
  Palette,
  Zap,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Wand2,
  Sparkles,
  Send,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  Info
} from "lucide-react";
import prettier from "prettier/standalone";
import parserHtml from "prettier/plugins/html";
import parserCss from "prettier/plugins/postcss";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import { GoogleGenAI, Type } from "@google/genai";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const INITIAL_HTML = `<div class="container">
  <h1>Liquid Clay Studio</h1>
  <p>Start building something beautiful with fluid animations and soft shadows.</p>
  <div class="clay-box">
    Fluid Motion
  </div>
</div>`;

const INITIAL_CSS = `body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #1a1c23;
  color: #f8f8f2;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.container {
  text-align: center;
  padding: 2rem;
}

h1 {
  color: #a389d4;
  font-size: 3rem;
  margin-bottom: 1rem;
}

p {
  color: #99a;
  margin-bottom: 2rem;
}

.clay-box {
  width: 200px;
  height: 200px;
  background: #282a36;
  border-radius: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  color: #f8f8f2;
  margin: 0 auto;
  box-shadow: 
    15px 15px 35px #0d0e12,
    -15px -15px 35px #272a34,
    inset -4px -4px 10px rgba(0,0,0,0.2),
    inset 4px 4px 10px rgba(255,255,255,0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.clay-box:hover {
  transform: scale(1.05);
  box-shadow: 
    20px 20px 45px #0d0e12,
    -20px -20px 45px #272a34,
    inset -2px -2px 5px rgba(0,0,0,0.2),
    inset 2px 2px 5px rgba(255,255,255,0.05);
}`;

const INITIAL_JS = `const box = document.querySelector('.clay-box');

box.addEventListener('click', () => {
  const colors = ['#ff9a9e', '#fad0c4', '#a1c4fd', '#c2e9fb', '#d4fc79', '#96e6a1'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  box.style.background = randomColor;
  console.log('Color changed to:', randomColor);
});`;

export default function App() {
  const [html, setHtml] = useState(INITIAL_HTML);
  const [css, setCss] = useState(INITIAL_CSS);
  const [js, setJs] = useState(INITIAL_JS);
  const [srcDoc, setSrcDoc] = useState("");
  const [activeTab, setActiveTab] = useState("html");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoRun, setIsAutoRun] = useState(true);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  const [logs, setLogs] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  
  // Settings & Assets State
  const [fontSize, setFontSize] = useState(13);
  const [externalAssets, setExternalAssets] = useState<{type: 'css' | 'js', url: string}[]>([]);
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [newAssetType, setNewAssetType] = useState<'css' | 'js'>('css');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const generatePreview = useCallback(() => {
    const cssLinks = externalAssets.filter(a => a.type === 'css').map(a => `<link rel="stylesheet" href="${a.url}">`).join('\n');
    const jsLinks = externalAssets.filter(a => a.type === 'js').map(a => `<script src="${a.url}"></script>`).join('\n');

    const combinedDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          ${cssLinks}
          <style>${css}</style>
          <script>
            (function() {
              const oldLog = console.log;
              console.log = function(...args) {
                window.parent.postMessage({ type: 'log', content: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }, '*');
                oldLog.apply(console, args);
              };
              window.onerror = function(msg, url, line, col, error) {
                window.parent.postMessage({ type: 'error', content: msg + " (line " + line + ")" }, '*');
              };
            })();
          </script>
        </head>
        <body>
          ${html}
          ${jsLinks}
          <script>${js}</script>
        </body>
      </html>
    `;
    setSrcDoc(combinedDoc);
  }, [html, css, js, externalAssets]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'log' || event.data.type === 'error') {
        setLogs(prev => [...prev, `${event.data.type === 'error' ? '❌' : '⚡'} ${event.data.content}`].slice(-50));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (isAutoRun) {
      const timeout = setTimeout(() => {
        setLogs([]); // Clear logs on re-run
        generatePreview();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [html, css, js, isAutoRun, generatePreview]);

  const handleReset = () => {
    setHtml(INITIAL_HTML);
    setCss(INITIAL_CSS);
    setJs(INITIAL_JS);
  };

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([srcDoc], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = "liquid-clay-project.html";
    document.body.appendChild(element);
    element.click();
  };

  const formatCode = async () => {
    try {
      let formatted = "";
      if (activeTab === "html") {
        formatted = await prettier.format(html, {
          parser: "html",
          plugins: [parserHtml],
        });
        setHtml(formatted);
      } else if (activeTab === "css") {
        formatted = await prettier.format(css, {
          parser: "css",
          plugins: [parserCss],
        });
        setCss(formatted);
      } else if (activeTab === "js") {
        formatted = await prettier.format(js, {
          parser: "babel",
          plugins: [parserBabel, parserEstree],
        });
        setJs(formatted);
      }
    } catch (error) {
      console.error("Formatting error:", error);
      setLogs(prev => [...prev, `❌ Format Error: ${error instanceof Error ? error.message : String(error)}`]);
    }
  };

  const refreshPreview = () => {
    setRefreshKey(prev => prev + 1);
    generatePreview();
  };

  const addAsset = () => {
    if (!newAssetUrl.trim()) return;
    setExternalAssets(prev => [...prev, { type: newAssetType, url: newAssetUrl }]);
    setNewAssetUrl("");
  };

  const removeAsset = (index: number) => {
    setExternalAssets(prev => prev.filter((_, i) => i !== index));
  };

  const generateWithAI = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setLogs(prev => [...prev, `🤖 AI Agent is thinking...`]);
    
    try {
      const systemInstruction = `You are an expert web developer. Your task is to generate HTML, CSS, and JavaScript based on the user's request.
      Return the response in JSON format with the following structure:
      {
        "html": "string",
        "css": "string",
        "js": "string",
        "explanation": "string"
      }
      The CSS should be modern and responsive. Use the Liquid Obsidian theme colors if appropriate: 
      Background: #1a1c23, Foreground: #f8f8f2, Primary: #a389d4, Secondary: #6c8cd5.
      Ensure the code is complete and ready to run.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          ...chatHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              html: { type: Type.STRING },
              css: { type: Type.STRING },
              js: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["html", "css", "js", "explanation"]
          }
        }
      });

      const result = JSON.parse(response.text);
      
      setHtml(result.html);
      setCss(result.css);
      setJs(result.js);
      setChatHistory(prev => [
        ...prev, 
        { role: 'user', text: prompt },
        { role: 'model', text: result.explanation }
      ]);
      setPrompt("");
      setLogs(prev => [...prev, `✅ AI Generation complete: ${result.explanation}`]);
      
      if (isAutoRun) {
        generatePreview();
      }
    } catch (error) {
      console.error("AI Generation error:", error);
      setLogs(prev => [...prev, `❌ AI Error: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen p-5 flex flex-col gap-5 bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-5 h-[60px] clay-card shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="dot bg-[#ff5f56]" />
              <div className="dot bg-[#ffbd2e]" />
              <div className="dot bg-[#27c93f]" />
            </div>
            <Separator orientation="vertical" className="h-6 mx-2 opacity-20" />
            <div>
              <h1 className="text-sm font-bold text-[#a389d4] tracking-tight">LiquidObsidian_Studio_v2.js</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger render={
                <Button variant="ghost" size="sm" className="clay-button rounded-xl px-4 h-9 text-xs font-medium">
                  Assets
                </Button>
              } />
              <DialogContent className="clay-card border-none bg-background text-foreground max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-[#a389d4] flex items-center gap-2">
                    <Layers className="w-5 h-5" /> External Assets
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Add external CSS or JS libraries to your project.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Add New Asset</Label>
                    <div className="flex gap-2">
                      <select 
                        value={newAssetType} 
                        onChange={(e) => setNewAssetType(e.target.value as 'css' | 'js')}
                        className="bg-black/20 rounded-lg px-2 text-xs clay-button-inset border-none outline-none"
                      >
                        <option value="css">CSS</option>
                        <option value="js">JS</option>
                      </select>
                      <Input 
                        placeholder="https://cdn.jsdelivr.net/..." 
                        value={newAssetUrl}
                        onChange={(e) => setNewAssetUrl(e.target.value)}
                        className="flex-1 clay-button-inset border-none text-xs"
                      />
                      <Button onClick={addAsset} size="icon" className="clay-button shrink-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Separator className="opacity-10" />
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Current Assets</Label>
                    <ScrollArea className="h-[200px] pr-4">
                      {externalAssets.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground italic">No external assets added.</div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {externalAssets.map((asset, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black/10 text-[10px]">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded font-bold uppercase",
                                  asset.type === 'css' ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"
                                )}>
                                  {asset.type}
                                </span>
                                <span className="truncate opacity-70">{asset.url}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive/80"
                                onClick={() => removeAsset(i)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger render={
                <Button variant="ghost" size="sm" className="clay-button rounded-xl px-4 h-9 text-xs font-medium">
                  Settings
                </Button>
              } />
              <DialogContent className="clay-card border-none bg-background text-foreground max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-[#a389d4] flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5" /> Studio Settings
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-bold uppercase tracking-wider">Auto-Run</Label>
                      <span className="text-[10px] text-muted-foreground">Recompile preview on code change</span>
                    </div>
                    <Button 
                      onClick={() => setIsAutoRun(!isAutoRun)}
                      className={cn("clay-button w-12 h-6 rounded-full", isAutoRun ? "bg-primary/20 text-primary" : "opacity-50")}
                    >
                      <div className={cn("w-4 h-4 rounded-full bg-current transition-all", isAutoRun ? "translate-x-2" : "-translate-x-2")} />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label className="text-xs font-bold uppercase tracking-wider">Editor Font Size</Label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="10" 
                        max="24" 
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="flex-1 accent-[#a389d4]"
                      />
                      <span className="text-xs font-mono w-8">{fontSize}px</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider">Project Info</Label>
                    <div className="p-3 rounded-xl bg-black/10 text-[10px] flex flex-col gap-2">
                      <div className="flex justify-between">
                        <span className="opacity-50">Version</span>
                        <span>2.5.0-obsidian</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-50">Engine</span>
                        <span>LiquidVite v4.1</span>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleReset} variant="ghost" className="text-destructive text-xs hover:bg-destructive/10">
                    <RotateCcw className="w-3 h-3 mr-2" /> Reset All Code
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              className="clay-button bg-background text-[#6c8cd5] hover:bg-background/90 rounded-xl px-5 h-9 text-xs font-bold"
              onClick={generatePreview}
            >
              COMPILE & RUN
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-5 min-h-0">
          {/* Editor Section */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* AI Agent Input */}
            <Card className="clay-card p-4 flex flex-col gap-3 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#a389d4]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#a389d4]">AI Website Agent</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the website you want to build..."
                    className="w-full h-20 bg-black/20 rounded-xl p-3 text-xs text-foreground border-none resize-none focus:ring-1 focus:ring-[#a389d4]/50 clay-button-inset"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        generateWithAI();
                      }
                    }}
                  />
                </div>
                <Button 
                  onClick={generateWithAI}
                  disabled={isGenerating || !prompt.trim()}
                  className="clay-button h-20 w-12 rounded-xl flex items-center justify-center bg-background hover:bg-background/90"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin text-[#a389d4]" /> : <Send className="w-5 h-5 text-[#a389d4]" />}
                </Button>
              </div>
              {chatHistory.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground italic">Follow-up enabled. Ask for changes above.</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-4 text-[9px] ml-auto hover:text-destructive"
                    onClick={() => setChatHistory([])}
                  >
                    Reset Chat
                  </Button>
                </div>
              )}
            </Card>

            <Card className="clay-card overflow-hidden flex flex-col border-none flex-1 min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-4 py-2 flex items-center justify-between border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <TabsList className="bg-transparent p-0 h-8 gap-1">
                      <TabsTrigger value="html" className="rounded-lg px-3 h-7 text-[10px] uppercase tracking-wider font-bold data-[state=active]:clay-button-inset">
                        index.html
                      </TabsTrigger>
                      <TabsTrigger value="css" className="rounded-lg px-3 h-7 text-[10px] uppercase tracking-wider font-bold data-[state=active]:clay-button-inset">
                        styles.css
                      </TabsTrigger>
                      <TabsTrigger value="js" className="rounded-lg px-3 h-7 text-[10px] uppercase tracking-wider font-bold data-[state=active]:clay-button-inset">
                        script.js
                      </TabsTrigger>
                    </TabsList>
                    
                    <Tooltip>
                      <TooltipTrigger render={
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 clay-button rounded-lg ml-2"
                          onClick={formatCode}
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                        </Button>
                      } />
                      <TooltipContent>Format Code (Prettier)</TooltipContent>
                    </Tooltip>
                  </div>
                  
                  <div className="text-[10px] font-bold text-muted-foreground opacity-50 uppercase tracking-widest">
                    {activeTab === 'html' ? 'v4.2' : activeTab === 'css' ? '64 lines' : 'Main Thread'}
                  </div>
                </div>

                <div className="flex-1 min-h-0 relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-0"
                    >
                      <Editor
                        height="100%"
                        theme="vs-dark"
                        language={activeTab === "js" ? "javascript" : activeTab}
                        value={activeTab === "html" ? html : activeTab === "css" ? css : js}
                        onChange={(value) => {
                          if (activeTab === "html") setHtml(value || "");
                          else if (activeTab === "css") setCss(value || "");
                          else setJs(value || "");
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: fontSize,
                          lineNumbers: "on",
                          roundedSelection: true,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 15, bottom: 15 },
                          fontFamily: "'JetBrains Mono', monospace",
                          backgroundColor: "#282a36",
                        }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Console Section */}
                <div className="h-32 bg-[#282a36]/95 border-t border-white/5 flex flex-col">
                  <div className="px-4 py-1.5 flex items-center justify-between bg-black/20">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#6272a4]">Console Output</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 text-[9px] hover:bg-white/10 text-white/50 rounded px-2"
                      onClick={() => setLogs([])}
                    >
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 p-3 font-mono text-[11px] text-[#f8f8f2]">
                    {logs.length === 0 ? (
                      <span className="text-[#6272a4] italic">No output yet...</span>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className="mb-1 last:mb-0 break-all">
                          {log}
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </Tabs>
            </Card>
          </div>

          {/* Preview Section */}
          <Card className={cn(
            "clay-preview-pane overflow-hidden flex flex-col border-none transition-all duration-500",
            isFullscreen ? "fixed inset-5 z-50 m-0" : "relative"
          )}>
            <div className="px-6 py-4 flex items-center justify-between absolute top-0 left-0 right-0 z-10 bg-black/40 backdrop-blur-md border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="text-[10px] font-extrabold text-white/60 border border-white/10 px-2 py-0.5 rounded uppercase tracking-tighter">
                  LIVE PREVIEW (60FPS)
                </div>
                
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("w-7 h-7 rounded-md transition-all", previewMode === 'mobile' ? "clay-button-inset text-[#a389d4]" : "hover:bg-white/5 text-white/50")}
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("w-7 h-7 rounded-md transition-all", previewMode === 'tablet' ? "clay-button-inset text-[#a389d4]" : "hover:bg-white/5 text-white/50")}
                    onClick={() => setPreviewMode('tablet')}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("w-7 h-7 rounded-md transition-all", previewMode === 'desktop' ? "clay-button-inset text-[#a389d4]" : "hover:bg-white/5 text-white/50")}
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger render={
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="clay-button rounded-xl w-8 h-8 text-white/70"
                      onClick={refreshPreview}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  } />
                  <TooltipContent>Refresh Preview</TooltipContent>
                </Tooltip>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="clay-button rounded-xl w-8 h-8 text-white/70"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-muted/10 relative flex items-center justify-center pt-14">
              <div 
                className={cn(
                  "bg-white shadow-2xl transition-all duration-500 overflow-hidden relative",
                  previewMode === 'mobile' ? "w-[375px] h-[667px] rounded-[3rem] border-[12px] border-black" : 
                  previewMode === 'tablet' ? "w-[768px] h-[1024px] rounded-[2rem] border-[8px] border-black" : 
                  "w-full h-full"
                )}
              >
                <iframe
                  key={refreshKey}
                  srcDoc={srcDoc}
                  title="preview"
                  sandbox="allow-scripts"
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          </Card>
        </main>

        {/* Status Bar */}
        <footer className="h-[30px] flex items-center justify-between px-4 clay-button-inset rounded-xl text-[11px] text-[#7f8c8d] shrink-0 font-medium">
          <div className="flex items-center gap-6">
            <div className="font-mono">Ln 14, Col 22</div>
            <div>UTF-8</div>
            <div>Prettier: Enabled</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#27c93f]" />
            <span>Connected to Cloud Compiler v2.1.0</span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
