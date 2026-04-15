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
  Settings,
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
  Wand2
} from "lucide-react";
import prettier from "prettier/standalone";
import parserHtml from "prettier/plugins/html";
import parserCss from "prettier/plugins/postcss";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  const generatePreview = useCallback(() => {
    const combinedDoc = `
      <!DOCTYPE html>
      <html>
        <head>
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
          <script>${js}</script>
        </body>
      </html>
    `;
    setSrcDoc(combinedDoc);
  }, [html, css, js]);

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
            <Button variant="ghost" size="sm" className="clay-button rounded-xl px-4 h-9 text-xs font-medium">
              Assets
            </Button>
            <Button variant="ghost" size="sm" className="clay-button rounded-xl px-4 h-9 text-xs font-medium">
              Settings
            </Button>
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
            <Card className="clay-card overflow-hidden flex flex-col border-none flex-1">
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
                          fontSize: 13,
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
            <div className="px-6 py-4 flex items-center justify-between absolute top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-black/5">
              <div className="flex items-center gap-4">
                <div className="text-[10px] font-extrabold text-[#aab] border border-[#eee] px-2 py-0.5 rounded uppercase tracking-tighter">
                  LIVE PREVIEW (60FPS)
                </div>
                
                <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("w-7 h-7 rounded-md transition-all", previewMode === 'mobile' ? "clay-button-inset text-primary" : "hover:bg-black/5")}
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("w-7 h-7 rounded-md transition-all", previewMode === 'tablet' ? "clay-button-inset text-primary" : "hover:bg-black/5")}
                    onClick={() => setPreviewMode('tablet')}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("w-7 h-7 rounded-md transition-all", previewMode === 'desktop' ? "clay-button-inset text-primary" : "hover:bg-black/5")}
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
                      className="clay-button rounded-xl w-8 h-8"
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
                  className="clay-button rounded-xl w-8 h-8"
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
