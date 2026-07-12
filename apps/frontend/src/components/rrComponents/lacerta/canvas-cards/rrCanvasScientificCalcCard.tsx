"use client";

import React, { useState, useEffect } from "react";
import { CanvasNode } from "../CanvasEditor";
import { create, all } from "mathjs";
import katex from "katex";
import { Clipboard, RotateCcw, AlertTriangle } from "lucide-react";

const math = create(all);

interface RrCanvasScientificCalcCardProps {
  node: CanvasNode;
  isLocked?: boolean;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
}

export default function RrCanvasScientificCalcCard({
  node,
  isLocked = false,
  onNodeUpdate,
}: RrCanvasScientificCalcCardProps) {
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [latexHTML, setLatexHTML] = useState<string>("");

  // Local shortcuts to node-persisted attributes
  const inputVal = node.text || "";
  const angleMode = node.angleMode || "rad";
  const memory = node.memory || 0;
  const ans = node.ans || "0";

  const setInputVal = (val: string) => {
    if (isLocked) return;
    onNodeUpdate({ text: val });
  };

  // Angle Mode calculations
  const degToRad = (val: number) => (val * Math.PI) / 180;
  const radToDeg = (val: number) => (val * 180) / Math.PI;
  const gradToRad = (val: number) => (val * Math.PI) / 200;
  const radToGrad = (val: number) => (val * 200) / Math.PI;

  const buildScope = () => {
    const scope: Record<string, any> = {
      ...(node.variables || {}),
      pi: Math.PI,
      e: Math.E,
      Ans: Number(ans) || 0,
    };
    scope.sin = (x: number) =>
      angleMode === "deg"
        ? Math.sin(degToRad(x))
        : angleMode === "grad"
          ? Math.sin(gradToRad(x))
          : Math.sin(x);
    scope.cos = (x: number) =>
      angleMode === "deg"
        ? Math.cos(degToRad(x))
        : angleMode === "grad"
          ? Math.cos(gradToRad(x))
          : Math.cos(x);
    scope.tan = (x: number) =>
      angleMode === "deg"
        ? Math.tan(degToRad(x))
        : angleMode === "grad"
          ? Math.tan(gradToRad(x))
          : Math.tan(x);
    scope.asin = (x: number) =>
      angleMode === "deg"
        ? radToDeg(Math.asin(x))
        : angleMode === "grad"
          ? radToGrad(Math.asin(x))
          : Math.asin(x);
    scope.acos = (x: number) =>
      angleMode === "deg"
        ? radToDeg(Math.acos(x))
        : angleMode === "grad"
          ? radToGrad(Math.acos(x))
          : Math.acos(x);
    scope.atan = (x: number) =>
      angleMode === "deg"
        ? radToDeg(Math.atan(x))
        : angleMode === "grad"
          ? radToGrad(Math.atan(x))
          : Math.atan(x);

    // Algebraic simplification
    scope.simplify = (expr: string) => {
      return math.simplify(expr).toString();
    };

    // Numerical integration (Trapezoidal Rule)
    scope.integrate = (expr: string, start: number, end: number) => {
      const steps = 1000;
      const h = (end - start) / steps;
      let sum = 0;
      const compiled = math.compile(expr);
      const scopeVars = { ...(node.variables || {}), pi: Math.PI, e: Math.E, Ans: Number(ans) || 0 };
      for (let i = 0; i <= steps; i++) {
        const x = start + i * h;
        const y = compiled.evaluate({ ...scopeVars, x });
        const factor = (i === 0 || i === steps) ? 0.5 : 1;
        sum += factor * y;
      }
      return sum * h;
    };

    return scope;
  };

  const handleEvaluate = () => {
    if (!inputVal.trim()) return;
    try {
      setError("");
      if (inputVal.includes("=")) {
        const parts = inputVal.split("=");
        const varName = parts[0].trim();
        const varExpr = parts[1].trim();

        // Check if the left side is a single clean variable name. If so, treat as assignment.
        if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(varName)) {
          const evalRes = math.evaluate(varExpr, buildScope());
          const resStr = math.format(evalRes, { precision: 10 });
          onNodeUpdate({
            variables: {
              ...(node.variables || {}),
              [varName]: resStr,
            },
            text: "",
          });
          setResult(`${varName} = ${resStr}`);
          return;
        }

        // Otherwise, solve as an algebraic single-variable equation
        const left = parts[0].trim();
        const right = parts[1].trim();

        // Parse implicit multiplication (e.g. 3x -> 3 * x)
        let cleanLeft = left;
        let cleanRight = right;
        try {
          cleanLeft = left.replace(/(\d+)([a-zA-Z])/g, "$1 * $2");
          cleanRight = right.replace(/(\d+)([a-zA-Z])/g, "$1 * $2");
        } catch {}

        // Find the single variable in the equation
        const variablesFound = new Set<string>();
        const matches = (cleanLeft + " " + cleanRight).match(/[a-zA-Z]/g);
        if (matches) {
          matches.forEach((v) => {
            if (!["pi", "e", "Ans", "sin", "cos", "tan", "log", "ln", "abs", "hyp", "i", "simplify", "integrate"].includes(v)) {
              variablesFound.add(v);
            }
          });
        }

        if (variablesFound.size === 0) {
          throw new Error("No algebraic variable found to solve (e.g. x).");
        }
        if (variablesFound.size > 1) {
          throw new Error(`Multiple variables found: ${Array.from(variablesFound).join(", ")}`);
        }

        const solveVar = Array.from(variablesFound)[0];
        const exprToSolve = `(${cleanLeft}) - (${cleanRight})`;
        const compiled = math.compile(exprToSolve);

        const f = (val: number) => {
          const scope = { ...(node.variables || {}), pi: Math.PI, e: Math.E, Ans: Number(ans) || 0, [solveVar]: val };
          return compiled.evaluate(scope);
        };

        // Multi-root finder scanning interval [-100, 100]
        const roots: number[] = [];
        const scanMin = -100;
        const scanMax = 100;
        const scanSteps = 400;
        const step = (scanMax - scanMin) / scanSteps;

        // Bisection helper
        const findRootBisection = (lower: number, upper: number) => {
          let a = lower;
          let b = upper;
          for (let k = 0; k < 60; k++) {
            const mid = (a + b) / 2;
            const fa = f(a);
            const fmid = f(mid);
            if (Math.abs(fmid) < 1e-12) return mid;
            if (fa * fmid < 0) {
              b = mid;
            } else {
              a = mid;
            }
          }
          return (a + b) / 2;
        };

        // Scan intervals
        try {
          let lastVal = f(scanMin);
          for (let i = 1; i <= scanSteps; i++) {
            const xVal = scanMin + i * step;
            const currentVal = f(xVal);
            if (Math.abs(currentVal) < 1e-12) {
              if (!roots.some(r => Math.abs(r - xVal) < 1e-4)) {
                roots.push(xVal);
              }
            } else if (lastVal * currentVal < 0) {
              const root = findRootBisection(xVal - step, xVal);
              if (!roots.some(r => Math.abs(r - root) < 1e-4)) {
                roots.push(root);
              }
            }
            lastVal = currentVal;
          }
        } catch {
          // Ignore failures during broad scans
        }

        // Fallback to Secant solver if scan didn't find any roots
        if (roots.length === 0) {
          try {
            let p0 = 1;
            let p1 = 2;
            let q0 = f(p0);
            let q1 = f(p1);
            for (let i = 0; i < 80; i++) {
              if (Math.abs(q1 - q0) < 1e-15) break;
              const p = p1 - (q1 * (p1 - p0)) / (q1 - q0);
              if (Math.abs(p - p1) < 1e-9) {
                roots.push(p);
                break;
              }
              p0 = p1;
              q0 = q1;
              p1 = p;
              q1 = f(p1);
            }
          } catch {
            // Ignore fallback solver errors
          }
        }

        if (roots.length > 0) {
          roots.sort((a, b) => a - b);
          const results = roots.map(r => `${solveVar} = ${math.format(r, { precision: 6 })}`).join(", ");
          setResult(results);
          onNodeUpdate({ ans: results });
          return;
        }
        throw new Error("No real roots found.");
      }

      const evalRes = math.evaluate(inputVal, buildScope());
      const resStr = math.format(evalRes, { precision: 10 });
      setResult(resStr);
      onNodeUpdate({ ans: resStr });
    } catch (err: any) {
      setError(err.message || "Math Error");
    }
  };

  useEffect(() => {
    if (!inputVal.trim()) {
      setLatexHTML("");
      return;
    }
    try {
      const tex = math.parse(inputVal).toTex();
      setLatexHTML(
        katex.renderToString(tex, { throwOnError: false, displayMode: true }),
      );
    } catch {
      setLatexHTML("");
    }
  }, [inputVal]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEvaluate();
  };

  const handleCopyLaTeX = () => {
    try {
      const tex = inputVal ? math.parse(inputVal).toTex() : result;
      navigator.clipboard.writeText(tex);
    } catch {
      navigator.clipboard.writeText(inputVal || result);
    }
  };

  const addToken = (token: string) => {
    if (isLocked) return;
    setInputVal(inputVal + token);
  };

  // Backspace last token
  const handleDel = () => {
    if (isLocked) return;
    setInputVal(inputVal.slice(0, -1));
  };

  const handleAC = () => {
    if (isLocked) return;
    setInputVal("");
    setResult("");
    setError("");
  };

  const handleMemory = (op: "MC" | "MR" | "M-" | "MS") => {
    if (isLocked) return;
    const currentNum = Number(result) || Number(ans) || 0;
    switch (op) {
      case "MC":
        onNodeUpdate({ memory: 0 });
        break;
      case "MR":
        setInputVal(inputVal + memory.toString());
        break;
      case "M-":
        onNodeUpdate({ memory: memory - currentNum });
        break;
      case "MS":
        onNodeUpdate({ memory: currentNum });
        break;
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-2 bg-[#1e2530] border border-slate-700 rounded-2xl select-none text-slate-100 overflow-hidden font-sans">
      {/* Top LCD Display Screen */}
      <div className="flex flex-col bg-[#0b0f19] border border-slate-800 rounded-xl p-2.5 mb-1.5 font-mono relative shrink-0 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
        {/* Math Visual Render (LaTeX / KaTeX) */}
        <div className="min-h-10 flex items-center justify-end text-right overflow-x-auto overflow-y-hidden py-0.5 scrollbar-none text-slate-100 border-b border-slate-800/60">
          {latexHTML ? (
            <div
              className="text-base tracking-wide flex justify-end"
              dangerouslySetInnerHTML={{ __html: latexHTML }}
            />
          ) : (
            <span className="text-slate-500 text-[10px] italic select-none">
              {inputVal || "0"}
            </span>
          )}
        </div>

        {/* Output */}
        <div className="text-right text-base font-extrabold mt-1 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)] overflow-x-auto whitespace-nowrap scrollbar-none">
          {result || ans || "0"}
        </div>

        {error && (
          <div className="text-left text-[8px] text-rose-400 font-semibold flex items-center gap-1 mt-0.5">
            <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar & Actions */}
        <div className="flex items-center justify-between gap-1 border-t border-slate-800/40 pt-1 mt-1">
          <input
            type="text"
            value={inputVal}
            readOnly={isLocked}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isLocked ? "Locked" : "Expression..."}
            className="flex-1 bg-transparent border-none text-left font-mono text-[9px] text-slate-300 focus:outline-none focus:ring-0 p-0"
          />
          <div className="flex gap-1 shrink-0">
            <button
              onClick={handleCopyLaTeX}
              className="p-0.5 hover:bg-slate-800 rounded text-slate-400"
            >
              <Clipboard className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={handleAC}
              className="p-0.5 hover:bg-slate-800 rounded text-slate-400"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Angle Mode & Sub Header Status */}
      <div className="flex justify-between items-center px-1 mb-1 text-[8px] font-bold text-slate-400 shrink-0">
        <div>M = {memory}</div>
        <div className="flex gap-1 bg-slate-800/80 p-0.5 rounded border border-slate-700/60">
          {(["deg", "rad", "grad"] as const).map((m) => (
            <button
              key={m}
              disabled={isLocked}
              onClick={() => onNodeUpdate({ angleMode: m })}
              className={`px-1 py-0.5 rounded uppercase text-[7px] ${
                angleMode === m
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Button Layout Grid */}
      <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-y-auto pr-0.5 scrollbar-none">
        {/* Row 1 (Memory functions, Abs, Cube) */}
        <div className="grid grid-cols-6 gap-1 shrink-0">
          <button
            onClick={() => handleMemory("MC")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold active:scale-95 transition-transform"
          >
            MC
          </button>
          <button
            onClick={() => handleMemory("MR")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold active:scale-95 transition-transform"
          >
            MR
          </button>
          <button
            onClick={() => handleMemory("M-")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold active:scale-95 transition-transform"
          >
            M-
          </button>
          <button
            onClick={() => handleMemory("MS")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold active:scale-95 transition-transform"
          >
            MS
          </button>
          <button
            onClick={() => addToken("abs(")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold active:scale-95 transition-transform"
          >
            Abs
          </button>
          <button
            onClick={() => addToken("^3")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold active:scale-95 transition-transform"
          >
            x³
          </button>
        </div>

        {/* Row 2 (Fraction, Roots, Logs, ln) */}
        <div className="grid grid-cols-6 gap-1 shrink-0">
          <button
            onClick={() => addToken("/")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-semibold active:scale-95 transition-transform"
          >
            ■/■
          </button>
          <button
            onClick={() => addToken("sqrt(")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-semibold active:scale-95 transition-transform"
          >
            √■
          </button>
          <button
            onClick={() => addToken("^2")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-semibold active:scale-95 transition-transform"
          >
            x²
          </button>
          <button
            onClick={() => addToken("^")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-semibold active:scale-95 transition-transform"
          >
            x■
          </button>
          <button
            onClick={() => addToken("log10(")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-semibold active:scale-95 transition-transform"
          >
            log
          </button>
          <button
            onClick={() => addToken("log(")}
            className="py-1 text-[8px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-semibold active:scale-95 transition-transform"
          >
            ln
          </button>
        </div>

        {/* Row 3 (Negative, Constants, hyp, Trig) */}
        <div className="grid grid-cols-6 gap-1 shrink-0">
          <button
            onClick={() => addToken("-")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            (-)
          </button>
          <button
            onClick={() => addToken("pi")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            π
          </button>
          <button
            onClick={() => addToken("e")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            e
          </button>
          <button
            onClick={() => addToken("sinh(")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            hyp
          </button>
          <button
            onClick={() => addToken("sin(")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            sin
          </button>
          <button
            onClick={() => addToken("cos(")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            cos
          </button>
        </div>

        {/* Row 4 (Trig end, Stats/Perm/Comb, Brackets, complex, M+) */}
        <div className="grid grid-cols-6 gap-1 shrink-0">
          <button
            onClick={() => addToken("tan(")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            tan
          </button>
          <button
            onClick={() => addToken("combinations(")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            nCr
          </button>
          <button
            onClick={() => addToken("permutations(")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            nPr
          </button>
          <button
            onClick={() => addToken("(")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            (
          </button>
          <button
            onClick={() => addToken(")")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            )
          </button>
          <button
            onClick={() => addToken("i")}
            className="py-1 text-[8px] bg-slate-850 hover:bg-slate-800 rounded text-slate-300 font-semibold active:scale-95 transition-transform"
          >
            i
          </button>
        </div>

        {/* Numerical Pad Grid (7, 8, 9, DEL, AC, M+) */}
        <div className="grid grid-cols-5 gap-1 mt-1 flex-1">
          {["7", "8", "9"].map((n) => (
            <button
              key={n}
              onClick={() => addToken(n)}
              className="py-1.5 bg-slate-700 hover:bg-slate-650 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-100 shadow"
            >
              {n}
            </button>
          ))}
          <button
            onClick={handleDel}
            className="py-1.5 bg-emerald-700 hover:bg-emerald-650 active:scale-95 transition-all rounded-lg font-bold text-[9px] text-white shadow"
          >
            DEL
          </button>
          <button
            onClick={handleAC}
            className="py-1.5 bg-emerald-700 hover:bg-emerald-650 active:scale-95 transition-all rounded-lg font-bold text-[9px] text-white shadow"
          >
            AC
          </button>

          {["4", "5", "6"].map((n) => (
            <button
              key={n}
              onClick={() => addToken(n)}
              className="py-1.5 bg-slate-700 hover:bg-slate-650 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-100 shadow"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => addToken("*")}
            className="py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-200"
          >
            ×
          </button>
          <button
            onClick={() => addToken("/")}
            className="py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-200"
          >
            ÷
          </button>

          {["1", "2", "3"].map((n) => (
            <button
              key={n}
              onClick={() => addToken(n)}
              className="py-1.5 bg-slate-700 hover:bg-slate-650 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-100 shadow"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => addToken("+")}
            className="py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-200"
          >
            +
          </button>
          <button
            onClick={() => addToken("-")}
            className="py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-200"
          >
            −
          </button>

          <button
            onClick={() => addToken("0")}
            className="py-1.5 bg-slate-700 hover:bg-slate-650 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-100 shadow"
          >
            0
          </button>
          <button
            onClick={() => addToken(".")}
            className="py-1.5 bg-slate-700 hover:bg-slate-650 active:scale-95 transition-all rounded-lg font-bold text-xs text-slate-100 shadow"
          >
            .
          </button>
          <button
            onClick={() => addToken("*10^")}
            className="py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 transition-all rounded-lg font-bold text-[9px] text-slate-200"
          >
            ×10ˣ
          </button>
          <button
            onClick={() => addToken("Ans")}
            className="py-1.5 bg-slate-850 hover:bg-slate-800 active:scale-95 transition-all rounded-lg font-bold text-[9px] text-slate-300"
          >
            Ans
          </button>
          <button
            onClick={handleEvaluate}
            className="py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all rounded-lg font-bold text-xs text-white shadow shadow-indigo-600/35"
          >
            ＝
          </button>
        </div>
      </div>
    </div>
  );
}
