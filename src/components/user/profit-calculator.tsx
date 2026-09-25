"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, Sparkles, Loader2, Coins, TrendingUp, Target, Cpu, Zap, Clock, DollarSign } from "lucide-react";

export function ProfitCalculator() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [unitCost, setUnitCost] = useState("8.00");
  const [shippingCost, setShippingCost] = useState("3.50");
  const [marketplaceFee, setMarketplaceFee] = useState("6.5");
  const [paymentFee, setPaymentFee] = useState("3");
  const [suggestedPrice, setSuggestedPrice] = useState("24.99");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    content: string;
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    latencyMs?: number;
  } | null>(null);

  // Local calc
  const uc = parseFloat(unitCost) || 0;
  const sc = parseFloat(shippingCost) || 0;
  const mf = parseFloat(marketplaceFee) || 0;
  const pf = parseFloat(paymentFee) || 0;
  const sp = parseFloat(suggestedPrice) || 0;
  const totalCost = uc + sc;
  const feeAmount = (sp * (mf + pf)) / 100;
  const profitPerUnit = sp - totalCost - feeAmount;
  const grossMarginPct = sp > 0 ? (profitPerUnit / sp) * 100 : 0;
  const breakEvenUnits = profitPerUnit > 0 ? Math.ceil(totalCost / profitPerUnit) : Infinity;

  const calculate = async () => {
    if (sp <= 0 || totalCost <= 0) {
      toast({
        title: "Missing values",
        description: "Fill in unit cost, shipping, and suggested price.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const inputs = JSON.stringify({
        unit_cost: uc,
        shipping_cost: sc,
        marketplace_fee_pct: mf,
        payment_fee_pct: pf,
        suggested_price: sp,
        gross_margin_pct: grossMarginPct.toFixed(2),
        break_even_units: breakEvenUnits,
        profit_per_unit: profitPerUnit.toFixed(2),
      });
      const data = await apiFetch<{
        content: string;
        model: string;
        tokensIn: number;
        tokensOut: number;
        latencyMs: number;
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          agentKey: "profit",
          message: "Analyze this profit model and recommend improvements.",
          variables: { inputs },
        }),
      });
      setResult(data);
    } catch (err: any) {
      toast({
        title: "AI insight failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <Calculator className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profit Calculator</h2>
          <p className="text-sm text-muted-foreground">
            Model your margins, break-even, and get AI insight.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Costs & Pricing</CardTitle>
            <CardDescription>All amounts in USD.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Unit cost"
                value={unitCost}
                onChange={setUnitCost}
                disabled={loading}
                placeholder="8.00"
              />
              <NumberField
                label="Shipping cost"
                value={shippingCost}
                onChange={setShippingCost}
                disabled={loading}
                placeholder="3.50"
              />
              <NumberField
                label="Marketplace fee %"
                value={marketplaceFee}
                onChange={setMarketplaceFee}
                disabled={loading}
                placeholder="6.5"
              />
              <NumberField
                label="Payment fee %"
                value={paymentFee}
                onChange={setPaymentFee}
                disabled={loading}
                placeholder="3"
              />
            </div>
            <NumberField
              label="Suggested selling price"
              value={suggestedPrice}
              onChange={setSuggestedPrice}
              disabled={loading}
              placeholder="24.99"
            />

            <Button
              onClick={calculate}
              disabled={loading || sp <= 0}
              className="w-full brand-gradient text-white"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Calculate & Get AI Insight
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Local results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Computed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="Total cost"
                  value={`$${totalCost.toFixed(2)}`}
                  icon={<Coins className="size-3.5" />}
                />
                <Metric
                  label="Profit / unit"
                  value={`$${profitPerUnit.toFixed(2)}`}
                  icon={<DollarSign className="size-3.5" />}
                  positive={profitPerUnit > 0}
                  negative={profitPerUnit < 0}
                />
                <Metric
                  label="Gross margin"
                  value={`${grossMarginPct.toFixed(1)}%`}
                  icon={<TrendingUp className="size-3.5" />}
                  positive={grossMarginPct > 30}
                  negative={grossMarginPct < 10}
                />
                <Metric
                  label="Break-even units"
                  value={
                    breakEvenUnits === Infinity ? "—" : `${breakEvenUnits}`
                  }
                  icon={<Target className="size-3.5" />}
                />
              </div>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">
                Marketplace fees: <strong>${feeAmount.toFixed(2)}</strong> ·
                Net per sale: <strong>${profitPerUnit.toFixed(2)}</strong>
              </p>
            </CardContent>
          </Card>

          {loading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Getting AI insight...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">AI Insight</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {result.model && (
                      <span className="flex items-center gap-1">
                        <Cpu className="size-3" />
                        {result.model}
                      </span>
                    )}
                    {(result.tokensIn || result.tokensOut) && (
                      <span className="flex items-center gap-1">
                        <Zap className="size-3" />
                        {(result.tokensIn ?? 0) + (result.tokensOut ?? 0)} tok
                      </span>
                    )}
                    {result.latencyMs !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {result.latencyMs} ms
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-headings:mt-3 prose-headings:mb-2">
                  <ReactMarkdown>{result.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  positive,
  negative,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={
          "mt-1 text-lg font-bold " +
          (positive
            ? "text-emerald-500"
            : negative
            ? "text-destructive"
            : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
