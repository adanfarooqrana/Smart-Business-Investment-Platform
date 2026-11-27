import { useState } from "react";
import { Landmark } from "lucide-react";
import { marketplaceRequest } from "@/lib/marketplaceClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const fields = [
  ["bankOrWallet", "Bank or wallet", 2, 80],
  ["accountTitle", "Account title", 2, 100],
  ["ibanOrNumber", "IBAN or account number", 7, 34],
] as const;
type Account = Record<(typeof fields)[number][0], string>;
const empty: Account = { bankOrWallet: "", accountTitle: "", ibanOrNumber: "" };

export function PayoutAccountDialog() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const changeOpen = async (next: boolean) => {
    setOpen(next);
    setNotice("");
    if (!next) { setAccount(empty); return; }
    setError("");
    setLoading(true);
    try { setAccount((await marketplaceRequest<Account | null>("payout-account")) ?? empty); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load payout details."); }
    finally { setLoading(false); }
  };

  return <Dialog open={open} onOpenChange={(value) => { if (!saving && !loading) void changeOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline"><Landmark size={16} /> Payout account</Button></DialogTrigger>
    <DialogContent>
      <DialogTitle>Payout account</DialogTitle>
      <DialogDescription>Save your private bank or wallet details for payouts.</DialogDescription>
      <form className="grid gap-3" onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true); setError(""); setNotice("");
        try { setAccount(await marketplaceRequest<Account>("payout-account", "PUT", account)); setNotice("Payout account saved."); }
        catch (error) { setError(error instanceof Error ? error.message : "Could not save payout details."); }
        finally { setSaving(false); }
      }}>
        {fields.map(([key, label, min, max]) => <label key={key} className="grid gap-1.5 text-sm font-medium">
          {label}<Input value={account[key]} minLength={min} maxLength={max} required disabled={loading || saving}
            onChange={(event) => setAccount({ ...account, [key]: event.target.value })} />
        </label>)}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
        <Button type="submit" disabled={loading || saving}>{saving ? "Saving..." : loading ? "Loading..." : "Save payout account"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
