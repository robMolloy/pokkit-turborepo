import { formatDate } from "@/lib/dateUtils";
import { formatPositiveNegativeNumber } from "@/lib/numberUtils";
import { cn } from "@/lib/utils";
import { Button } from "@repo/pokkit-shadcn";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { TStripeLedgerRecord } from "../instanceRecords/dbStripeLedgerRecords";
import { stripeRetrieveInvoice } from "./stripeSdk";
import { formatCurrency } from "@/lib/currencyUtils";

export function StripeLedgerRecordRowTemplate(p: { stripeLedgerRecord: TStripeLedgerRecord }) {
  const invoiceId = p.stripeLedgerRecord.invoiceId;

  return (
    <div className="flex justify-between rounded-md border bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        <div className={cn("flex size-7 items-center justify-center rounded-full bg-primary/10")}>
          {p.stripeLedgerRecord.quantity >= 0 ? (
            <ArrowDownLeft className="size-3.5" />
          ) : (
            <ArrowUpRight className="size-3.5" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {formatPositiveNegativeNumber(p.stripeLedgerRecord.quantity)}{" "}
            {p.stripeLedgerRecord.productName}(s)
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(p.stripeLedgerRecord.created)}
          </p>
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <span
          className={cn(
            "font-mono text-sm font-medium",
            p.stripeLedgerRecord.quantity >= 0 ? "text-primary" : "text-destructive",
          )}
        >
          {formatCurrency(p.stripeLedgerRecord)}
        </span>
        {invoiceId && (
          <Button
            onClick={async () => {
              const resp = await stripeRetrieveInvoice({ invoiceId });
              if (resp.success)
                window.open(resp.data.hosted_invoice_url, "_blank", "noopener,noreferrer");
            }}
          >
            Invoice
          </Button>
        )}
      </div>
    </div>
  );
}
